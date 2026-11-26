/* Monta a página de acesso a partir de acesso.js. O plano vem de <body data-plano="basico|completo">. */
(() => {
  'use strict';
  const A = window.ACESSO;
  const plano = A.planos[document.body.dataset.plano];
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icone = (id) => `<svg class="ic" aria-hidden="true"><use href="#i-${id}"/></svg>`;
  const nomeArquivo = (url) => url.split('/').pop();
  // Link do Google Drive: "Abrir" mostra no Drive, "Baixar" usa o link de download direto.
  const idDrive = (url) => (/drive\.google\.com\/(?:file\/d\/|open\?id=)([\w-]+)/.exec(url) || [])[1];
  const botoesAbrir = (abrir, baixar, nome) => `<a class="btn btn--pri" href="${esc(abrir)}" target="_blank" rel="noopener">Abrir</a>
         <a class="btn btn--sec" href="${esc(baixar)}"${nome ? ` download="${esc(nome)}"` : ''}>Baixar</a>`;

  $('#selo').textContent = plano.nome;
  $('#atualizado').textContent = `Atualizado em ${A.atualizadoEm} · ${A.baseLegal}`;

  // Cartões: só os itens do plano. O Básico não recebe nenhum link dos bônus.
  const cartoes = plano.itens.map((id) => {
    const it = A.itens[id];
    let botoes;
    const url = it.arquivo && A.arquivos[it.arquivo];
    const drive = url && idDrive(url);
    if (drive) {
      botoes = `<div class="item__botoes">${botoesAbrir(`https://drive.google.com/file/d/${drive}/view`, `https://drive.google.com/uc?export=download&id=${drive}`)}</div>`;
    } else if (url) {
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
      ? botoesAbrir(url, url, caixa.dataset.nome)
      : '<span class="btn btn--sec btn--espera" aria-disabled="true">Em breve</span>';
  });

  // Suporte por e-mail
  const email = String(A.suporteEmail || '').trim();
  const sup = $('#suporte');
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    const href = `mailto:${email}?subject=${encodeURIComponent(A.assuntoSuporte)}&body=${encodeURIComponent(A.mensagemSuporte)}`;
    sup.innerHTML = `<a class="btn btn--pri btn--largo" href="${esc(href)}">Falar com o suporte por e-mail</a>
      <p class="suporte__email">${esc(email)}</p>`;
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

  // Botão "Adicionar à tela inicial" (Chrome no Android). Só aparece quando o navegador permite;
  // no iPhone isso não existe, então ficam só os passos.
  const tela = $('.tela-inicial');
  const btnInstalar = $('#instalar');
  const pronto = () => {
    btnInstalar.hidden = true;
    $('#so-ou').hidden = true;
    $('#instalado').hidden = false;
  };
  if (window.matchMedia('(display-mode: standalone)').matches || navigator.standalone) {
    tela.hidden = true; // já foi aberta pelo ícone da tela
  }
  let pedido = null;
  window.addEventListener('beforeinstallprompt', (ev) => {
    ev.preventDefault();
    pedido = ev;
    btnInstalar.hidden = false;
    $('#so-ou').hidden = false;
    abrir('android');
  });
  btnInstalar.addEventListener('click', async () => {
    if (!pedido) return;
    pedido.prompt();
    const { outcome } = await pedido.userChoice;
    pedido = null;
    if (outcome === 'accepted') pronto();
    else { btnInstalar.hidden = true; $('#so-ou').hidden = true; } // só dá para pedir uma vez; os passos continuam abaixo
  });
  window.addEventListener('appinstalled', pronto);
})();
