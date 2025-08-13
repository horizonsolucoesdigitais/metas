// firebase.js — Configuração e inicialização do Firebase (Compat)
// Preencha ESTE arquivo com as suas chaves do projeto Firebase.
// Em "Configurações do projeto" → "Suas apps" → Web (</>) → Config.

// 🔒 IMPORTANTE: Este arquivo fica público no front-end.
// Use regras de segurança no Firestore/Storage e Authentication adequadamente.

// Cole aqui o objeto de configuração do seu projeto Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDZPv-uez0lKz4sr8O56bh4ZjX4KMR1Wi8",
  authDomain: "metas-736c1.firebaseapp.com",
  databaseURL: "https://metas-736c1-default-rtdb.firebaseio.com",
  projectId: "metas-736c1",
  storageBucket: "metas-736c1.firebasestorage.app",
  messagingSenderId: "678513445596",
  appId: "1:678513445596:web:0c65511ae1fe2f40b68219",
  measurementId: "G-DXCCVV6CN6"
};

// Inicializa o app apenas uma vez
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Serviços que usaremos no projeto
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Ajustes úteis
try {
  // Evita erro ao salvar campos undefined
  db.settings?.({ ignoreUndefinedProperties: true });
} catch (e) {
  console.warn("Aviso Firestore settings:", e);
}

// Expondo de forma explícita para uso no app.js
window.firebaseApp = {
  firebase, // SDK compat
  auth,
  db,
  storage,
};

// Dica: no console do navegador você pode testar: window.firebaseApp.auth.currentUser
