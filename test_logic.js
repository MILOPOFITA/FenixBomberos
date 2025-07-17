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

const db = firebase.firestore();
const auth = firebase.auth();

// =================================================================
// 2. LÓGICA DEL TEST
// =================================================================
document.addEventListener('DOMContentLoaded', () => {

    // --- Referencias a elementos del HTML ---
    const timerEl = document.getElementById('timer');
    const oposicionTituloEl = document.getElementById('oposicion-titulo');
    const preguntaNumeroEl = document.getElementById('pregunta-numero');
    const preguntaTextoEl = document.getElementById('pregunta-texto');
    const opcionesContainerEl = document.getElementById('opciones-container');
    const feedbackContainerEl = document.getElementById('feedback-container');
    const feedbackTemaEl = document.getElementById('feedback-tema');
    const feedbackExplicacionEl = document.getElementById('feedback-explicacion');
    const siguientePreguntaBtn = document.getElementById('siguiente-pregunta-btn');
    const endTestBtn = document.getElementById('end-test-btn');

    // --- Estado del test y configuración ---
    let config = {};
    let testQuestions = [];
    let userAnswers = [];
    let currentQuestionIndex = 0;
    let timerInterval;

    // --- Iniciar el test ---
    async function iniciarTest() {
        const user = await new Promise(resolve => {
            const unsubscribe = auth.onAuthStateChanged(user => {
                unsubscribe();
                resolve(user);
            });
        });

        if (!user) {
            document.body.innerHTML = '<h1>Error: Usuario no autenticado. Por favor, inicia sesión.</h1>';
            return;
        }

        const savedConfig = localStorage.getItem('testConfig');
        if (!savedConfig) {
            document.body.innerHTML = '<h1>Error: No se encontró configuración. Vuelve al menú.</h1>';
            return;
        }
        config = JSON.parse(savedConfig);

        await cargarPreguntasDesdeJSON(user);

        if (testQuestions.length === 0) {
            document.body.innerHTML = `<h1>No se encontraron preguntas para "${config.opposition}".</h1>`;
            return;
        }

        userAnswers = new Array(testQuestions.length).fill(null);
        mostrarPregunta();
        startTimer(config.time);
    }

    // --- Función para cargar preguntas (Usa el texto de la pregunta como ID) ---
    async function cargarPreguntasDesdeJSON(user) {
        oposicionTituloEl.textContent = `Test de ${config.opposition.charAt(0).toUpperCase() + config.opposition.slice(1)}`;
        const nombreArchivo = `preguntas_${config.opposition}.json`;
        try {
            const response = await fetch(nombreArchivo);
            if (!response.ok) throw new Error(`No se pudo encontrar el archivo ${nombreArchivo}.`);
            let todasLasPreguntas = await response.json();

            const progressRef = db.collection('users').doc(user.uid).collection('progress').doc(config.opposition);
            const progressDoc = await progressRef.get();
            const acertadas = (progressDoc.exists && progressDoc.data().preguntasAcertadasUnicas) ? progressDoc.data().preguntasAcertadasUnicas : [];

            // Usamos pregunta.pregunta como el identificador único
            let preguntasNuevas = todasLasPreguntas.filter(p => !acertadas.includes(p.pregunta));

            if (preguntasNuevas.length < config.numQuestions) {
                preguntasNuevas = todasLasPreguntas;
                await progressRef.set({ preguntasAcertadasUnicas: [] });
            }

            preguntasNuevas.sort(() => 0.5 - Math.random());
            let preguntasSeleccionadas = preguntasNuevas.slice(0, config.numQuestions);

            preguntasSeleccionadas.forEach(pregunta => {
                const letras = ['a', 'b', 'c', 'd'];
                const textoCorrectoOriginal = pregunta.opciones[pregunta.correcta];
                const textoCorrectoLimpio = textoCorrectoOriginal.substring(3);
                let opcionesLimpias = pregunta.opciones.map(op => op.substring(3));
                opcionesLimpias.sort(() => Math.random() - 0.5);
                pregunta.correcta = opcionesLimpias.indexOf(textoCorrectoLimpio);
                pregunta.opciones = opcionesLimpias.map((op, index) => `${letras[index]}) ${op}`);
            });
            testQuestions = preguntasSeleccionadas;
        } catch (error) {
            console.error("Error al cargar las preguntas:", error);
            testQuestions = [];
        }
    }

    // --- Lógica para mostrar preguntas y opciones ---
    function mostrarPregunta() {
        feedbackContainerEl.classList.add('oculto');
        siguientePreguntaBtn.classList.add('oculto');
        opcionesContainerEl.innerHTML = '';
        const pregunta = testQuestions[currentQuestionIndex];
        preguntaNumeroEl.textContent = `Pregunta ${currentQuestionIndex + 1} de ${testQuestions.length}`;
        preguntaTextoEl.textContent = pregunta.pregunta;
        pregunta.opciones.forEach((textoOpcion, index) => {
            const boton = document.createElement('button');
            boton.className = 'opcion-btn';
            boton.textContent = textoOpcion;
            boton.dataset.index = index;
            boton.addEventListener('click', revisarRespuesta);
            opcionesContainerEl.appendChild(boton);
        });
    }

    // --- Lógica para revisar la respuesta ---
    function revisarRespuesta(evento) {
        const botonSeleccionado = evento.currentTarget;
        const indiceSeleccionado = parseInt(botonSeleccionado.dataset.index, 10);
        userAnswers[currentQuestionIndex] = indiceSeleccionado;
        opcionesContainerEl.querySelectorAll('.opcion-btn').forEach(btn => btn.disabled = true);
        if (config.mode === 'estudio') {
            const preguntaActual = testQuestions[currentQuestionIndex];
            const indiceCorrecto = preguntaActual.correcta;
            if (indiceSeleccionado === indiceCorrecto) botonSeleccionado.classList.add('correcta');
            else {
                botonSeleccionado.classList.add('incorrecta');
                const botonCorrecto = opcionesContainerEl.querySelector(`[data-index="${indiceCorrecto}"]`);
                if (botonCorrecto) botonCorrecto.classList.add('correcta');
            }
            feedbackTemaEl.textContent = `Tema: ${preguntaActual.tema}`;
            feedbackExplicacionEl.textContent = preguntaActual.explicacion;
            feedbackContainerEl.classList.remove('oculto');
        }
        siguientePreguntaBtn.classList.remove('oculto');
    }

    // --- Lógica para pasar a la siguiente pregunta ---
    function siguientePregunta() {
        currentQuestionIndex++;
        if (currentQuestionIndex < testQuestions.length) mostrarPregunta();
        else endTest();
    }

    // --- Lógica del temporizador ---
    function startTimer(minutes) {
        let totalSeconds = minutes * 60;
        timerInterval = setInterval(() => {
            const min = Math.floor(totalSeconds / 60);
            const sec = totalSeconds % 60;
            timerEl.textContent = `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
            if (totalSeconds <= 0) endTest();
            totalSeconds--;
        }, 1000);
    }

    // --- Lógica de fin del test ---
    async function endTest() {
        clearInterval(timerInterval);
        let aciertos = 0, fallos = 0;
        testQuestions.forEach((pregunta, index) => {
            if (userAnswers[index] === pregunta.correcta) aciertos++;
            else if (userAnswers[index] !== null) fallos++;
        });
        const sinContestar = testQuestions.length - aciertos - fallos;
        let nota = ((aciertos - (fallos * 0.33)) / testQuestions.length) * 10;
        nota = Math.max(0, nota);
        const resultsData = {
            nota, aciertos, fallos, sinContestar, testQuestions, userAnswers
        };

        const user = auth.currentUser;
        if (user) {
            const idsAcertadasNuevas = [];
            testQuestions.forEach((pregunta, index) => {
                if (userAnswers[index] === pregunta.correcta) {
                    // Usamos el texto de la pregunta como ID
                    idsAcertadasNuevas.push(pregunta.pregunta);
                }
            });

            if (idsAcertadasNuevas.length > 0) {
                const progressRef = db.collection('users').doc(user.uid).collection('progress').doc(config.opposition);
                // Usamos el comando arrayUnion que es ideal para esto.
                // Ahora debería funcionar al pasarle textos válidos en lugar de 'undefined'.
                await progressRef.set({
                    preguntasAcertadasUnicas: firebase.firestore.FieldValue.arrayUnion(...idsAcertadasNuevas)
                }, { merge: true }).catch(e => {
                    console.error("Error al guardar progreso:", e);
                });
            }
        }

        sessionStorage.setItem('testResults', JSON.stringify(resultsData));
        window.location.href = 'results.html';
    }

    // --- Listeners de los botones ---
    siguientePreguntaBtn.addEventListener('click', siguientePregunta);
    endTestBtn.addEventListener('click', () => endTest());

    // --- ¡EMPEZAMOS! ---
    iniciarTest();
});
