// --- CONFIGURACIÓN DE FIREBASE (igual que en el otro script) ---
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_AUTH_DOMAIN",
  projectId: "TU_PROJECT_ID",
  storageBucket: "TU_STORAGE_BUCKET",
  messagingSenderId: "TU_SENDER_ID",
  appId: "TU_APP_ID"
};

// --- INICIALIZACIÓN DE SERVICIOS ---
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// --- ELEMENTOS DEL DOM ---
const userEmailDisplay = document.getElementById('user-email');
const logoutBtn = document.getElementById('logout-btn');

// --- LÓGICA DE LA PÁGINA ---
auth.onAuthStateChanged(user => {
    if (user) {
        // Si hay un usuario con sesión iniciada
        console.log("Usuario en home:", user.email);
        userEmailDisplay.textContent = user.email;
    } else {
        // Si no hay sesión, lo redirigimos a la página de login
        console.log("Nadie ha iniciado sesión, redirigiendo...");
        window.location.href = 'index.html';
    }
});

// Evento para cerrar sesión
logoutBtn.addEventListener('click', () => {
    auth.signOut()
        .then(() => {
            console.log("Sesión cerrada.");
            // onAuthStateChanged se encargará de la redirección
        })
        .catch(error => {
            console.error("Error al cerrar sesión:", error);
        });
});
