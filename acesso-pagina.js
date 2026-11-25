/* Monta a página de acesso a partir de acesso.js. O plano vem de <body data-plano="basico|completo">. */
(() => {
  'use strict';
  const A = window.ACESSO;
  const plano = A.planos[document.body.dataset.plano];
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icone = (id) => `<svg class="ic" aria-hidden="true"><use href="#i-${id}"/></svg>`;
  const nomeArquivo = (url) => url.split('/').pop();

  $('#selo').textContent = plano.nome;
  $('#atualizado').textContent = `Atualizado em ${A.atualizadoEm} · ${A.baseLegal}`;

  // Cartões: só os itens do plano. O Básico não recebe nenhum link dos bônus.
  const cartoes = plano.itens.map((id) => {
    const it = A.itens[id];
    let botoes;
    if (it.arquivo) {
      const url = A.arquivos[it.arquivo];
      botoes = `<div class="item__botoes" data-pdf="${esc(url)}" data-nome="${esc(nomeArquivo(url))}">
        <span class="btn btn--pri btn--espera" aria-disabled="true">Verificando…</span></div>`;
    } else {
      botoes = `<div class="item__botoes"><a class="btn btn--pri" href="${esc(A[it.link])}">${esc(it.botao)}</a></div>`;
    }
    return `<li class="item">
      <span class="item__ic">${icone(it.icone)}</span>
      <div class="item__texto"><h2>${esc(it.titulo)}</h2><p>${esc(it.descricao)}</p></div>
      ${botoes}
    </li>`;
  });
  if (plano.bonus) cartoes.push(`<li class="item item--discreto"><span class="item__ic">${icone('kit')}</span><div class="item__texto"><p>${esc(plano.bonus)}</p></div></li>`);
  $('#itens').innerHTML = cartoes.join('');

  // PDF ausente: botão "Em breve", desativado e sem link.
  document.querySelectorAll('[data-pdf]').forEach(async (caixa) => {
    const url = caixa.dataset.pdf;
    let existe = false;
    try {
      const r = await fetch(url, { method: 'HEAD', cache: 'no-store' });
      existe = r.ok && !/text\/html/i.test(r.headers.get('content-type') || '');
    } catch (e) { existe = false; }
    caixa.innerHTML = existe
      ? `<a class="btn btn--pri" href="${esc(url)}" target="_blank" rel="noopener">Abrir</a>
         <a class="btn btn--sec" href="${esc(url)}" download="${esc(caixa.dataset.nome)}">Baixar</a>`
      : '<span class="btn btn--sec btn--espera" aria-disabled="true">Em breve</span>';
  });

  // Suporte no WhatsApp
  const num = String(A.suporteWhatsApp || '').replace(/\D/g, '');
  const sup = $('#suporte');
  if (num.length >= 12) {
    sup.innerHTML = `<a class="btn btn--pri btn--largo" href="https://wa.me/${num}?text=${encodeURIComponent(A.mensagemSuporte)}" target="_blank" rel="noopener">Falar com o suporte no WhatsApp</a>`;
  } else {
    sup.innerHTML = '<span class="btn btn--sec btn--largo btn--espera" aria-disabled="true">Suporte em breve</span>';
  }

  // Abas Android / iPhone (abre a do aparelho de quem está vendo)
  const abas = [...document.querySelectorAll('.so-abas [role="tab"]')];
  const abrir = (id, focar) => {
    abas.forEach((b) => {
      const ativa = b.dataset.so === id;
      b.setAttribute('aria-selected', String(ativa));
      b.tabIndex = ativa ? 0 : -1;
      if (ativa && focar) b.focus();
      document.getElementById(b.getAttribute('aria-controls')).hidden = !ativa;
    });
  };
  abas.forEach((b, i) => {
    b.addEventListener('click', () => abrir(b.dataset.so));
    b.addEventListener('keydown', (ev) => {
      if (ev.key === 'ArrowRight' || ev.key === 'ArrowLeft') { ev.preventDefault(); abrir(abas[(i + 1) % abas.length].dataset.so, true); }
    });
  });
  abrir(/iPhone|iPad|iPod/i.test(navigator.userAgent) ? 'iphone' : 'android');
})();
