// Ícones de traço simples (desenhados para o app), no lugar de emojis.
// Uso: svg("casa") devolve o <svg> pronto; a cor vem do texto em volta (currentColor).

const P = {
  // navegação e ações
  painel: '<rect x="3" y="3" width="7.5" height="9" rx="1.8"/><rect x="13.5" y="3" width="7.5" height="5.5" rx="1.8"/><rect x="13.5" y="11.5" width="7.5" height="9.5" rx="1.8"/><rect x="3" y="15" width="7.5" height="6" rx="1.8"/>',
  lista: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r=".9"/><circle cx="4.5" cy="12" r=".9"/><circle cx="4.5" cy="18" r=".9"/>',
  calendario: '<rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 10h18M8 3v4M16 3v4"/><path d="m9 15.2 2 2 4-4"/>',
  alvo: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/>',
  cartao: '<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 10h19M6 15h4"/>',
  banco: '<path d="M3 9.5 12 4l9 5.5"/><path d="M4 20h16M5.5 10.5v6.5M10 10.5v6.5M14 10.5v6.5M18.5 10.5v6.5"/>',
  carteira: '<path d="M19 7V5.5A1.5 1.5 0 0 0 17.5 4H5a2 2 0 0 0 0 4h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6"/><path d="M17 14h.01"/>',
  etiqueta: '<path d="M3 12V4.5A1.5 1.5 0 0 1 4.5 3H12l9 9-9 9z"/><circle cx="7.5" cy="7.5" r="1.3"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  baixar: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  sair: '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H4"/>',
  olho: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  olhoFechado: '<path d="M3 3l18 18"/><path d="M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6C3.8 8.4 2 12 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  mais: '<path d="M12 5v14M5 12h14"/>',
  menos: '<path d="M5 12h14"/>',
  esquerda: '<path d="m15 6-6 6 6 6"/>',
  direita: '<path d="m9 6 6 6-6 6"/>',
  transferir: '<path d="M4 8h15l-3.5-3.5M20 16H5l3.5 3.5"/>',
  entrada: '<circle cx="12" cy="12" r="9"/><path d="M12 16.5v-9M8.5 11 12 7.5l3.5 3.5"/>',
  saida: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v9M8.5 13l3.5 3.5 3.5-3.5"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  lapis: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  sol: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
  lua: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
  cadeado: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7.5a4 4 0 0 1 8 0V11"/>',
  alerta: '<path d="M12 3.5 2.5 20h19z"/><path d="M12 10v4.5M12 17.2h.01"/>',
  barras: '<path d="M3 21h18"/><rect x="5" y="11" width="3.5" height="7" rx="1"/><rect x="10.25" y="5" width="3.5" height="13" rx="1"/><rect x="15.5" y="8.5" width="3.5" height="9.5" rx="1"/>',
  importar: '<path d="M12 15V4M7.5 8.5 12 4l4.5 4.5"/><path d="M4 14v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/>',
  sino: '<path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
  bandeira: '<path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/>',
  arquivo: '<path d="M14 3H6.5A1.5 1.5 0 0 0 5 4.5v15A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V8z"/><path d="M14 3v5h5M8.5 13h7M8.5 17h5"/>',
  fechar: '<path d="M6 6l12 12M18 6 6 18"/>',
  // grupos
  fixos: '<path d="M9 3h6l-.8 5.5L18 12H6l3.8-3.5z"/><path d="M12 12v9"/>',
  pessoa: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  porquinho: '<path d="M4.5 11.5c0-3.6 3.4-6 7.5-6 2.3 0 4.3.8 5.7 2H20v3.6l-1.6.9c-.3 1.6-1.3 3-2.9 4V20h-3v-2h-2v2H7.5v-3.5c-1.8-1.2-3-3-3-5z"/><path d="M15.5 10.5h.01M9.5 5.6a2.5 2.5 0 0 1 4.6-1"/>',
  // categorias
  talheres: '<path d="M6 3v6a3 3 0 0 0 6 0V3M9 3v18"/><path d="M18 21V3c-2 .8-3.5 3-3.5 6v4.5H18"/>',
  tela: '<rect x="3" y="4.5" width="18" height="12.5" rx="2"/><path d="m10.2 8.3 4.6 2.5-4.6 2.5z"/><path d="M8 20.5h8"/>',
  taca: '<path d="M6.5 3h11l-1 6a4.5 4.5 0 0 1-9 0z"/><path d="M12 13.5V21M8.5 21h7M7 7.5h10"/>',
  casa: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9v12h14V9"/><path d="M10 21v-6h4v6"/>',
  sacola: '<path d="M5 8h14l-1.2 13H6.2z"/><path d="M9 10.5V6.5a3 3 0 0 1 6 0v4"/>',
  brilho: '<path d="M11 3l1.7 4.8L17.5 9.5l-4.8 1.7L11 16l-1.7-4.8L4.5 9.5l4.8-1.7z"/><path d="M18 14.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/>',
  porcento: '<path d="M19 5 5 19"/><circle cx="7" cy="7" r="2.5"/><circle cx="17" cy="17" r="2.5"/>',
  livro: '<path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H20v15H5.5A1.5 1.5 0 0 0 4 19.5z"/><path d="M4 19.5A1.5 1.5 0 0 0 5.5 21H20"/>',
  familia: '<circle cx="9" cy="7.5" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.3a3.5 3.5 0 0 1 0 6.4M18 14a6.5 6.5 0 0 1 3.5 6"/>',
  recibo: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
  grafico: '<path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  controle: '<rect x="2.5" y="7" width="19" height="11" rx="5.5"/><path d="M7.5 10.5v4M5.5 12.5h4M15.5 12h.01M18 13.5h.01"/>',
  caixa: '<path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z"/><path d="M3 7.5 12 12l9-4.5M12 12v9"/>',
  pata: '<circle cx="6.5" cy="10" r="1.8"/><circle cx="10" cy="6" r="1.8"/><circle cx="14" cy="6" r="1.8"/><circle cx="17.5" cy="10" r="1.8"/><path d="M8 17.5c0-2.6 1.8-5 4-5s4 2.4 4 5a2.3 2.3 0 0 1-3.6 1.8 1 1 0 0 0-.8 0A2.3 2.3 0 0 1 8 17.5z"/>',
  presente: '<rect x="3" y="8" width="18" height="4.5" rx="1"/><path d="M5 12.5V21h14v-8.5M12 8v13"/><path d="M12 8C10.5 4 6.5 4 7 6.8 7.4 8 10 8 12 8zM12 8c1.5-4 5.5-4 5 -1.2C16.6 8 14 8 12 8z"/>',
  camisa: '<path d="M8.5 3 3 6l2 4.5 2.5-1.2V21h9V9.3l2.5 1.2L21 6l-5.5-3a3.5 3.5 0 0 1-7 0z"/>',
  saude: '<path d="M12 20.5s-8.5-4.8-8.5-11A4.8 4.8 0 0 1 12 6.6a4.8 4.8 0 0 1 8.5 2.9c0 6.2-8.5 11-8.5 11z"/><path d="M5 12h3.5l1.5-2.5 2.5 5 1.5-2.5H19"/>',
  maleta: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18"/>',
  carro: '<path d="M5 11l1.6-4.2A2 2 0 0 1 8.5 5.5h7a2 2 0 0 1 1.9 1.3L19 11"/><rect x="3" y="11" width="18" height="6" rx="2"/><path d="M6 17v2.5M18 17v2.5"/><path d="M7.5 14h.01M16.5 14h.01"/>',
  aviao: '<path d="M21.5 3 3 10.5l7 2.5 2.5 7.5z"/><path d="m10 13 5-5"/>',
  moedas: '<ellipse cx="9" cy="7" rx="6" ry="3"/><path d="M3 7v4c0 1.7 2.7 3 6 3s6-1.3 6-3V7"/><path d="M9 14v3c0 1.7 2.7 3 6 3s6-1.3 6-3v-4c0-1.7-2.7-3-6-3"/>',
  mao: '<path d="M2 15h3l4.5 4.5h6l5-5a1.6 1.6 0 0 0-2.3-2.3L15 15h-4"/><path d="M5 15V9.5c2-1.5 4.5-1.5 6.5 0H14a1.5 1.5 0 0 1 0 3h-3"/>',
  combustivel: '<path d="M4 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M3 21h12M4 10h10"/><path d="M14 8h2a2 2 0 0 1 2 2v6a1.5 1.5 0 0 0 3 0V8l-3-3"/>',
  carrinho: '<path d="M3 4h2l2.4 11h11L21 7.5H6.3"/><circle cx="9" cy="19.5" r="1.3"/><circle cx="17" cy="19.5" r="1.3"/>',
  pao: '<path d="M4 11a5 5 0 0 1 4-8.5c1.5 0 2.8.6 4 1.5 1.2-.9 2.5-1.5 4-1.5a5 5 0 0 1 4 8.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/><path d="M9 11v5M15 11v5"/>',
  luz: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z"/>',
  telefone: '<rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
  agua: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
};

// Ícones que podem ser escolhidos para categorias (na ordem mostrada no seletor).
export const ICONES_CATEGORIA = [
  "carrinho", "talheres", "pao", "taca", "casa", "luz", "agua", "telefone", "tela", "sacola", "camisa", "brilho",
  "saude", "familia", "pata", "livro", "maleta", "carro", "combustivel", "aviao", "controle", "presente",
  "recibo", "porcento", "banco", "cartao", "grafico", "porquinho", "moedas", "mao", "carteira", "caixa", "etiqueta",
];

export const ICONE_GRUPO = { fixos: "fixos", pessoal: "pessoa", alimentacao: "carrinho", casa: "casa", poupar: "porquinho" };

export function svg(nome, classe = "") {
  return `<svg class="ico ${classe}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[nome] || P.etiqueta}</svg>`;
}

export const existeIcone = (nome) => !!P[nome];
