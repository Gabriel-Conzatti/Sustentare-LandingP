import os
import re
import secrets
import traceback

from flask import Flask, render_template, request, jsonify, session
from sqlalchemy import create_engine, text
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_talisman import Talisman

app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "troque-isto-em-producao")

# =========================================================
# BANCO (Render Postgres)
# =========================================================
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("Defina a variável de ambiente DATABASE_URL")

# Render costuma fornecer postgresql://...
# No Python 3.13 é mais seguro usar psycopg v3:
# => postgresql+psycopg://
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)

# Força SSL (Render geralmente exige)
if "sslmode=" not in DATABASE_URL:
    DATABASE_URL += ("&" if "?" in DATABASE_URL else "?") + "sslmode=require"

engine = create_engine(DATABASE_URL, pool_pre_ping=True)

def init_db():
    with engine.begin() as con:
        con.execute(text("""
            CREATE TABLE IF NOT EXISTS leads (
                id SERIAL PRIMARY KEY,
                nome TEXT NOT NULL,
                email TEXT NOT NULL,
                telefone TEXT NOT NULL
            )
        """))

# ✅ roda ao iniciar (inclusive no Render)
# (se quiser evitar derrubar deploy caso o DB demore, posso te passar a versão com try/except)
init_db()

# =========================================================
# SEGURANÇA BÁSICA
# =========================================================
Talisman(app, content_security_policy=None)

limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["200 per day", "50 per hour"]
)

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
TEL_RE = re.compile(r"^[0-9()+\-\s]{8,20}$")

def clean(s: str) -> str:
    return (s or "").strip()

# =========================================================
# ROTAS
# =========================================================
@app.get("/")
def home():
    return render_template("index.html")

@app.get("/api/csrf")
def csrf():
    token = session.get("csrf")
    if not token:
        token = secrets.token_urlsafe(32)
        session["csrf"] = token
    return jsonify({"csrf": token})

@app.post("/api/leads")
@limiter.limit("10 per minute")  # pode ajustar
def salvar_lead():
    try:
        data = request.get_json(silent=True) or {}

        csrf_header = request.headers.get("X-CSRF-Token")
        if not csrf_header or csrf_header != session.get("csrf"):
            return jsonify({"erro": "CSRF inválido"}), 403

        nome = clean(data.get("nome"))
        email = clean(data.get("email")).lower()
        telefone = clean(data.get("telefone"))

        if len(nome) < 2 or len(nome) > 80:
            return jsonify({"erro": "Nome inválido"}), 400
        if not EMAIL_RE.match(email):
            return jsonify({"erro": "Email inválido"}), 400
        if not TEL_RE.match(telefone):
            return jsonify({"erro": "Telefone inválido"}), 400

        with engine.begin() as con:
            con.execute(
                text("INSERT INTO leads (nome, email, telefone) VALUES (:n, :e, :t)"),
                {"n": nome, "e": email, "t": telefone}
            )

        return jsonify({"ok": True})

    except Exception as e:
        print("ERRO AO SALVAR LEAD:", repr(e))
        traceback.print_exc()
        return jsonify({"erro": "Erro interno"}), 500

@app.get("/api/leads")
def listar_leads():
    with engine.connect() as con:
        rows = con.execute(text("""
            SELECT id, nome, email, telefone
            FROM leads
            ORDER BY id DESC
            LIMIT 500
        """)).mappings().all()
    return jsonify(list(rows))

if __name__ == "__main__":
    app.run()
