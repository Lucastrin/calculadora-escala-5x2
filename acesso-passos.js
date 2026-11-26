/* Passos ilustrados de "Deixe na tela do celular" (Android e iPhone).
   Cada passo tem o texto e um desenho simples da tela, com o lugar de tocar em amarelo. */
(() => {
  'use strict';
  const M = '#15294C', P = '#FFFDF6', C = '#F3E7CB', A = '#FFD23F', L = '#B5DE3A', T = 'rgba(21,41,76,.22)';
  const ICONE = '../icones/icone-180.png';
  const tela = (miolo) => `<svg class="passo__desenho" viewBox="0 0 300 120" role="presentation" aria-hidden="true" font-family="Nunito, system-ui, sans-serif">
    <rect x="2" y="2" width="296" height="116" rx="18" fill="${P}" stroke="${M}" stroke-width="2"/>${miolo}</svg>`;
  const txt = (x, y, s, o = {}) => `<text x="${x}" y="${y}" font-size="${o.t || 14}" font-weight="${o.p || 700}" fill="${o.c || M}" text-anchor="${o.a || 'start'}">${s}</text>`;
  // dedo tocando: seta curta desenhada à mão apontando para o alvo
  const seta = (x, y) => `<path d="M${x + 34} ${y + 30}c-8-6-15-14-22-23M${x + 12} ${y + 7}c.5 4 .6 7 .4 10M${x + 12} ${y + 7}c3.8.6 7.2 1.6 10 3" fill="none" stroke="${M}" stroke-width="2.4" stroke-linecap="round"/>`;
  const barraEndereco = (y) => `<rect x="16" y="${y}" width="228" height="32" rx="16" fill="${C}"/>
    <path d="M32 ${y + 13}h7v9h-7zM33.5 ${y + 13}v-3a2 2 0 0 1 4 0v3" fill="none" stroke="${M}" stroke-width="1.6"/>
    ${txt(46, y + 21, 'lucastrin.github.io', { t: 13, p: 600 })}`;
  const linhas = (y) => `<path d="M24 ${y}h150M24 ${y + 14}h210M24 ${y + 28}h120" stroke="${T}" stroke-width="7" stroke-linecap="round"/>`;
  const telaInicial = tela(`
    ${[0, 1, 2, 3].map((i) => `<rect x="${38 + i * 60}" y="18" width="44" height="44" rx="11" fill="${C}"/>`).join('')}
    <circle cx="150" cy="40" r="31" fill="${A}" stroke="${M}" stroke-width="2"/>
    <image href="${ICONE}" x="128" y="18" width="44" height="44" clip-path="inset(0 round 11px)"/>
    ${txt(150, 88, 'Mapa Fácil 5x2', { t: 13, a: 'middle', p: 800 })}
    <path d="M30 104h240" stroke="${T}" stroke-width="2" stroke-dasharray="2 6" stroke-linecap="round"/>`);

  const PASSOS = {
    android: [
      {
        texto: 'Abra esta página no <strong>Chrome</strong>.',
        desenho: tela(`${barraEndereco(14)}
          <circle cx="150" cy="78" r="21" fill="${L}" stroke="${M}" stroke-width="2"/>
          <circle cx="150" cy="78" r="8.5" fill="${P}" stroke="${M}" stroke-width="2"/>
          <path d="M150 69.5h18.2M142.6 82.3l-9.1 15.8M157.4 82.3l9.1 15.8" stroke="${M}" stroke-width="2" stroke-linecap="round"/>`)
      },
      {
        texto: 'Toque nos <strong>três pontinhos ⋮</strong>, no alto, à direita.',
        desenho: tela(`${barraEndereco(14)}${linhas(66)}
          <circle cx="271" cy="30" r="19" fill="${A}" stroke="${M}" stroke-width="2"/>
          <circle cx="271" cy="22" r="2.6" fill="${M}"/><circle cx="271" cy="30" r="2.6" fill="${M}"/><circle cx="271" cy="38" r="2.6" fill="${M}"/>
          ${seta(250, 48)}`)
      },
      {
        texto: 'Toque em <strong>“Adicionar à tela inicial”</strong> (em alguns celulares aparece <strong>“Instalar app”</strong>).',
        desenho: tela(`${linhas(30)}
          <rect x="100" y="10" width="188" height="100" rx="12" fill="${P}" stroke="${M}" stroke-width="2"/>
          ${txt(116, 30, 'Nova guia', { p: 600, c: '#3D4E6E' })}
          ${txt(116, 52, 'Favoritos', { p: 600, c: '#3D4E6E' })}
          <rect x="106" y="59" width="176" height="26" rx="8" fill="${A}" stroke="${M}" stroke-width="2"/>
          ${txt(116, 77, 'Adicionar à tela inicial', { t: 13, p: 800 })}
          ${txt(116, 101, 'Compartilhar…', { p: 600, c: '#3D4E6E' })}`)
      },
      {
        texto: 'Confirme em <strong>“Adicionar”</strong> (ou <strong>“Instalar”</strong>).',
        desenho: tela(`<rect x="26" y="12" width="248" height="96" rx="14" fill="${P}" stroke="${M}" stroke-width="2"/>
          ${txt(42, 36, 'Adicionar à tela inicial', { t: 15, p: 800 })}
          <image href="${ICONE}" x="42" y="46" width="26" height="26" clip-path="inset(0 round 7px)"/>
          ${txt(76, 64, 'Mapa Fácil 5x2', { t: 13, p: 600 })}
          ${txt(118, 97, 'Cancelar', { t: 13, p: 700, c: '#3D4E6E' })}
          <rect x="186" y="80" width="78" height="26" rx="13" fill="${A}" stroke="${M}" stroke-width="2"/>
          ${txt(225, 98, 'Adicionar', { t: 13, p: 800, a: 'middle' })}`)
      },
      { texto: '<strong>Pronto!</strong> O ícone aparece na tela do celular. É só tocar nele.', desenho: telaInicial }
    ],
    iphone: [
      {
        texto: 'Abra esta página no <strong>Safari</strong> (a bússola).',
        desenho: tela(`<circle cx="150" cy="42" r="26" fill="${P}" stroke="${M}" stroke-width="2.4"/>
          <path d="M150 20v4M150 60v4M128 42h4M168 42h4" stroke="${M}" stroke-width="2" stroke-linecap="round"/>
          <path d="M161 31l-7 15-15 7 7-15z" fill="${A}" stroke="${M}" stroke-width="2" stroke-linejoin="round"/>
          <rect x="36" y="78" width="228" height="30" rx="15" fill="${C}"/>
          ${txt(150, 98, 'lucastrin.github.io', { t: 13, p: 600, a: 'middle' })}`)
      },
      {
        texto: 'Toque em <strong>Compartilhar</strong> (o quadrado com a seta para cima). No iPhone mais novo, ele fica dentro do <strong>⋯</strong>.',
        desenho: tela(`${linhas(18)}
          <path d="M2 58h296" stroke="${T}" stroke-width="2"/>
          <path d="M42 76l-8 8 8 8M88 76l8 8-8 8" fill="none" stroke="${T}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
          <circle cx="150" cy="84" r="21" fill="${A}" stroke="${M}" stroke-width="2"/>
          <path d="M144 80h-4v14h20v-14h-4M150 72v14M145.5 76.5l4.5-4.5 4.5 4.5" fill="none" stroke="${M}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M200 76c4-2 8-2 12 0v16c-4-2-8-2-12 0zM212 76c4-2 8-2 12 0v16c-4-2-8-2-12 0z" fill="none" stroke="${T}" stroke-width="2.2" stroke-linejoin="round"/>
          <rect x="250" y="74" width="16" height="16" rx="3" fill="none" stroke="${T}" stroke-width="2.2"/><rect x="255" y="79" width="16" height="16" rx="3" fill="${P}" stroke="${T}" stroke-width="2.2"/>
          ${seta(166, 92)}`)
      },
      {
        texto: 'Role a lista para baixo e toque em <strong>“Adicionar à Tela de Início”</strong>.',
        desenho: tela(`<rect x="14" y="12" width="272" height="26" rx="8" fill="${C}"/>${txt(26, 30, 'Copiar', { p: 600, c: '#3D4E6E' })}
          <rect x="14" y="44" width="272" height="26" rx="8" fill="${C}"/>${txt(26, 62, 'Adicionar aos Favoritos', { p: 600, c: '#3D4E6E' })}
          <rect x="14" y="78" width="272" height="30" rx="8" fill="${A}" stroke="${M}" stroke-width="2"/>
          ${txt(26, 98, 'Adicionar à Tela de Início', { p: 800 })}
          <rect x="254" y="84" width="18" height="18" rx="4" fill="none" stroke="${M}" stroke-width="2"/>
          <path d="M263 88v10M258 93h10" stroke="${M}" stroke-width="2" stroke-linecap="round"/>`)
      },
      {
        texto: 'Toque em <strong>“Adicionar”</strong>, no alto, à direita.',
        desenho: tela(`${txt(22, 32, 'Cancelar', { p: 600, c: '#3D4E6E' })}
          <rect x="206" y="14" width="78" height="28" rx="14" fill="${A}" stroke="${M}" stroke-width="2"/>
          ${txt(245, 33, 'Adicionar', { t: 13, p: 800, a: 'middle' })}
          <path d="M2 52h296" stroke="${T}" stroke-width="2"/>
          <image href="${ICONE}" x="22" y="62" width="40" height="40" clip-path="inset(0 round 10px)"/>
          <rect x="74" y="68" width="206" height="30" rx="8" fill="${C}"/>
          ${txt(86, 88, 'Mapa Fácil 5x2', { t: 13, p: 600 })}`)
      },
      { texto: '<strong>Pronto!</strong> O ícone aparece na tela do celular. É só tocar nele.', desenho: telaInicial }
    ]
  };

  for (const [so, passos] of Object.entries(PASSOS)) {
    const ol = document.getElementById(`passos-${so}`);
    if (!ol) continue;
    ol.innerHTML = passos.map((p, i) => `<li class="passo">
      <span class="passo__num" aria-hidden="true">${i + 1}</span>
      <p class="passo__texto">${p.texto}</p>
      ${p.desenho}
    </li>`).join('');
  }
})();
