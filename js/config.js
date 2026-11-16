// Configuração do app. Este é o único arquivo que muda entre ambientes.

// Chaves do projeto Firebase (Console do Firebase → Configurações do projeto → Seus apps → Web).
// Essas chaves são públicas por natureza; quem protege os dados são as regras em firestore.rules.
// Enquanto apiKey estiver vazio, o app roda em MODO DEMONSTRAÇÃO (dados só neste navegador).
export const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: "",
};

// As duas pessoas da casa. O "email" é a conta Google usada para entrar.
// Se mudar um e-mail aqui, mude também em firestore.rules.
export const pessoas = [
  { id: "leon", nome: "Leon", email: "leon.geremias.silva@gmail.com", cor: "#2f6fde" },
  { id: "esposa", nome: "Esposa", email: "", cor: "#d9467a" },
];
