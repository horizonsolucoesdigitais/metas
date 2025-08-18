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

// 🟢 2) Inicializa o app
firebase.initializeApp(firebaseConfig);

// 🔐 3) Serviços que usamos
const auth = firebase.auth();
const db = firebase.firestore();

// (opcional) Ajustes do Firestore
// db.settings({ ignoreUndefinedProperties: true });

// 🔓 4) Persistência de sessão padrão (pode ser trocada no login)
auth.setPersistence(firebase.auth.Auth.Persistence.SESSION).catch(() => {});

// 🌍 5) Expor no escopo global para uso no app.js
window.firebaseApp = { firebase, auth, db };

// ✅ 6) Helpers úteis (caso precise em outros pontos do app)
window.firebaseHelpers = {
  nowISO: () => new Date().toISOString(),
  // serverTimestamp: firebase.firestore.FieldValue.serverTimestamp, // se quiser usar server-side timestamp
};

/*
Como preencher a config:
const firebaseConfig = {
  apiKey: "AI...",
  authDomain: "seu-projeto.firebaseapp.com",
  projectId: "seu-projeto",
  storageBucket: "seu-projeto.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef012345",
};

Checklist depois de configurar:
1) Authentication → Métodos de login → E-mail/senha ATIVADO.
2) Firestore criado (modo teste durante o desenvolvimento).
3) Em Authentication → Configurações → Domínios autorizados → inclua o domínio onde roda (ex.: localhost, 127.0.0.1, *.github.io).
4) (Opcional) Crie em Firestore a coleção "roles" e adicione { role: "admin" } no doc de UID do seu usuário administrador para liberar o modal de Filiais.
*/

