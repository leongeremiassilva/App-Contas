// Configuração do app. Este é o único arquivo que muda entre ambientes.

// Chaves do projeto Firebase (Console do Firebase → Configurações do projeto → Seus apps → Web).
// Essas chaves são públicas por natureza; quem protege os dados são as regras em firestore.rules.
// Enquanto apiKey estiver vazio, o app roda em MODO DEMONSTRAÇÃO (dados só neste navegador).
export const firebaseConfig = {
  apiKey: "AIzaSyAyzLxqclIXh-vExtAAXCCHaH20wDrWS-0",
  authDomain: "contas-da-casa-1fd37.firebaseapp.com",
  projectId: "contas-da-casa-1fd37",
  storageBucket: "contas-da-casa-1fd37.firebasestorage.app",
  messagingSenderId: "229662439713",
  appId: "1:229662439713:web:8033607e28e7783a5d6660",
};

// As duas pessoas da casa. O "email" é a conta Google usada para entrar.
// Se mudar um e-mail aqui, mude também em firestore.rules.
export const pessoas = [
  { id: "leon", nome: "Leon", email: "leon.geremias.silva@gmail.com", cor: "#2f6fde" },
  { id: "esposa", nome: "Ariane", email: "", cor: "#d9467a" },
];
