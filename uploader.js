const firebaseConfig = {
  // Asegúrate de pegar aquí tu configuración completa de Firebase
  // que usaste en los otros archivos (script.js, etc.)
    apiKey: "AIzaSyD9upjL3TbsQoE--wAiTtdW7ztssZGgE9w",
      authDomain: "halligantest.firebaseapp.com",
      projectId: "halligantest",
      storageBucket: "halligantest.firebasestorage.app",
      messagingSenderId: "852038922281",
      appId: "1:852038922281:web:06e297c951e74d9cad2c38"
};

// --- INICIALIZACIÓN DE FIREBASE ---
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// --- ELEMENTOS DEL DOM ---
const uploadBtn = document.getElementById('upload-btn');

// --- LÓGICA DEL BOTÓN DE SUBIDA ---
uploadBtn.addEventListener('click', () => {
    console.log("Iniciando subida de preguntas...");
    uploadBtn.textContent = "Subiendo...";
    uploadBtn.disabled = true; // Desactivamos el botón para no pulsarlo dos veces

    // Leemos el archivo JSON que subiste a Replit
    fetch('preguntas_madrid.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('Error al cargar el archivo preguntas_madrid.json. ¿Está subido y bien escrito?');
            }
            return response.json();
        })
        .then(questions => {
            console.log(`Se encontraron ${questions.length} preguntas en el archivo JSON.`);

            const oppositionId = 'madrid'; // El ID del documento de la oposición
            const questionsCollection = db.collection('oppositions').doc(oppositionId).collection('questions');

            // Creamos un array de promesas, una por cada pregunta a añadir
            const promises = questions.map(q => {
                console.log(`Añadiendo pregunta: ${q.pregunta.substring(0, 40)}...`);
                return questionsCollection.add(q);
            });

            // Promise.all espera a que todas las promesas se completen
            return Promise.all(promises);
        })
        .then((results) => {
            console.log(`✅ ¡Subida completada con éxito! Se añadieron ${results.length} preguntas.`);
            alert(`¡Subida completada con éxito! Se añadieron ${results.length} preguntas.`);
            uploadBtn.textContent = "Subida Completada";
        })
        .catch(error => {
            console.error("❌ Error durante la subida:", error);
            alert("Hubo un error durante la subida. Revisa la consola para más detalles.");
            uploadBtn.textContent = "Error en la subida";
            uploadBtn.disabled = false;
        });
});
