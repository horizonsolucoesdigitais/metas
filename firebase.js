// firebase.js — Configuração e inicialização do Firebase (Compat)
// Preencha ESTE arquivo com as suas chaves do projeto Firebase.
// Em "Configurações do projeto" → "Suas apps" → Web (</>) → Config.

// 🔒 IMPORTANTE: Este arquivo fica público no front-end.
// Use regras de segurança no Firestore/Storage e Authentication adequadamente.

// Cole aqui o objeto de configuração do seu projeto Firebase
const firebaseConfig = {
  apiKey: "COLE_SUA_API_KEY",
  authDomain: "SEU_PROJETO.firebaseapp.com",
  projectId: "SEU_PROJETO",
  storageBucket: "SEU_PROJETO.appspot.com",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:xxxxxxxxxxxxxxxx",
  measurementId: "G-XXXXXXXXXX" // opcional
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
