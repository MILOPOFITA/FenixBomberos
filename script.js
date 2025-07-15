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

// Inicializar Firebase
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// =================================================================
// 2. REFERENCIAS AL DOM Y ESTADO GLOBAL
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
    if (logoutBtn) {
        logoutBtn.onclick = () => auth.signOut();
    }

    switch (pageName) {
        case 'home':
            db.collection('oppositions').get().then(querySnapshot => {
                const appContent = document.getElementById('app-content');
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
            });
            break;

        case 'menu':
            document.getElementById('back-btn').onclick = () => loadContent('home');
            document.getElementById('opposition-title').textContent = sessionStorage.getItem('currentOppositionName');
            document.querySelectorAll('.menu-btn').forEach(button => {
                button.onclick = (e) => {
                    const option = e.currentTarget.dataset.option;
                    if (option === 'test') {
                        loadContent('test_options');
                    } else {
                        alert(`Funcionalidad "${option}" no implementada.`);
                    }
                };
            });
            break;

        case 'test_options':
            document.getElementById('back-btn').onclick = () => loadContent('menu');
            document.getElementById('test-options-form').addEventListener('submit', handleTestFormSubmit);
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
// 4. LÓGICA DE AUTENTICACIÓN Y APROBACIÓN (DEL SCRIPT ANTIGUO MEJORADO)
// =================================================================

auth.onAuthStateChanged(user => {
    if (user) {
        // Usuario logueado, comprobamos si está aprobado en la base de datos
        db.collection('users').doc(user.uid).get().then(doc => {
            if (doc.exists && doc.data().isApproved) {
                // Si está aprobado, cargamos la página de inicio
                loadContent('home');
            } else {
                // No está aprobado o no existe en la DB, lo deslogueamos
                alert("Tu cuenta está pendiente de aprobación o ha sido denegada.");
                auth.signOut();
            }
        });
    } else {
        // No hay nadie logueado, cargamos la página de autenticación
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
                // Crea el documento del usuario en Firestore con estado "no aprobado"
                return db.collection('users').doc(cred.user.uid).set({
                    email: cred.user.email,
                    isApproved: false,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            })
            .then(() => {
                alert('¡Registro exitoso! Tu cuenta está pendiente de aprobación por un administrador.');
                auth.signOut(); // Deslogueamos al usuario hasta que sea aprobado
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
