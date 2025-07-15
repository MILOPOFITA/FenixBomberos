document.addEventListener('DOMContentLoaded', () => {
    // Obtenemos los datos del test que guardamos en sessionStorage
    const resultsData = JSON.parse(sessionStorage.getItem('testResults'));

    if (!resultsData) {
        document.body.innerHTML = '<h1>No se encontraron resultados para mostrar. Vuelve al menú para empezar un nuevo test.</h1>';
        return;
    }

    // --- Referencias a los elementos del DOM ---
    const finalScoreEl = document.getElementById('final-score');
    const correctCountEl = document.getElementById('correct-count');
    const wrongCountEl = document.getElementById('wrong-count');
    const unansweredCountEl = document.getElementById('unanswered-count');
    const summaryGridEl = document.getElementById('questions-summary-grid');
    const backToMenuBtn = document.getElementById('back-to-menu-btn');

    // Referencias al nuevo contenedor de detalle
    const questionDetailContainerEl = document.getElementById('question-detail-container');
    const detailQuestionTextEl = document.getElementById('detail-question-text');
    const detailOptionsListEl = document.getElementById('detail-options-list');
    const detailExplanationTextEl = document.getElementById('detail-explanation-text');

    // --- Llenar los datos principales ---
    finalScoreEl.textContent = resultsData.nota.toFixed(2);
    correctCountEl.textContent = resultsData.aciertos;
    wrongCountEl.textContent = resultsData.fallos;
    unansweredCountEl.textContent = resultsData.sinContestar;

    // --- Generar la parrilla de resultados INTERACTIVA ---
    resultsData.testQuestions.forEach((pregunta, index) => {
        const box = document.createElement('button'); // Lo convertimos en botón para que sea interactivo
        box.className = 'summary-box';
        box.textContent = index + 1;

        const respuestaUsuario = resultsData.userAnswers[index];
        if (respuestaUsuario === pregunta.correcta) {
            box.classList.add('correct');
        } else if (respuestaUsuario !== null) {
            box.classList.add('incorrect');
        } else {
            box.classList.add('unanswered');
        }

        // Añadimos el evento click para mostrar el detalle de la pregunta
        box.addEventListener('click', () => {
            showQuestionDetail(index);
        });

        summaryGridEl.appendChild(box);
    });

    // --- Función para mostrar el detalle de una pregunta ---
    function showQuestionDetail(index) {
        const pregunta = resultsData.testQuestions[index];
        const respuestaUsuario = resultsData.userAnswers[index];

        // Llenamos el texto de la pregunta y la explicación
        detailQuestionTextEl.textContent = `${index + 1}. ${pregunta.pregunta}`;
        detailExplanationTextEl.textContent = pregunta.explicacion;

        // Limpiamos las opciones anteriores y creamos las nuevas
        detailOptionsListEl.innerHTML = '';
        pregunta.opciones.forEach((opcionTexto, opcionIndex) => {
            const opcionDiv = document.createElement('div');
            opcionDiv.className = 'result-option-item';
            opcionDiv.textContent = opcionTexto;

            // Coloreamos la respuesta correcta siempre de verde
            if (opcionIndex === pregunta.correcta) {
                opcionDiv.classList.add('correct');
            }
            // Si el usuario contestó esta opción y era incorrecta, la coloreamos de rojo
            if (opcionIndex === respuestaUsuario && respuestaUsuario !== pregunta.correcta) {
                opcionDiv.classList.add('incorrect');
            }

            detailOptionsListEl.appendChild(opcionDiv);
        });

        // Mostramos el contenedor de detalle
        questionDetailContainerEl.classList.remove('oculto');
    }

    // --- Listener del botón para volver al menú ---
    backToMenuBtn.addEventListener('click', () => {
        // Limpiamos los datos para no volver a cargarlos por error
        sessionStorage.removeItem('testResults');
        window.location.href = 'index.html';
    });
});
