document.addEventListener('DOMContentLoaded', () => {

    // --- 1. REFERENCIAS A ELEMENTOS DEL HTML ---
    const timerEl = document.getElementById('timer');
    const testContainerEl = document.getElementById('test-container');

    const oposicionTituloEl = document.getElementById('oposicion-titulo');
    const preguntaNumeroEl = document.getElementById('pregunta-numero');
    const preguntaTextoEl = document.getElementById('pregunta-texto');
    const opcionesContainerEl = document.getElementById('opciones-container');

    const feedbackContainerEl = document.getElementById('feedback-container');
    const feedbackTemaEl = document.getElementById('feedback-tema');
    const feedbackExplicacionEl = document.getElementById('feedback-explicacion');
    const siguientePreguntaBtn = document.getElementById('siguiente-pregunta-btn');
    const endTestBtn = document.getElementById('end-test-btn');

    // --- 2. ESTADO DEL TEST Y CONFIGURACIÓN ---
    let config = {};
    let testQuestions = [];
    let userAnswers = [];
    let currentQuestionIndex = 0;
    let timerInterval;

    // --- 3. INICIAR EL TEST ---
    async function iniciarTest() {
        const savedConfig = localStorage.getItem('testConfig');
        if (!savedConfig) {
            document.body.innerHTML = '<h1>Error: No se encontró configuración. Por favor, vuelve al menú y selecciona un test.</h1>';
            return;
        }
        config = JSON.parse(savedConfig);

        await cargarPreguntasDesdeJSON();

        if (testQuestions.length === 0) {
            document.body.innerHTML = `<h1>No se encontraron preguntas para la oposición "${config.opposition}". Asegúrate de que el archivo "preguntas_${config.opposition}.json" existe.</h1>`;
            return;
        }

        userAnswers = new Array(testQuestions.length).fill(null);
        mostrarPregunta();
        startTimer(config.time);
    }

    // --- FUNCIÓN PARA CARGAR PREGUNTAS DESDE UN ARCHIVO JSON ---
    async function cargarPreguntasDesdeJSON() {
        oposicionTituloEl.textContent = `Test de ${config.opposition.charAt(0).toUpperCase() + config.opposition.slice(1)}`;
        const nombreArchivo = `preguntas_${config.opposition}.json`;

        try {
            const response = await fetch(nombreArchivo);
            if (!response.ok) throw new Error(`No se pudo encontrar el archivo ${nombreArchivo}.`);

            let todasLasPreguntas = await response.json();
            todasLasPreguntas.sort(() => 0.5 - Math.random());
            testQuestions = todasLasPreguntas.slice(0, config.numQuestions);

        } catch (error) {
            console.error("Error al cargar el archivo de preguntas:", error);
            testQuestions = []; 
        }
    }

    // --- 4. LÓGICA PARA MOSTRAR PREGUNTAS Y OPCIONES ---
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

    // --- 5. LÓGICA PARA REVISAR LA RESPUESTA ---
    function revisarRespuesta(evento) {
        const botonSeleccionado = evento.currentTarget;
        const indiceSeleccionado = parseInt(botonSeleccionado.dataset.index, 10);
        userAnswers[currentQuestionIndex] = indiceSeleccionado;

        opcionesContainerEl.querySelectorAll('.opcion-btn').forEach(btn => btn.disabled = true);

        if (config.mode === 'estudio') {
            const preguntaActual = testQuestions[currentQuestionIndex];
            const indiceCorrecto = preguntaActual.correcta;

            if (indiceSeleccionado === indiceCorrecto) {
                botonSeleccionado.classList.add('correcta');
            } else {
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

    // --- 6. PASAR A LA SIGUIENTE PREGUNTA O FINALIZAR ---
    function siguientePregunta() {
        currentQuestionIndex++;
        if (currentQuestionIndex < testQuestions.length) {
            mostrarPregunta();
        } else {
            endTest();
        }
    }

    // --- 7. TEMPORIZADOR ---
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

    // --- 8. LÓGICA DE FIN DEL TEST Y RESULTADOS (MODIFICADA PARA REDIRIGIR) ---
    function endTest() {
        clearInterval(timerInterval);

        let aciertos = 0;
        let fallos = 0;

        testQuestions.forEach((pregunta, index) => {
            const respuestaUsuario = userAnswers[index];
            if (respuestaUsuario === pregunta.correcta) {
                aciertos++;
            } else if (respuestaUsuario !== null) {
                fallos++;
            }
        });

        const sinContestar = testQuestions.length - aciertos - fallos;
        let nota = ((aciertos - (fallos * 0.33)) / testQuestions.length) * 10;
        nota = Math.max(0, nota);

        const resultsData = {
            nota: nota,
            aciertos: aciertos,
            fallos: fallos,
            sinContestar: sinContestar,
            testQuestions: testQuestions,
            userAnswers: userAnswers
        };

        sessionStorage.setItem('testResults', JSON.stringify(resultsData));
        window.location.href = 'results.html';
    }

    // --- 9. LISTENERS DE LOS BOTONES ---
    siguientePreguntaBtn.addEventListener('click', siguientePregunta);

    endTestBtn.addEventListener('click', () => {
        endTest();
    });

    // --- ¡EMPEZAMOS! ---
    iniciarTest();
});
