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

  // "Salvar na tela do celular": instala direto quando o navegador deixa; se não, abre o painel com os passos.
  const linha = $('#salvar');
  const folha = $('#folha');
  const painel = $('#folha-painel');
  const trilho = $('#trilho');
  const bolinhas = $('#bolinhas');
  const ehApp = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const ehIphone = /iPhone|iPad|iPod/i.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
  const NOME_SO = { iphone: 'iPhone', android: 'Android' };
  let so = ehIphone ? 'iphone' : 'android';
  let atual = 0;
  let pedido = null;   // evento beforeinstallprompt guardado
  let voltarFoco = null;

  linha.hidden = ehApp(); // aberta pelo ícone da tela: não há o que salvar

  const pronto = () => { linha.hidden = true; $('#instalado').hidden = false; };
  window.addEventListener('beforeinstallprompt', (ev) => { ev.preventDefault(); pedido = ev; });
  window.addEventListener('appinstalled', () => { fechar(); pronto(); });

  const passos = () => (window.PASSOS_TELA || {})[so] || [];
  const montar = () => {
    const lista = passos();
    trilho.innerHTML = lista.map((p, i) => `<li class="carrossel__item" role="group" aria-roledescription="passo" aria-label="Passo ${i + 1} de ${lista.length}">
      <p class="passo__texto"><span class="passo__num" aria-hidden="true">${i + 1}</span><span>${p.texto}</span></p>
      ${p.desenho}
    </li>`).join('');
    bolinhas.innerHTML = lista.map(() => '<span class="bolinha"></span>').join('');
    $('#folha-sub').textContent = `Passo a passo no ${NOME_SO[so]}`;
    const outro = so === 'iphone' ? 'android' : 'iphone';
    $('#trocar-so').innerHTML = `Usa outro celular? <span>Ver no ${NOME_SO[outro]}</span>`;
    trilho.scrollLeft = 0;
    marcar(0);
  };
  const marcar = (i) => {
    const total = passos().length;
    atual = Math.max(0, Math.min(total - 1, i));
    [...bolinhas.children].forEach((b, j) => b.classList.toggle('bolinha--ativa', j === atual));
    $('#anterior').disabled = atual === 0;
    $('#proximo').disabled = atual === total - 1;
    $('#folha-passo').textContent = `Passo ${atual + 1} de ${total}`;
    [...trilho.children].forEach((li, j) => li.setAttribute('aria-hidden', String(j !== atual)));
  };
  const reduzido = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const irPara = (i) => {
    const alvo = trilho.children[Math.max(0, Math.min(trilho.children.length - 1, i))];
    if (!alvo) return;
    trilho.scrollTo({ left: alvo.offsetLeft - trilho.offsetLeft, behavior: reduzido() ? 'auto' : 'smooth' });
    marcar(i);
  };
  let quadro = 0;
  trilho.addEventListener('scroll', () => { // bolinhas acompanham o dedo
    cancelAnimationFrame(quadro);
    quadro = requestAnimationFrame(() => marcar(Math.round(trilho.scrollLeft / trilho.clientWidth)));
  }, { passive: true });
  $('#anterior').addEventListener('click', () => irPara(atual - 1));
  $('#proximo').addEventListener('click', () => irPara(atual + 1));
  $('#trocar-so').addEventListener('click', () => { so = so === 'iphone' ? 'android' : 'iphone'; montar(); });

  const abrirFolha = () => {
    voltarFoco = document.activeElement;
    montar();
    folha.hidden = false;
    document.documentElement.classList.add('sem-rolar');
    requestAnimationFrame(() => requestAnimationFrame(() => folha.classList.add('folha--aberta')));
    painel.focus({ preventScroll: true });
  };
  function fechar() {
    if (folha.hidden) return;
    folha.classList.remove('folha--aberta');
    painel.style.transform = '';
    document.documentElement.classList.remove('sem-rolar');
    const fim = () => { folha.hidden = true; };
    if (reduzido()) fim(); else setTimeout(fim, 260);
    if (voltarFoco && voltarFoco.focus) voltarFoco.focus({ preventScroll: true });
  }
  $('#entendi').addEventListener('click', fechar);
  folha.querySelector('[data-fechar]').addEventListener('click', fechar);
  document.addEventListener('keydown', (ev) => {
    if (folha.hidden) return;
    if (ev.key === 'Escape') { ev.preventDefault(); fechar(); }
    else if (ev.key === 'ArrowRight' && !ev.target.closest('input')) irPara(atual + 1);
    else if (ev.key === 'ArrowLeft' && !ev.target.closest('input')) irPara(atual - 1);
    else if (ev.key === 'Tab') { // foco preso no painel
      const f = [...painel.querySelectorAll('button:not([disabled])')];
      if (!f.length) return;
      const primeiro = f[0], ultimo = f[f.length - 1];
      if (ev.shiftKey && (document.activeElement === primeiro || document.activeElement === painel)) { ev.preventDefault(); ultimo.focus(); }
      else if (!ev.shiftKey && document.activeElement === ultimo) { ev.preventDefault(); primeiro.focus(); }
    }
  });

  // Arrastar o painel para baixo fecha (o carrossel continua deslizando para os lados).
  let toque = null;
  painel.addEventListener('touchstart', (ev) => {
    const t = ev.touches[0];
    toque = { x: t.clientX, y: t.clientY, dy: 0, vertical: null, topo: painel.scrollTop <= 0 };
  }, { passive: true });
  painel.addEventListener('touchmove', (ev) => {
    if (!toque) return;
    const t = ev.touches[0];
    const dx = t.clientX - toque.x, dy = t.clientY - toque.y;
    if (toque.vertical === null && Math.abs(dx) + Math.abs(dy) > 8) toque.vertical = Math.abs(dy) > Math.abs(dx);
    if (!toque.vertical || !toque.topo || dy <= 0) return;
    toque.dy = dy;
    painel.style.transition = 'none';
    painel.style.transform = `translateY(${dy}px)`;
  }, { passive: true });
  painel.addEventListener('touchend', () => {
    if (!toque) return;
    painel.style.transition = '';
    if (toque.dy > 90) fechar(); else painel.style.transform = '';
    toque = null;
  });

  $('#salvar-btn').addEventListener('click', async () => {
    if (pedido) { // o navegador deixa instalar direto: pede na hora, sem abrir nada
      const ev = pedido; pedido = null;
      ev.prompt();
      const { outcome } = await ev.userChoice;
      if (outcome === 'accepted') pronto();
      return;
    }
    abrirFolha();
  });
})();
