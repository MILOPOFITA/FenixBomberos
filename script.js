// =================================================================
// 1. CONFIGURACIÓN E INICIALIZACIÓN DE FIREBASE
// =================================================================
const firebaseConfig = {
    apiKey: "AIzaSyD9upjL3TbsQoE--wAiTtdW7ztssZGgE9w",
    authDomain: "halligantest.firebaseapp.com",
    projectId: "halligantest",
    storageBucket: "halligantest.firebasestorage.app",
    messagingSenderId: "852038922281",
    appId: "1:852038922281:web:06e297c951e74d9cad2c38"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();

// =================================================================
// 2. REFERENCIAS AL DOM
// =================================================================
const mainContainer = document.getElementById('main-container');

// =================================================================
// 3. NAVEGACIÓN Y CARGA DE CONTENIDO
// =================================================================

async function loadContent(pageName) {
    try {
        const response = await fetch(`${pageName}.html`);
        if (!response.ok) throw new Error(`No se pudo cargar ${pageName}.html`);

        mainContainer.innerHTML = await response.text();
        setupEventListeners(pageName);
        updateHeader();
    } catch (error) {
        console.error("Error al cargar el contenido:", error);
        mainContainer.innerHTML = `<h1>Error al cargar la página.</h1>`;
    }
}

function setupEventListeners(pageName) {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.onclick = () => auth.signOut();

    switch (pageName) {
        case 'home':
            db.collection('oppositions').get().then(querySnapshot => {
                const appContent = document.getElementById('app-content');
                if (!appContent) return;
                appContent.innerHTML = '<h1>Elige tu oposición</h1>';
                querySnapshot.forEach(doc => {
                    const button = document.createElement('button');
                    button.className = 'opposition-btn';
                    button.textContent = doc.data().name;
                    button.onclick = () => {
                        sessionStorage.setItem('currentOpposition', doc.id);
                        sessionStorage.setItem('currentOppositionName', doc.data().name);
                        loadContent('menu');
                    };
                    appContent.appendChild(button);
                });
            }).catch(err => {
                console.error("Error al cargar oposiciones:", err);
                const appContent = document.getElementById('app-content');
                if(appContent) appContent.innerHTML = '<h1>Error al cargar las oposiciones.</h1><p>Revisa las reglas de seguridad de Firestore.</p>';
            });
            break;

        case 'menu':
            const oppositionIdMenu = sessionStorage.getItem('currentOpposition');
            const oppositionNameMenu = sessionStorage.getItem('currentOppositionName');

            document.getElementById('back-btn').onclick = () => loadContent('home');
            document.getElementById('opposition-title').textContent = oppositionNameMenu;

            document.querySelectorAll('.menu-btn').forEach(button => {
                button.onclick = (e) => {
                    const option = e.currentTarget.dataset.option;
                    if (option === 'test') {
                        loadContent('test_options');
                    } else if (option === 'banco') {
                        loadContent('banco');
                    } else if (option === 'simulacro') {
                        loadContent('simulacro');
                    }
                    else {
                        alert(`Funcionalidad "${option}" no implementada.`);
                    }
                };
            });

            const mostrarProgreso = async () => {
                const user = auth.currentUser;
                if (!user) return;
                const progressBarFill = document.getElementById('progress-bar-fill');
                const progressText = document.getElementById('progress-text');
                if (!progressBarFill || !progressText) return;
                try {
                    const progressRef = db.collection('users').doc(user.uid).collection('progress').doc(oppositionIdMenu);
                    const progressDoc = await progressRef.get();
                    const acertadas = progressDoc.exists && progressDoc.data().preguntasAcertadasUnicas ? progressDoc.data().preguntasAcertadasUnicas.length : 0;
                    const response = await fetch(`preguntas_${oppositionIdMenu}.json`);
                    if (!response.ok) throw new Error("Archivo de preguntas no encontrado");
                    const totalPreguntas = (await response.json()).length;
                    const porcentaje = totalPreguntas > 0 ? (acertadas / totalPreguntas) * 100 : 0;
                    progressBarFill.style.width = `${porcentaje}%`;
                    progressText.textContent = `${Math.round(porcentaje)}% (${acertadas}/${totalPreguntas})`;
                } catch (error) {
                    console.error("Error al mostrar el progreso:", error);
                    progressText.textContent = "Error al cargar progreso";
                }
            };
            mostrarProgreso();
            break;

        case 'banco':
            const oppositionIdBanco = sessionStorage.getItem('currentOpposition');
            const oppositionNameBanco = sessionStorage.getItem('currentOppositionName');
            let todasLasPreguntasBanco = []; 
            const temaFilterEl = document.getElementById('tema-filter');
            const searchInputEl = document.getElementById('search-input');
            const bancoListEl = document.getElementById('banco-preguntas-list');
            document.getElementById('opposition-title').textContent = `Banco de Preguntas: ${oppositionNameBanco}`;
            document.getElementById('back-btn').onclick = () => loadContent('menu');
            const displayQuestionsBanco = (preguntas) => {
                bancoListEl.innerHTML = ''; 
                if (preguntas.length === 0) {
                    bancoListEl.innerHTML = '<p>No se han encontrado preguntas que coincidan con tu búsqueda.</p>';
                    return;
                }
                preguntas.forEach((pregunta, index) => {
                    const questionCard = document.createElement('div');
                    questionCard.className = 'question-card';
                    const indiceCorrecto = pregunta.correcta;
                    const textoRespuestaCorrecta = pregunta.opciones[indiceCorrecto];
                    questionCard.innerHTML = `
                        <p class="question-card-text"><strong>${index + 1}. ${pregunta.pregunta}</strong></p>
                        <p class="question-card-answer">✅ ${textoRespuestaCorrecta}</p>
                        <div class="question-card-details">
                            <p><strong>Tema:</strong> ${pregunta.tema}</p>
                            <p><strong>Explicación:</strong> ${pregunta.explicacion}</p>
                        </div>
                    `;
                    bancoListEl.appendChild(questionCard);
                });
            };
            const aplicarFiltros = () => {
                const temaSeleccionado = temaFilterEl.value;
                const textoBuscado = searchInputEl.value.toLowerCase().trim();
                let preguntasFiltradas = todasLasPreguntasBanco;
                if (temaSeleccionado !== 'todos') {
                    preguntasFiltradas = preguntasFiltradas.filter(p => p.tema === temaSeleccionado);
                }
                if (textoBuscado.length > 0) {
                    preguntasFiltradas = preguntasFiltradas.filter(p => 
                        p.pregunta.toLowerCase().includes(textoBuscado) ||
                        p.explicacion.toLowerCase().includes(textoBuscado)
                    );
                }
                displayQuestionsBanco(preguntasFiltradas);
            };
            const cargarBanco = async () => {
                const nombreArchivo = `preguntas_${oppositionIdBanco}.json`;
                try {
                    const response = await fetch(nombreArchivo);
                    if (!response.ok) throw new Error('No se encontró el archivo de preguntas.');
                    todasLasPreguntasBanco = await response.json();
                    const temas = [...new Set(todasLasPreguntasBanco.map(p => p.tema))];
                    temas.sort().forEach(tema => {
                        const option = document.createElement('option');
                        option.value = tema;
                        option.textContent = tema;
                        temaFilterEl.appendChild(option);
                    });
                    displayQuestionsBanco(todasLasPreguntasBanco);
                } catch (error) {
                    console.error(error);
                    bancoListEl.innerHTML = '<p>Error al cargar las preguntas.</p>';
                }
            };
            temaFilterEl.addEventListener('change', aplicarFiltros);
            searchInputEl.addEventListener('input', aplicarFiltros);
            cargarBanco();
            break;

        case 'test_options':
            document.getElementById('back-btn').onclick = () => loadContent('menu');
            document.getElementById('test-options-form').addEventListener('submit', handleTestFormSubmit);
            break;

        case 'simulacro':
            const oppositionIdSimulacro = sessionStorage.getItem('currentOpposition');
            const oppositionNameSimulacro = sessionStorage.getItem('currentOppositionName');
            let simulacroGenerado = [];

            document.getElementById('opposition-title').textContent = `Simulacro: ${oppositionNameSimulacro}`;
            document.getElementById('back-btn').onclick = () => loadContent('menu');

            const generateBtn = document.getElementById('generate-simulacro-btn');
            const questionsListEl = document.getElementById('simulacro-questions-list');

            const displaySimulacroQuestions = (preguntas) => {
                questionsListEl.innerHTML = '';
                preguntas.forEach((pregunta, index) => {
                    const questionCard = document.createElement('div');
                    questionCard.className = 'question-card';
                    const indiceCorrecto = pregunta.correcta;
                    const textoRespuestaCorrecta = pregunta.opciones[indiceCorrecto];
                    questionCard.innerHTML = `
                        <p class="question-card-text"><strong>${index + 1}. ${pregunta.pregunta}</strong></p>
                        <p class="question-card-answer">✅ ${textoRespuestaCorrecta}</p>
                        <div class="question-card-details">
                            <p><strong>Tema:</strong> ${pregunta.tema}</p>
                            <p><strong>Explicación:</strong> ${pregunta.explicacion}</p>
                        </div>
                    `;
                    questionsListEl.appendChild(questionCard);
                });
            };

            generateBtn.addEventListener('click', async () => {
                generateBtn.textContent = 'Generando...';
                generateBtn.disabled = true;
                questionsListEl.innerHTML = '<p>Seleccionando preguntas, por favor espera...</p>';
                try {
                    const nombreArchivo = `preguntas_${oppositionIdSimulacro}.json`;
                    const response = await fetch(nombreArchivo);
                    if (!response.ok) throw new Error('No se encontró el archivo de preguntas.');
                    const todasLasPreguntas = await response.json();

                    const legislacionPreguntas = todasLasPreguntas.filter(p => p.categoria === 'legislacion');
                    let otrosTemasPreguntas = todasLasPreguntas.filter(p => p.categoria !== 'legislacion');

                    legislacionPreguntas.sort(() => 0.5 - Math.random());
                    const simulacroLegislacion = legislacionPreguntas.slice(0, 20);

                    const simulacroOtrosTemas = [];
                    const temasUnicos = [...new Set(otrosTemasPreguntas.map(p => p.tema))];

                    temasUnicos.forEach(tema => {
                        const preguntasDelTema = otrosTemasPreguntas.filter(p => p.tema === tema);
                        if (preguntasDelTema.length > 0) {
                            const preguntaElegida = preguntasDelTema[Math.floor(Math.random() * preguntasDelTema.length)];
                            simulacroOtrosTemas.push(preguntaElegida);
                            otrosTemasPreguntas = otrosTemasPreguntas.filter(p => p.pregunta !== preguntaElegida.pregunta);
                        }
                    });

                    const preguntasRestantesNecesarias = 80 - simulacroOtrosTemas.length;
                    if (preguntasRestantesNecesarias > 0) {
                        otrosTemasPreguntas.sort(() => 0.5 - Math.random());
                        simulacroOtrosTemas.push(...otrosTemasPreguntas.slice(0, preguntasRestantesNecesarias));
                    }

                    simulacroGenerado = [...simulacroLegislacion, ...simulacroOtrosTemas];

                    if (simulacroGenerado.length < 100) {
                       throw new Error(`No hay suficientes preguntas para generar un simulacro de 100. Solo se encontraron ${simulacroGenerado.length}.`);
                    }

                    displaySimulacroQuestions(simulacroGenerado);
                    document.getElementById('download-pdf-btn').classList.remove('hidden');

                } catch (error) {
                    console.error(error);
                    questionsListEl.innerHTML = `<p style="color: red;">${error.message}</p>`;
                } finally {
                    generateBtn.textContent = 'Generar Otro Simulacro';
                    generateBtn.disabled = false;
                }
            });
            break;
    }
}

function handleTestFormSubmit(e) {
    e.preventDefault();
    const mode = e.target['test-mode'].value;
    const numQuestions = e.target['num-questions'].value;
    const time = e.target['test-time'].value;
    const opposition = sessionStorage.getItem('currentOpposition');
    if (!opposition) {
        alert("Error: No se ha seleccionado una oposición.");
        return;
    }
    localStorage.setItem('testConfig', JSON.stringify({ mode, numQuestions, time, opposition }));
    window.location.href = 'test.html';
}

// =================================================================
// 4. LÓGICA DE AUTENTICACIÓN Y APROBACIÓN
// =================================================================

auth.onAuthStateChanged(user => {
    if (user) {
        db.collection('users').doc(user.uid).get().then(doc => {
            if (doc.exists && doc.data().isApproved) {
                loadContent('home');
            } else {
                alert("Tu cuenta está pendiente de aprobación o ha sido denegada.");
                auth.signOut();
            }
        });
    } else {
        sessionStorage.clear();
        localStorage.clear();
        loadAuthPage();
    }
});

function loadAuthPage() {
    mainContainer.innerHTML = `
        <div class="auth-container">
            <div id="register-form">
                <h1>Crear una cuenta</h1>
                <p>Tu cuenta quedará pendiente de aprobación.</p>
                <input type="email" id="register-email" placeholder="Correo Electrónico" required>
                <input type="password" id="register-password" placeholder="Contraseña" required>
                <button id="register-btn">Registrarse</button>
                <p id="register-error" class="error-message"></p>
                <a href="#" id="show-login">¿Ya tienes cuenta? Inicia Sesión</a>
            </div>
            <div id="login-form" class="hidden">
                <h1>Iniciar Sesión</h1>
                <input type="email" id="login-email" placeholder="Correo Electrónico" required>
                <input type="password" id="login-password" placeholder="Contraseña" required>
                <button id="login-btn">Acceder</button>
                <p id="login-error" class="error-message"></p>
                <a href="#" id="show-register">¿No tienes cuenta? Regístrate</a>
            </div>
        </div>
    `;
    addAuthEventListeners();
}

function addAuthEventListeners() {
    const registerForm = document.getElementById('register-form');
    const loginForm = document.getElementById('login-form');
    const showLoginLink = document.getElementById('show-login');
    const showRegisterLink = document.getElementById('show-register');
    showLoginLink.addEventListener('click', e => {
        e.preventDefault();
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
    });
    showRegisterLink.addEventListener('click', e => {
        e.preventDefault();
        registerForm.classList.remove('hidden');
        loginForm.classList.add('hidden');
    });
    document.getElementById('register-btn').addEventListener('click', () => {
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const registerError = document.getElementById('register-error');
        registerError.textContent = '';
        if (!email || !password) {
            registerError.textContent = "Por favor, completa ambos campos.";
            return;
        }
        auth.createUserWithEmailAndPassword(email, password)
            .then(cred => {
                return db.collection('users').doc(cred.user.uid).set({
                    email: cred.user.email,
                    isApproved: false,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            })
            .then(() => {
                alert('¡Registro exitoso! Tu cuenta está pendiente de aprobación por un administrador.');
                auth.signOut();
            })
            .catch(err => {
                registerError.textContent = err.message;
            });
    });
    document.getElementById('login-btn').addEventListener('click', () => {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const loginError = document.getElementById('login-error');
        loginError.textContent = '';
        if (!email || !password) {
            loginError.textContent = "Por favor, completa ambos campos.";
            return;
        }
        auth.signInWithEmailAndPassword(email, password)
            .catch(err => {
                loginError.textContent = "Credenciales incorrectas. Revisa tu email y contraseña.";
                console.error(err);
            });
    });
}

function updateHeader() {
    const userEmailEl = document.getElementById('user-email');
    if (userEmailEl && auth.currentUser) {
        userEmailEl.textContent = auth.currentUser.email;
    }
}
