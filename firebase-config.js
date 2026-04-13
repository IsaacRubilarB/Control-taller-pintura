const firebaseConfig = {
    apiKey: "AIzaSyDAXtGJDu5iWZwqVD71NUqkRndQgOk0L6k",
    authDomain: "control-taller-f7e95.firebaseapp.com",
    databaseURL: "https://control-taller-f7e95-default-rtdb.firebaseio.com/", 
    projectId: "control-taller-f7e95",
    storageBucket: "control-taller-f7e95.firebasestorage.app",
    messagingSenderId: "170250972869",
    appId: "1:170250972869:web:6ad1a1446302a62c294aac"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Referencia a la base de datos para usarla en app.js
const db = firebase.database();