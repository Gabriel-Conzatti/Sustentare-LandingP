// ==========================================
// CARROSSEL INFINITO HORIZONTAL - AUTOMÁTICO
// ==========================================
console.log("Carrossel automático carregado - rolagem infinita ativa!");

// FUNCIONALIDADE DE ARRASTAR CARROSSÉIS
function setupDraggableCarousel(carouselSelector) {
    const carousel = document.querySelector(carouselSelector);
    const track = carousel.querySelector('.carousel-track, .seguradoras-track');
    
    let isDragging = false;
    let startPos = 0;
    let currentTranslate = 0;
    let prevTranslate = 0;
    let startTime = 0;

    // Desabilitar animação CSS e controlar manualmente
    track.style.animation = 'none';
    
    // Velocidade de auto-scroll
    let autoScrollSpeed = -0.5; // pixels por frame
    let lastTime = Date.now();
    
    function animate() {
        if (!isDragging) {
            const now = Date.now();
            const delta = now - lastTime;
            lastTime = now;
            
            currentTranslate += autoScrollSpeed * (delta / 16);
            
            // Loop infinito
            const trackWidth = track.scrollWidth / 2;
            if (Math.abs(currentTranslate) > trackWidth) {
                currentTranslate = 0;
                prevTranslate = 0;
            }
            
            track.style.transform = `translate3d(${currentTranslate}px, 0, 0)`;
        }
        requestAnimationFrame(animate);
    }
    
    animate();

    // Mouse events
    track.addEventListener('mousedown', (e) => {
        isDragging = true;
        startPos = e.clientX;
        prevTranslate = currentTranslate;
        track.style.cursor = 'grabbing';
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const currentPosition = e.clientX;
        const diff = currentPosition - startPos;
        currentTranslate = prevTranslate + diff;
        track.style.transform = `translate3d(${currentTranslate}px, 0, 0)`;
    });

    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            track.style.cursor = 'grab';
        }
    });

    // Touch events
    track.addEventListener('touchstart', (e) => {
        isDragging = true;
        startPos = e.touches[0].clientX;
        prevTranslate = currentTranslate;
        e.preventDefault();
    });

    track.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        const currentPosition = e.touches[0].clientX;
        const diff = currentPosition - startPos;
        currentTranslate = prevTranslate + diff;
        track.style.transform = `translate3d(${currentTranslate}px, 0, 0)`;
        e.preventDefault();
    });

    track.addEventListener('touchend', () => {
        isDragging = false;
    });

    // Cursor style
    track.style.cursor = 'grab';
    track.style.userSelect = 'none';
}

// Aplicar aos dois carrosséis
setupDraggableCarousel('.carousel-esferas');
setupDraggableCarousel('.seguradoras');

// ==========================================
// VALIDAÇÃO DO FORMULÁRIO
// ==========================================
const form = document.getElementById('form-orcamento');
const nome = document.getElementById('nome');
const email = document.getElementById('email');
const telefone = document.getElementById('telefone');

let CSRF = null;

async function loadCsrf() {
    try {
        const r = await fetch('/api/csrf');
        const j = await r.json();
        CSRF = j.csrf;
    } catch (err) {
        console.error('Erro ao carregar CSRF', err);
    }
}

loadCsrf();

// Máscara para Telefone
telefone.addEventListener('input', (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length <= 11) {
        value = value.replace(/^(\d{2})(\d)/g, '($1) $2');
        value = value.replace(/(\d)(\d{4})$/, '$1-$2');
        e.target.value = value;
    }
});

// Função de validação de email
function validarEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

function validarTelefone(telefone) {
    const cleaned = telefone.replace(/\D/g, '');
    return cleaned.length >= 10 && cleaned.length <= 11;
}

function mostrarErro(input, mensagem) {
    const errorSpan = document.getElementById(`error-${input.id}`);
    errorSpan.textContent = mensagem;
    input.classList.add('error');
    input.classList.remove('success');
}

function mostrarSucesso(input) {
    const errorSpan = document.getElementById(`error-${input.id}`);
    errorSpan.textContent = '';
    input.classList.remove('error');
    input.classList.add('success');
}

function limparErro(input) {
    const errorSpan = document.getElementById(`error-${input.id}`);
    errorSpan.textContent = '';
    input.classList.remove('error');
    input.classList.remove('success');
}

// Validação em tempo real
nome.addEventListener('blur', () => {
    if (nome.value.trim() === '') {
        mostrarErro(nome, 'Por favor, digite seu nome');
    } else if (nome.value.trim().length < 3) {
        mostrarErro(nome, 'Nome deve ter no mínimo 3 caracteres');
    } else {
        mostrarSucesso(nome);
    }
});

email.addEventListener('blur', () => {
    if (email.value.trim() === '') {
        mostrarErro(email, 'Por favor, digite seu email');
    } else if (!validarEmail(email.value)) {
        mostrarErro(email, 'Email inválido');
    } else {
        mostrarSucesso(email);
    }
});

telefone.addEventListener('blur', () => {
    if (telefone.value.trim() === '') {
        mostrarErro(telefone, 'Por favor, digite seu telefone');
    } else if (!validarTelefone(telefone.value)) {
        mostrarErro(telefone, 'Telefone inválido');
    } else {
        mostrarSucesso(telefone);
    }
});

// Limpar erros ao digitar
[nome, email, telefone].forEach(input => {
    input.addEventListener('focus', () => {
        if (!input.classList.contains('success')) {
            limparErro(input);
        }
    });
});

// Validação no submit
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    let isValid = true;
    
    // Validar nome
    if (nome.value.trim() === '') {
        mostrarErro(nome, 'Por favor, digite seu nome');
        isValid = false;
    } else if (nome.value.trim().length < 3) {
        mostrarErro(nome, 'Nome deve ter no mínimo 3 caracteres');
        isValid = false;
    }
    
    // Validar email
    if (email.value.trim() === '') {
        mostrarErro(email, 'Por favor, digite seu email');
        isValid = false;
    } else if (!validarEmail(email.value)) {
        mostrarErro(email, 'Email inválido');
        isValid = false;
    }
    
    // Validar telefone
    if (telefone.value.trim() === '') {
        mostrarErro(telefone, 'Por favor, digite seu telefone');
        isValid = false;
    } else if (!validarTelefone(telefone.value)) {
        mostrarErro(telefone, 'Telefone inválido');
        isValid = false;
    }
    
    if (isValid) {
        // Enviar dados para o servidor
        const formData = {
            nome: nome.value.trim(),
            email: email.value.trim(),
            telefone: telefone.value
        };
        
        try {
            if (!CSRF) {
                await loadCsrf();
            }

            const res = await fetch("/api/leads", {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "X-CSRF-Token": CSRF || ''
                },
                body: JSON.stringify(formData)
            });
            
            if (res.ok) {
                // Mostrar mensagem de sucesso
                const successMsg = document.createElement('div');
                successMsg.className = 'success-message';
                successMsg.textContent = '✓ Orçamento enviado com sucesso! Entraremos em contato em breve.';
                form.parentElement.insertBefore(successMsg, form);
                
                // Limpar formulário
                form.reset();
                [nome, email, telefone].forEach(input => {
                    input.classList.remove('success', 'error');
                    limparErro(input);
                });
                
                // Remover mensagem após 5 segundos
                setTimeout(() => {
                    successMsg.remove();
                }, 5000);
                
                // Scroll suave para a mensagem de sucesso
                successMsg.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else if (res.status === 403) {
                alert('Sessão expirada. Atualize a página ou tente novamente.');
                await loadCsrf();
            } else {
                alert("Erro ao salvar os dados");
            }
        } catch (error) {
            console.error("Erro na requisição:", error);
            alert("Erro ao conectar ao servidor");
        }
    } else {
        // Scroll para o primeiro erro
        const firstError = form.querySelector('.error');
        if (firstError) {
            firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
            firstError.focus();
        }
    }
});

console.log("Sistema carregado: Carrossel e Validação de Formulário ativos!");
