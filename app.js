/* Calculadora de Escala e Horas — lógica da tela.
   Toda regra de negócio vem de regras.js (window.REGRAS). */
(() => {
  'use strict';

  const R = window.REGRAS;
  const CHAVE = 'mapa5x2:v1';
  const DIAS = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'];
  const DIAS_NOME = ['segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo'];
  const DIAS_CURTO = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'];
  const DIAS_LETRA = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];
  const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const FERRAMENTAS = ['hora', 'escala', 'rodizio', 'equipe', 'reforco', 'falta'];
  const ROTAS = ['inicio', ...FERRAMENTAS];

  /* ---------- formatos ---------- */
  const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const R$ = (v) => moeda.format(Number.isFinite(v) ? v : 0);
  const num = (v, casas = 2) => (Number.isFinite(v) ? v : 0).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
  const numCurto = (v) => (Number.isFinite(v) ? v : 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  const horas = (min) => {
    const neg = min < 0;
    min = Math.abs(Math.round(min));
    const h = Math.floor(min / 60);
    const m = min % 60;
    return (neg ? '-' : '') + (m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`);
  };
  const pad = (n) => String(n).padStart(2, '0');
  const dataBR = (iso) => iso.split('-').reverse().join('/');
  const diaMesBR = (iso) => `${iso.slice(8)}/${iso.slice(5, 7)}`;
  const hojeISO = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const lista = (itens) => (itens.length <= 1 ? itens.join('') : `${itens.slice(0, -1).join(', ')} e ${itens[itens.length - 1]}`);
  const plural = (n, um, varios) => `${numCurto(n)} ${n === 1 ? um : varios}`;
  const pessoasDia = (n) => plural(n, 'pessoa-dia', 'pessoas-dia');
  const mesNome = (mes, ano) => `${MESES[mes - 1]} de ${ano}`;
  const maiuscula = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  /* Lê números como as pessoas escrevem: "3.000,00", "R$ 3000", "1600 reais", "1,600.00", "4 pessoas".
     Fica só com algarismos e separadores; o último separador é o decimal quando há os dois. */
  function valor(s) {
    if (typeof s === 'number') return s;
    s = String(s ?? '').replace(/[^\d,.\-]/g, '').replace(/^[.,]+|[.,]+$/g, '');
    if (!/\d/.test(s)) return NaN;
    const v = s.lastIndexOf(',');
    const p = s.lastIndexOf('.');
    if (v >= 0 && p >= 0) s = v > p ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
    else if (v >= 0) s = /^-?\d{1,3}(,\d{3})+$/.test(s) ? s.replace(/,/g, '') : s.replace(',', '.');
    else if (p >= 0 && /^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
    const n = Number(s);
    return Number.isFinite(n) ? n : NaN;
  }

  // Salário plausível? Fora da faixa de regras.js, mostra "Confira o salário" e os custos esperam.
  function conferirSalario(s) {
    const v = valor(s);
    if (!Number.isFinite(v) || v <= 0) return { ok: false, vazio: true, v };
    const C = R.conferenciaSalario;
    if (v < C.minimo || v > C.maximo) return { ok: false, v, msg: `Confira o salário: ${moeda.format(v)} parece errado.` };
    return { ok: true, v };
  }
  const inteiro = (s, min, max) => { const n = Math.round(valor(s)); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min; };
  const paraMin = (t) => {
    if (!t || !/^\d{1,2}:\d{2}/.test(t)) return null;
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };
  const hhmm = (m) => { m = ((Math.round(m) % 1440) + 1440) % 1440; return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`; };
  const piso15 = (m) => Math.floor(m / 15) * 15;
  const teto15 = (m) => Math.ceil(m / 15) * 15;
  // Lê horas escritas como 8h24, 8:24, 8 ou 8,4. Devolve em horas (8h24 = 8,4).
  function lerHoras(s) {
    const t = String(s ?? '').trim().toLowerCase();
    const m = t.match(/^(\d{1,3})\s*[h:]\s*(\d{1,2})?\s*(min)?$/);
    if (m) return Number(m[1]) + (m[2] ? Number(m[2]) / 60 : 0);
    return valor(t);
  }
  const DIAS_COMPLETO = ['segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado', 'domingo'];

  /* ---------- datas (sem fuso: tudo em UTC) ---------- */
  const DIA_MS = 86400000;
  const dataUTC = (iso) => { const [a, m, d] = iso.split('-').map(Number); return Date.UTC(a, m - 1, d); };
  const isoDeUTC = (t) => { const d = new Date(t); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`; };
  const addDias = (iso, n) => isoDeUTC(dataUTC(iso) + n * DIA_MS);
  const diasEntre = (a, b) => Math.round((dataUTC(b) - dataUTC(a)) / DIA_MS);
  const isoDe = (ano, mes, dia) => `${ano}-${pad(mes)}-${pad(dia)}`;
  const dsDe = (iso) => (new Date(dataUTC(iso)).getUTCDay() + 6) % 7; // SEG = 0
  const segundaDe = (iso) => addDias(iso, -dsDe(iso));
  const diasNoMes = (ano, mes) => new Date(ano, mes, 0).getDate();
  const mesVizinho = (ano, mes, delta) => {
    let m = mes + delta, a = ano;
    while (m < 1) { m += 12; a--; }
    while (m > 12) { m -= 12; a++; }
    return [a, m];
  };
  const diasDoMes = (ano, mes) => Array.from({ length: diasNoMes(ano, mes) }, (_, i) => isoDe(ano, mes, i + 1));

  /* ---------- regras ---------- */
  const faseDaData = (iso) => R.fases.find((f) => (!f.inicio || iso >= f.inicio) && (!f.fim || iso <= f.fim)) || R.fases[R.fases.length - 1];
  const dataPadrao = () => { const h = hojeISO(); const min = R.planejamento.dataPadraoMinima; return h < min ? min : h; };
  const dataRef = () => estado.data || dataPadrao();
  const faseAtual = () => faseDaData(dataRef());

  function intervaloMinimo(jornadaMin, conv30) {
    const faixa = R.descanso.intervalo.find((f) => jornadaMin <= f.jornadaAteMin);
    if (!faixa) return 0;
    return conv30 && faixa.minimoComConvencaoMin != null ? faixa.minimoComConvencaoMin : faixa.minimoMin;
  }

  // Folgas mínimas no mês: proporcional quando o mês junta duas fases.
  function minimoFolgasMes(ano, mes) {
    let soma = 0;
    for (const iso of diasDoMes(ano, mes)) soma += faseDaData(iso).repousosSemana;
    return Math.ceil(soma / 7);
  }
  function fasesDoMes(ano, mes) {
    const vistas = [];
    for (const iso of diasDoMes(ano, mes)) {
      const f = faseDaData(iso);
      const u = vistas[vistas.length - 1];
      if (!u || u.fase !== f) vistas.push({ fase: f, de: iso, ate: iso });
      else u.ate = iso;
    }
    return vistas;
  }

  function feriadoEm(iso) {
    const m = R.feriados.moveis.find((f) => f.data === iso);
    if (m) return m.nome;
    const f = R.feriados.fixos.find((x) => x.dia === iso.slice(5));
    return f ? f.nome : null;
  }

  /* ---------- estado ---------- */
  let seq = 0;
  const novoId = () => Date.now().toString(36) + (seq++).toString(36);
  const novaPessoa = (n) => ({
    id: novoId(),
    nome: `Pessoa ${n}`,
    dias: DIAS.map((_, i) => (i < 5 ? { folga: false, ent: '08:00', sai: '17:00', int: '60' } : { folga: true, ent: '08:00', sai: '17:00', int: '60' }))
  });

  function assistPadrao() {
    const [ano, mes] = mesVizinho(...hojeISO().split('-').slice(0, 2).map(Number), 1);
    return {
      passo: 1,
      negocio: null,
      abre: '08:00', fecha: '17:00', turnos: '1',
      pausa: false, pausaIni: '15:00', pausaFim: '18:00', acordoIntervalo: false,
      atividade: 'comercio',
      dias: DIAS.map((_, i) => ({ aberto: i < 5, pessoas: '2' })),
      func: '3',
      nomes: [],
      mes, ano
    };
  }

  function padrao() {
    const d = new Date();
    return {
      data: null,
      aba: 'inicio',
      salario: '3.000,00',
      horasExtras: '10',
      conv30: false,
      pessoas: [novaPessoa(1), novaPessoa(2)],
      rodMes: d.getMonth() + 1,
      rodAno: d.getFullYear(),
      atividade: 'comercio',
      rodEdicoes: {},
      rodAuto: {},
      rodReparado: {},
      eqDias: DIAS.map(() => ({ aberto: true, pessoas: '3' })),
      func: '4',
      refTurnos: '1',
      refHoras: '8',
      refMeio: '1.800,00',
      refHoraValor: '',
      refEnc: '',
      fTipo: 'mensalista',
      fHora: '10,00',
      fHorasSemana: '42',
      fFaltas: '1',
      fFeriado: false,
      assist: assistPadrao()
    };
  }

  let estado = padrao();
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE) || 'null');
    if (salvo && typeof salvo === 'object') {
      estado = Object.assign(padrao(), salvo);
      estado.assist = Object.assign(assistPadrao(), salvo.assist || {});
      estado.rodAuto = estado.rodAuto || {};
      estado.rodReparado = estado.rodReparado || {};
    }
  } catch (e) { /* dados antigos ou corrompidos: começa do zero */ }

  let timerSalvar;
  const salvar = () => {
    clearTimeout(timerSalvar);
    timerSalvar = setTimeout(() => {
      try { localStorage.setItem(CHAVE, JSON.stringify(estado)); } catch (e) { /* sem espaço ou modo privado */ }
    }, 200);
  };

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const icone = (id, cls = 'ic') => `<svg class="${cls}" aria-hidden="true"><use href="#i-${id}"/></svg>`;
  const aviso = (txt, tipo = 'alerta') => `<li class="aviso aviso--${tipo}">${icone(tipo === 'ok' ? 'ok' : 'alerta')}<span>${txt}</span></li>`;

  /* ---------- campos simples ligados ao estado ---------- */
  function preencherCampos(exceto) {
    $$('[data-k]').forEach((el) => {
      if (el === exceto) return;
      const v = estado[el.dataset.k];
      if (el.type === 'checkbox') el.checked = !!v;
      else if (el.type === 'radio') el.checked = String(v) === el.value;
      else if (el.value !== String(v ?? '')) el.value = v ?? '';
    });
    $$('[data-a]').forEach((el) => {
      if (el === exceto) return;
      const v = estado.assist[el.dataset.a];
      if (el.type === 'checkbox') el.checked = !!v;
      else if (el.type === 'radio') el.checked = String(v) === el.value;
      else if (el.value !== String(v ?? '')) el.value = v ?? '';
    });
  }

  document.addEventListener('input', aoMudarCampo);
  document.addEventListener('change', aoMudarCampo);
  function aoMudarCampo(ev) {
    const el = ev.target;
    if (!el.dataset) return;
    if (el.dataset.a) return aoMudarAssist(el, ev.type);
    if (!el.dataset.k) return;
    const k = el.dataset.k;
    if (el.type === 'checkbox') estado[k] = el.checked;
    else if (el.type === 'radio') { if (!el.checked) return; estado[k] = el.value; }
    else if (k === 'rodMes' || k === 'rodAno') estado[k] = Number(el.value);
    else estado[k] = el.value;
    preencherCampos(el);
    salvar();
    if (k === 'rodMes' || k === 'rodAno' || k === 'atividade') desenharRodizio();
    calcularTudo();
  }

  /* ---------- fase e data ---------- */
  const inputData = $('#data-ref');
  function mostrarFase() {
    const iso = dataRef();
    inputData.value = iso;
    const f = faseDaData(iso);
    const periodo = f.inicio && f.fim ? `de ${dataBR(f.inicio)} a ${dataBR(f.fim)}`
      : f.fim ? `até ${dataBR(f.fim)}` : `a partir de ${dataBR(f.inicio)}`;
    $('#fase-selo').innerHTML = `Regras de <strong>${f.horasSemana}h por semana</strong>, ${periodo} · ${f.repousosSemana} ${f.repousosSemana > 1 ? 'folgas' : 'folga'} por semana`;
    const avisoEl = $('#fase-aviso');
    const planejando = !estado.data && hojeISO() < R.planejamento.dataPadraoMinima;
    avisoEl.hidden = !planejando;
    avisoEl.textContent = R.planejamento.aviso;
    $$('[data-ir-data]').forEach((b) => {
      const alvo = b.dataset.irData === 'hoje' ? hojeISO() : b.dataset.irData;
      b.setAttribute('aria-pressed', String(alvo === iso));
    });
  }
  function mudarData(iso) {
    estado.data = !iso || iso === dataPadrao() ? null : iso;
    salvar(); mostrarFase(); desenharEscala(); calcularTudo(); desenharRodizio();
    if (estado.aba === 'inicio') desenharAssist();
  }
  inputData.addEventListener('change', () => { if (inputData.value) mudarData(inputData.value); });
  $$('[data-ir-data]').forEach((b) => b.addEventListener('click', () => mudarData(b.dataset.irData === 'hoje' ? hojeISO() : b.dataset.irData)));
  $('#fase-abrir').addEventListener('click', () => {
    const p = $('#fase-painel');
    p.hidden = !p.hidden;
    $('#fase-abrir').setAttribute('aria-expanded', String(!p.hidden));
    if (!p.hidden) inputData.focus();
  });

  /* ---------- rotas e abas ---------- */
  const botoesAba = $$('[role="tab"]');
  function abrirAba(id, focar) {
    if (!ROTAS.includes(id)) id = 'inicio';
    estado.aba = id;
    const noAssist = id === 'inicio';
    document.body.classList.toggle('modo-assist', noAssist);
    $('#ver').hidden = true;
    $('#abas').hidden = noAssist;
    $('#inicio').hidden = !noAssist;
    botoesAba.forEach((b) => {
      const ativa = b.dataset.aba === id;
      b.setAttribute('aria-selected', String(ativa));
      b.tabIndex = ativa || (noAssist && b === botoesAba[0]) ? 0 : -1;
      if (ativa && focar) b.focus();
    });
    FERRAMENTAS.forEach((a) => { $('#' + a).hidden = a !== id; });
    if (location.hash !== '#' + id) history.replaceState(null, '', '#' + id);
    if (noAssist) desenharAssist();
    if (id === 'escala') desenharEscala(), calcularEscala();
    if (id === 'rodizio') desenharRodizio();
    salvar();
  }
  botoesAba.forEach((b, i) => {
    b.addEventListener('click', () => abrirAba(b.dataset.aba));
    b.addEventListener('keydown', (ev) => {
      let j = null;
      if (ev.key === 'ArrowRight') j = (i + 1) % botoesAba.length;
      if (ev.key === 'ArrowLeft') j = (i - 1 + botoesAba.length) % botoesAba.length;
      if (ev.key === 'Home') j = 0;
      if (ev.key === 'End') j = botoesAba.length - 1;
      if (j != null) { ev.preventDefault(); abrirAba(botoesAba[j].dataset.aba, true); }
    });
  });
  window.addEventListener('hashchange', () => {
    if (location.hash.startsWith('#ver=')) mostrarVer(location.hash.slice(5));
    else abrirAba(location.hash.slice(1));
    window.scrollTo(0, 0);
  });

  /* ---------- imprimir ---------- */
  document.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-imprimir]');
    if (!b) return;
    document.body.dataset.imprimir = b.dataset.imprimir;
    window.print();
  });
  window.addEventListener('afterprint', () => { delete document.body.dataset.imprimir; });

  /* =========================================================
     1. QUANTO VALE A HORA
     ========================================================= */
  function calcularHora() {
    const cs = conferirSalario(estado.salario);
    const sal = cs.v;
    const x = valor(estado.horasExtras);
    const erro = $('#h-salario-erro');
    const ok = cs.ok;
    erro.textContent = cs.msg || (estado.salario && cs.vazio ? 'Escreva o salário só com números, por exemplo 3.000,00.' : '');
    $$('#a-salario-erro').forEach((e) => { e.textContent = erro.textContent; });
    $('#a-salario').setAttribute('aria-invalid', String(!!erro.textContent));
    $('#h-salario').setAttribute('aria-invalid', String(!!erro.textContent));
    const qtd = Number.isFinite(x) && x > 0 ? x : 0;
    $('#h-col-x').textContent = `${horas(qtd * 60)} extras no mês (50%)`;
    const atual = faseAtual();
    const ad = R.horaExtra;
    $('#h-tabela tbody').innerHTML = R.fases.map((f) => {
      const h = ok ? sal / f.divisor : 0;
      const marca = f === atual ? ' class="atual"' : '';
      return `<tr${marca}>
        <th scope="row">${f.horasSemana}h por semana<span class="tabela__sub">divisor ${f.divisor}${f === atual ? ' · vale na data escolhida' : ''}</span></th>
        <td data-rot="Hora normal">${ok ? R$(h) : '–'}</td>
        <td data-rot="Hora extra 50%">${ok ? R$(h * (1 + ad.adicional)) : '–'}</td>
        <td data-rot="Hora extra 100%">${ok ? R$(h * (1 + ad.adicionalDobro)) : '–'}</td>
        <td data-rot="${horas(qtd * 60)} extras no mês">${ok ? R$(h * (1 + ad.adicional) * qtd) : '–'}</td>
      </tr>`;
    }).join('');
  }

  /* =========================================================
     2. ESCALA DA SEMANA
     ========================================================= */
  function analisarPessoa(p, fase, conv30) {
    const dias = p.dias.map((d, i) => {
      if (d.folga) return { i, folga: true };
      const e = paraMin(d.ent);
      const s = paraMin(d.sai);
      if (e == null || s == null) return { i, folga: false, vazio: true };
      let dur = s - e;
      if (dur <= 0) dur += 1440; // passa da meia-noite
      const intv = Math.max(0, valor(d.int) || 0);
      const liq = Math.max(0, dur - intv);
      return { i, folga: false, ini: i * 1440 + e, fim: i * 1440 + e + dur, dur, intv, liq };
    });

    const avisos = [];
    const trab = dias.filter((d) => !d.folga && !d.vazio);
    const total = trab.reduce((s, d) => s + d.liq, 0);
    const folgas = dias.filter((d) => d.folga).length;
    const limiteSem = fase.horasSemana * 60;

    if (total > limiteSem) {
      avisos.push(`Passou do limite da semana: ${horas(total)} de ${fase.horasSemana}h. As ${horas(total - limiteSem)} a mais são hora extra (pelo menos 50% a mais).`);
    }
    if (folgas < fase.repousosSemana) {
      const r = fase.repousosSemana;
      avisos.push(`${folgas === 0 ? 'Nenhuma folga' : `Só ${folgas} folga`} na semana. O mínimo é ${r} ${r > 1 ? 'folgas' : 'folga'}. Trabalho no dia de repouso sem folga na semana é pago em dobro.`);
    }
    dias.forEach((d) => {
      if (d.vazio) avisos.push(`${DIAS[d.i]}: falta escrever a entrada e a saída, ou marcar folga.`);
    });
    trab.forEach((d) => {
      const nome = DIAS[d.i];
      const minimo = intervaloMinimo(d.liq, conv30);
      if (d.intv < minimo) {
        avisos.push(`${nome}: intervalo curto. Com ${horas(d.liq)} de trabalho, o intervalo mínimo é de ${minimo >= 60 ? horas(minimo) : minimo + ' minutos'}${d.intv ? `, e está com ${d.intv} minutos` : ''}.`);
      }
      if (d.liq > fase.limiteDiaMin + R.horaExtra.limiteDiaMin) {
        avisos.push(`${nome}: ${horas(d.liq)} no dia. Passou das 2h extras permitidas por dia.`);
      } else if (d.liq > fase.limiteDiaMin) {
        avisos.push(`${nome}: ${horas(d.liq)} no dia, ${fase.alertaDia}`);
      }
    });
    // descanso entre jornadas, inclusive do domingo para a segunda
    for (let i = 0; i < 7; i++) {
      const a = dias[i];
      const j = (i + 1) % 7;
      const b = dias[j];
      if (a.folga || a.vazio || b.folga || b.vazio) continue;
      const inicioProx = b.ini + (j === 0 ? 7 * 1440 : 0);
      const pausa = inicioProx - a.fim;
      if (pausa < R.descanso.entreJornadasMin) {
        avisos.push(`De ${DIAS_NOME[i]} para ${DIAS_NOME[j]}: só ${horas(Math.max(0, pausa))} de descanso entre uma jornada e outra. O mínimo é ${horas(R.descanso.entreJornadasMin)}.`);
      }
    }
    return { dias, total, folgas, avisos };
  }

  // Turnos prontos (Manhã, Tarde, Integral) pela fase atual e pelo horário do negócio.
  function turnosProntos() {
    const fase = faseAtual();
    const T = R.turnosProntos;
    const pres = fase.limiteDiaMin + T.intervaloMin;
    const a = estado.assist;
    const abre = (a.negocio && paraMin(a.abre)) ?? paraMin(T.manhaInicio);
    const fecha = (a.negocio && paraMin(a.fecha)) ?? paraMin(T.tardeFim);
    const integral = paraMin(T.integralInicio);
    const lim = fase.limiteDiaMin;
    const t = (nome, ini, fim) => { const x = montarTurno(nome, ini, fim, T.intervaloMin, lim, 'cheio'); return { nome, ent: x.ent, sai: x.sai, int: x.int }; };
    const fechaR = piso15(fecha);
    return [
      t('Manhã', abre, teto15(abre) + pres),
      t('Tarde', fechaR - pres, fechaR),
      t('Integral', integral, teto15(integral) + pres)
    ];
  }

  function desenharEscala() {
    const caixa = $('#e-pessoas');
    const tp = turnosProntos();
    caixa.innerHTML = estado.pessoas.map((p, pi) => `
      <article class="pessoa" data-p="${pi}">
        <div class="pessoa__cab">
          <div class="campo campo--nome">
            <label for="e-nome-${p.id}">Nome${p.turno ? ` <span class="pessoa__turno">turno: ${esc(p.turno)}</span>` : ''}</label>
            <input id="e-nome-${p.id}" data-pf="nome" value="${esc(p.nome)}" autocomplete="off">
          </div>
          <div class="prontos" role="group" aria-label="Turnos prontos para ${esc(p.nome)}">
            <span class="prontos__rot">Preencher os dias de trabalho com:</span>
            ${tp.map((t, i) => `<button type="button" class="chip chip--mini" data-pronto="${i}">${t.nome} <small>${t.ent}–${t.sai}</small></button>`).join('')}
          </div>
          <p class="pessoa__total" data-out="total"></p>
          <ul class="avisos" data-out="avisos"></ul>
          ${estado.pessoas.length > 1 ? `<button type="button" class="btn-icone" data-remover="${pi}" aria-label="Tirar ${esc(p.nome)} da escala">${icone('fechar')}</button>` : ''}
        </div>
        <ol class="dias">
          ${p.dias.map((d, di) => `
            <li class="dia${d.folga ? ' dia--folga' : ''}${di === 6 ? ' dia--dom' : ''}" data-d="${di}">
              <div class="dia__cab">
                <span class="dia__nome">${DIAS[di]}</span>
                <label class="chk chk--mini"><input type="checkbox" data-df="folga" ${d.folga ? 'checked' : ''}> Folga</label>
              </div>
              <div class="dia__campos">
                <label>Entrada<input type="time" data-df="ent" value="${esc(d.ent)}"></label>
                <label>Saída<input type="time" data-df="sai" value="${esc(d.sai)}"></label>
                <label>Intervalo (min)<input data-df="int" inputmode="numeric" value="${esc(d.int)}"></label>
              </div>
              <p class="dia__horas" data-out="horas"></p>
              <button type="button" class="copiar" data-copiar="${di}">Copiar este horário para os outros dias de trabalho</button>
            </li>`).join('')}
        </ol>
      </article>`).join('');
    const max = R.maxPessoasNaEscala;
    $('#e-add').disabled = estado.pessoas.length >= max;
    $('#e-add-nota').textContent = estado.pessoas.length >= max ? `A escala vai até ${max} pessoas.` : `${estado.pessoas.length} de ${max} pessoas.`;
  }

  const necessidadeDia = (ds) => { const d = estado.eqDias[ds]; return d && d.aberto ? Math.max(0, Math.round(valor(d.pessoas) || 0)) : 0; };

  function calcularEscala() {
    const fase = faseAtual();
    const cont = Array(7).fill(0);
    estado.pessoas.forEach((p, pi) => {
      const art = $(`.pessoa[data-p="${pi}"]`);
      if (!art) return;
      const r = analisarPessoa(p, fase, estado.conv30);
      r.dias.forEach((d) => {
        const li = $(`.dia[data-d="${d.i}"]`, art);
        li.classList.toggle('dia--folga', !!d.folga);
        const bl = p.dias[d.i].blocos;
        $('[data-out="horas"]', li).textContent = d.folga ? 'Folga' : d.vazio ? 'Sem horário'
          : `${bl ? bl.map((b) => `${b[0]}–${b[1]}`).join(' e ') + ': ' : ''}${horas(d.liq)} no dia${d.intv === 0 ? ', sem intervalo' : ''}`;
        if (!d.folga && !d.vazio) cont[d.i]++;
      });
      $('[data-out="total"]', art).innerHTML = `<strong>${horas(r.total)}</strong> na semana · ${r.folgas} ${r.folgas === 1 ? 'folga' : 'folgas'}`;
      $('[data-out="avisos"]', art).innerHTML = r.avisos.length
        ? r.avisos.map((a) => aviso(a)).join('')
        : aviso(`Tudo certo pelas regras de ${fase.horasSemana}h.`, 'ok');
    });
    $('#e-cobertura').innerHTML = cont.map((n, i) => {
      const precisa = necessidadeDia(i);
      const falta = n < precisa;
      return `<li class="${i === 6 ? 'dom' : ''}${falta ? ' falta' : ''}"><span>${DIAS[i]}</span><strong>${n}</strong>${precisa ? `<small>de ${precisa}</small>` : ''}</li>`;
    }).join('');
  }

  function soltarDoRodizioAutomatico(p) {
    if (!p.ciclo) return;
    p.ciclo = null;
    p.cicloInicio = null;
    Object.values(estado.rodAuto).forEach((m) => { delete m[p.id]; });
    estado.rodReparado = {};
  }

  $('#e-pessoas').addEventListener('input', (ev) => {
    const el = ev.target;
    const art = el.closest('.pessoa');
    if (!art) return;
    const p = estado.pessoas[Number(art.dataset.p)];
    if (el.dataset.pf === 'nome') {
      p.nome = el.value;
      const rm = $('[data-remover]', art);
      if (rm) rm.setAttribute('aria-label', `Tirar ${p.nome} da escala`);
    } else if (el.dataset.df) {
      const d = p.dias[Number(el.closest('.dia').dataset.d)];
      d[el.dataset.df] = el.type === 'checkbox' ? el.checked : el.value;
      if (el.dataset.df === 'folga') soltarDoRodizioAutomatico(p);
      else d.blocos = null;
    } else return;
    salvar();
    calcularEscala();
    calcularTudo();
  });
  $('#e-pessoas').addEventListener('click', (ev) => {
    const art = ev.target.closest('.pessoa');
    if (!art) return;
    const pi = Number(art.dataset.p);
    const p = estado.pessoas[pi];
    const rm = ev.target.closest('[data-remover]');
    const pronto = ev.target.closest('[data-pronto]');
    const copiar = ev.target.closest('[data-copiar]');
    if (rm) {
      if (!confirm(`Tirar ${p.nome} da escala?`)) return;
      estado.pessoas.splice(pi, 1);
    } else if (pronto) {
      p.dias.forEach((d) => { if (!d.folga) d.blocos = null; });
      const t = turnosProntos()[Number(pronto.dataset.pronto)];
      p.dias.forEach((d) => { if (!d.folga) Object.assign(d, { ent: t.ent, sai: t.sai, int: t.int }); });
    } else if (copiar) {
      const o = p.dias[Number(copiar.dataset.copiar)];
      p.dias.forEach((d) => { if (!d.folga) Object.assign(d, { ent: o.ent, sai: o.sai, int: o.int, blocos: o.blocos || null }); });
    } else return;
    salvar(); desenharEscala(); calcularTudo();
    const alvo = rm ? $('#e-add') : $(`.pessoa[data-p="${pi}"] ${pronto ? `[data-pronto="${pronto.dataset.pronto}"]` : `[data-copiar="${copiar.dataset.copiar}"]`}`);
    if (alvo) alvo.focus();
  });
  $('#e-add').addEventListener('click', () => {
    if (estado.pessoas.length >= R.maxPessoasNaEscala) return;
    estado.pessoas.push(novaPessoa(estado.pessoas.length + 1));
    salvar(); desenharEscala(); calcularTudo();
    const campos = $$('.pessoa [data-pf="nome"]');
    const novo = campos[campos.length - 1];
    if (novo) { novo.focus(); novo.select(); }
  });

  /* =========================================================
     3. RODÍZIO DO MÊS
     ========================================================= */
  const chaveDeISO = (iso) => iso.slice(0, 7);
  const chaveMes = (ano, mes) => `${ano}-${pad(mes)}`;

  // Folga pela escala base: o rodízio automático (ciclo de semanas) ou o padrão da escala da semana.
  function baseFolga(p, iso) {
    const ds = dsDe(iso);
    if (p.ciclo && p.cicloInicio) {
      const P = p.ciclo.length;
      const w = ((Math.floor(diasEntre(p.cicloInicio, iso) / 7) % P) + P) % P;
      return !!p.ciclo[w][ds];
    }
    return !!p.dias[ds].folga;
  }
  const lerMapa = (mapa, p, iso) => {
    const v = ((mapa[chaveDeISO(iso)] || {})[p.id] || {})[Number(iso.slice(8))];
    return v == null ? null : v === 'T';
  };
  const trabalhaAuto = (p, iso) => { const a = lerMapa(estado.rodAuto, p, iso); return a != null ? a : !baseFolga(p, iso); };
  const trabalhaEm = (p, iso) => { const e = lerMapa(estado.rodEdicoes, p, iso); return e != null ? e : trabalhaAuto(p, iso); };
  function gravar(mapa, p, iso, trab, referencia) {
    const k = chaveDeISO(iso);
    const dia = Number(iso.slice(8));
    mapa[k] = mapa[k] || {};
    const ed = (mapa[k][p.id] = mapa[k][p.id] || {});
    if (trab === referencia) delete ed[dia];
    else ed[dia] = trab ? 'T' : 'F';
  }
  const definirAuto = (p, iso, trab) => gravar(estado.rodAuto, p, iso, trab, !baseFolga(p, iso));
  const definirEdicao = (p, iso, trab) => gravar(estado.rodEdicoes, p, iso, trab, trabalhaAuto(p, iso));

  const janelaDomingo = () => R.descanso.domingoACadaSemanas[estado.atividade] || R.descanso.domingoACadaSemanas.outras;

  function maiorSequencia(p, de, ate) {
    let maior = 0, atual = 0;
    for (let iso = de; iso <= ate; iso = addDias(iso, 1)) {
      atual = trabalhaEm(p, iso) ? atual + 1 : 0;
      if (atual > maior) maior = atual;
    }
    return maior;
  }

  // Confere o mês de uma pessoa: folgas, dias seguidos (com os 6 dias do mês anterior) e domingos.
  function checarMes(p, ano, mes) {
    const isos = diasDoMes(ano, mes);
    const minimo = minimoFolgasMes(ano, mes);
    const janela = janelaDomingo();
    const dias = isos.map((iso) => ({ iso, dia: Number(iso.slice(8)), ds: dsDe(iso), trab: trabalhaEm(p, iso) }));
    const folgas = dias.filter((d) => !d.trab).length;

    const anteriores = [];
    for (let k = 6; k >= 1; k--) { const iso = addDias(isos[0], -k); anteriores.push({ iso, trab: trabalhaEm(p, iso) }); }
    const sequencia = [...anteriores, ...dias];
    let maior = 0, atual = 0, inicio = null, iniMaior = null, fimMaior = null;
    sequencia.forEach((d, i) => {
      if (d.trab) {
        if (atual === 0) inicio = d.iso;
        atual++;
        if (i >= anteriores.length && atual > maior) { maior = atual; iniMaior = inicio; fimMaior = d.iso; }
      } else atual = 0;
    });
    const trecho = () => (chaveDeISO(iniMaior) === chaveDeISO(fimMaior)
      ? `do dia ${Number(iniMaior.slice(8))} ao dia ${Number(fimMaior.slice(8))}`
      : `de ${diaMesBR(iniMaior)} a ${diaMesBR(fimMaior)}, contando o fim do mês anterior`);

    const doms = dias.filter((d) => d.ds === 6);
    const domFolga = doms.filter((d) => !d.trab).length;
    let semDomingo = null;
    for (let i = 0; i + janela <= doms.length; i++) {
      if (doms.slice(i, i + janela).every((d) => d.trab)) { semDomingo = doms.slice(i, i + janela); break; }
    }

    const problemas = [];
    const oks = [];
    if (folgas >= minimo) oks.push(`${plural(folgas, 'folga', 'folgas')} no mês. O mínimo é ${minimo}.`);
    else problemas.push(`Só ${plural(folgas, 'folga', 'folgas')} no mês. O mínimo é ${minimo}: ${minimo - folgas === 1 ? 'falta 1' : `faltam ${minimo - folgas}`}.`);
    if (maior > R.descanso.maxDiasSeguidos) problemas.push(`${maior} dias seguidos de trabalho (${trecho()}). O máximo é ${R.descanso.maxDiasSeguidos}.`);
    else if (maior === R.descanso.maxDiasSeguidos) problemas.push(`${maior} dias seguidos de trabalho (${trecho()}). Só vale com regime de compensação previsto na convenção.`);
    else oks.push(`No máximo ${plural(maior, 'dia seguido', 'dias seguidos')} de trabalho.`);
    if (semDomingo) problemas.push(`Trabalha ${janela} domingos seguidos (dias ${semDomingo.map((d) => d.dia).join(', ')}). ${estado.atividade === 'comercio' ? 'No comércio' : 'Nesta atividade'}, a folga tem que cair no domingo pelo menos 1 vez a cada ${janela} semanas.`);
    else if (doms.length) oks.push(`${domFolga} de ${doms.length} domingos de folga.`);    return { dias, folgas, minimo, maior, problemas, oks };
  }

  function preencherSelectsMes() {
    const opMes = MESES.map((m, i) => `<option value="${i + 1}">${m}</option>`).join('');
    const anoHoje = new Date().getFullYear();
    const anos = [];
    for (let a = Math.min(anoHoje, 2026); a <= Math.max(anoHoje, 2026) + 3; a++) anos.push(a);
    [estado.rodAno, estado.assist.ano].forEach((a) => { if (!anos.includes(a)) anos.push(a); });
    const opAno = anos.sort().map((a) => `<option value="${a}">${a}</option>`).join('');
    $('#r-mes').innerHTML = opMes;
    $('#r-ano').innerHTML = opAno;
  }

  function textoRegrasDoMes(ano, mes) {
    const fases = fasesDoMes(ano, mes);
    const minimo = minimoFolgasMes(ano, mes);
    const nDias = diasNoMes(ano, mes);
    const janela = janelaDomingo();
    const regras = fases.length > 1
      ? `Este mês junta duas fases (${fases.map((f) => `${f.fase.horasSemana}h de ${diaMesBR(f.de)} a ${diaMesBR(f.ate)}`).join(' e ')}), então o mínimo de folgas é proporcional:`
      : `Pelas regras de ${fases[0].fase.horasSemana}h,`;
    return `<p><strong>${maiuscula(mesNome(mes, ano))}</strong> tem ${nDias} dias. ${regras} cada pessoa precisa de pelo menos <strong>${minimo} folgas</strong> no mês e de uma folga no domingo a cada ${janela} semanas${estado.atividade === 'comercio' ? ' (comércio)' : ''}.</p>`;
  }

  // Mês em que a regra muda (dezembro/2026, dezembro/2027): aviso acima do rodízio.
  function textoTransicao(ano, mes) {
    const fases = fasesDoMes(ano, mes);
    if (fases.length < 2) return '';
    const nova = fases[1].de;
    const ds = dsDe(nova);
    return `<p class="transicao">Até ${diaMesBR(fases[0].ate)} sua escala atual pode continuar. A nova regra começa ${ds >= 5 ? 'no' : 'na'} ${DIAS_COMPLETO[ds]}, ${dataBR(nova)}.</p>`;
  }

  const textoFalta = (f) => `${f.porSemana === 1 ? 'Falta' : 'Faltam'} <strong>${pessoasDia(f.porSemana)}</strong> por semana em ${lista(f.dias.map((d) => DIAS_NOME[d]))}.`;

  function textoFeriados(ano, mes) {
    const fer = diasDoMes(ano, mes).map((iso) => ({ iso, nome: feriadoEm(iso) })).filter((f) => f.nome);
    if (!fer.length) return '';
    return `<ul class="avisos">${aviso(`Feriado${fer.length > 1 ? 's' : ''} no mês: ${lista(fer.map((f) => `${diaMesBR(f.iso)} (${f.nome})`))}. ${R.feriados.aviso}`, 'info')}</ul>`;
  }

  function desenharRodizio() {
    const ano = estado.rodAno;
    const mes = estado.rodMes;
    const key = chaveMes(ano, mes);
    if (estado.pessoas.some((p) => p.ciclo) && !estado.rodReparado[key]) { repararAte(ano, mes); salvar(); }
    const vazio = dsDe(isoDe(ano, mes, 1));
    const automatico = estado.pessoas.some((p) => p.ciclo);
    $('#r-intro').textContent = automatico
      ? 'Este rodízio veio do assistente, com os domingos de folga girando entre as pessoas. Toque num dia para trocar entre trabalho e folga. Os feriados têm uma estrela.'
      : 'O mês começa igual à escala da semana. Toque num dia para trocar entre trabalho e folga. Os domingos ficam em amarelo e os feriados têm uma estrela.';

    $('#r-resumo').innerHTML = textoTransicao(ano, mes) + textoRegrasDoMes(ano, mes) + textoFeriados(ano, mes);

    $('#r-pessoas').innerHTML = estado.pessoas.map((p) => {
      const c = checarMes(p, ano, mes);
      const avisos = [...c.problemas.map((t) => aviso(t)), ...c.oks.map((t) => aviso(t, 'ok'))];
      const celulas = [];
      for (let i = 0; i < vazio; i++) celulas.push('<li class="cal__vazio" aria-hidden="true"></li>');
      c.dias.forEach((d) => {
        const base = p.dias[d.ds];
        const fer = feriadoEm(d.iso);
        const editado = lerMapa(estado.rodEdicoes, p, d.iso) != null;
        const txt = d.trab ? (!base.folga && paraMin(base.ent) != null ? base.ent.replace(':', 'h').replace('h00', 'h') : 'Trab.') : 'Folga';
        celulas.push(`<li><button type="button" class="cal__dia${d.trab ? '' : ' cal__dia--folga'}${d.ds === 6 ? ' cal__dia--dom' : ''}${fer ? ' cal__dia--feriado' : ''}${editado ? ' cal__dia--editado' : ''}" data-pid="${p.id}" data-iso="${d.iso}" aria-label="${d.dia} de ${MESES[mes - 1]}, ${DIAS_NOME[d.ds]}${fer ? `, feriado (${fer})` : ''}: ${d.trab ? 'trabalho' : 'folga'}. Tocar para trocar."><span class="cal__num">${d.dia}${fer ? '<span class="cal__fer" aria-hidden="true">★</span>' : ''}</span><span class="cal__txt">${txt}</span></button></li>`);
      });
      return `<article class="pessoa pessoa--mes">
        <div class="pessoa__cab">
          <h3 class="pessoa__nome">${esc(p.nome || 'Sem nome')}${p.turno ? ` <span class="pessoa__turno">${esc(p.turno)}</span>` : ''}</h3>
          <ul class="avisos">${avisos.join('')}</ul>
        </div>
        <div class="cal">
          <ol class="cal__sem" aria-hidden="true">${DIAS.map((d, i) => `<li class="${i === 6 ? 'dom' : ''}">${d}</li>`).join('')}</ol>
          <ol class="cal__grade">${celulas.join('')}</ol>
        </div>
      </article>`;
    }).join('');
  }

  $('#r-pessoas').addEventListener('click', (ev) => {
    const b = ev.target.closest('.cal__dia');
    if (!b) return;
    const p = estado.pessoas.find((x) => x.id === b.dataset.pid);
    if (!p) return;
    const iso = b.dataset.iso;
    definirEdicao(p, iso, !trabalhaEm(p, iso));
    salvar();
    desenharRodizio();
    const igual = $(`.cal__dia[data-pid="${p.id}"][data-iso="${iso}"]`);
    if (igual) igual.focus();
  });
  $('#r-recopiar').addEventListener('click', () => {
    if (!confirm('Desfazer as mudanças feitas à mão neste mês?')) return;
    delete estado.rodEdicoes[chaveMes(estado.rodAno, estado.rodMes)];
    salvar(); desenharRodizio();
  });

  /* =========================================================
     GERADOR AUTOMÁTICO DE ESCALA E RODÍZIO
     ========================================================= */

  // Horário de cada turno do negócio, dentro do limite diário da fase.
  const intPara = (pres) => {
    for (const i of [0, 15, 60]) { const t = pres - i; if (t > 0 && i >= intervaloMinimo(t, false)) return i; }
    return 60;
  };

  /* Monta um turno com horários em múltiplos de 15 min: a entrada sobe, a saída desce,
     o intervalo sobe, e a saída recua até o trabalho caber no limite diário da fase.
     divisao: 'metade' (manhã e tarde dividem a necessidade do dia) ou 'cheio' (cada turno precisa da equipe toda). */
  function montarTurno(nome, ini, fim, int, lim, divisao) {
    const e = teto15(ini);
    let s = piso15(fim);
    let i = int > 0 ? teto15(int) : 0;
    for (let guarda = 0; guarda < 200; guarda++) {
      const liq = s - e - i;
      const minimo = intervaloMinimo(liq, false);
      if (i < minimo) { i = teto15(minimo); continue; }
      if (liq > lim) { s -= 15; continue; }
      break;
    }
    return { nome, ent: hhmm(e), sai: hhmm(s), int: String(i), liq: s - e - i, divisao };
  }

  // Intervalo que um turno único teria quando o negócio fecha no meio do dia (ou null).
  function intervaloDaPausa(neg, fase) {
    if (!neg.pausa) return null;
    const abre = paraMin(neg.abre) ?? 480;
    let fecha = paraMin(neg.fecha) ?? 1020;
    if (fecha <= abre) fecha += 1440;
    const pi = paraMin(neg.pausaIni);
    const pf = paraMin(neg.pausaFim);
    if (pi == null || pf == null || pf <= pi || pi <= abre || pf >= fecha) return null;
    return { abre, fecha, pi, pf, int: teto15(pf - pi) };
  }
  const horarioDoTurno = (t) => (t.blocos ? t.blocos.map((b) => `${b[0]}–${b[1]}`).join(' e ') : `${t.ent}–${t.sai}`);
  const textoIntervalo = (int) => (Number(int) ? `${horas(Number(int))} de intervalo` : 'sem intervalo');

  // Estrutura dos turnos, decidida pelo horário mais comum: um turno, Manhã/Tarde ou Almoço/Jantar.
  function estruturaDoNegocio(neg, fase) {
    const pausa = intervaloDaPausa(neg, fase);
    if (pausa) return pausa.int > R.intervaloMaximoSemAcordoMin && !neg.acordoIntervalo ? { tipo: 'dois', nomes: ['Almoço', 'Jantar'] } : { tipo: 'um' };
    if (Number(neg.turnos) === 2) return { tipo: 'dois', nomes: ['Manhã', 'Tarde'] };
    return { tipo: 'um' };
  }

  // Horário de cada turno num horário de funcionamento (abre/fecha), dentro do limite diário da fase.
  function turnosDoNegocio(neg, fase, est = estruturaDoNegocio(neg, fase)) {
    const lim = fase.limiteDiaMin;
    const abre = paraMin(neg.abre) ?? 480;
    let fecha = paraMin(neg.fecha) ?? 1020;
    if (fecha <= abre) fecha += 1440;
    const span = fecha - abre;
    if (est.tipo === 'dois') {
      // Dois turnos cheios que se sobrepõem: o primeiro começa na abertura, o segundo termina no fechamento.
      const pres = Math.min(span, lim + 60);
      const int = intPara(pres);
      return [
        montarTurno(est.nomes[0], abre, abre + pres, int, lim, 'metade'),
        montarTurno(est.nomes[1], fecha - pres, fecha, int, lim, 'metade')
      ];
    }
    const pausa = intervaloDaPausa(neg, fase);
    if (pausa) {
      // Com acordo (ou pausa curta): começa na abertura, para na pausa e volta na reabertura.
      const t = montarTurno('Integral', abre, Math.min(fecha, abre + pausa.int + lim), pausa.int, lim, 'cheio');
      if (Number(t.int) === pausa.int && paraMin(t.sai) > pausa.pf) t.blocos = [[t.ent, hhmm(pausa.pi)], [hhmm(pausa.pf), t.sai]];
      return [t];
    }
    const int = intPara(span);
    if (span - int > lim) return [montarTurno('Integral', abre, abre + lim + 60, 60, lim, 'cheio')];
    return [montarTurno('Integral', abre, fecha, int, lim, 'cheio')];
  }

  // Horário de cada dia do assistente (o dia sem horário próprio usa o mais comum).
  const horarioDia = (neg, i) => ({ abre: (neg.dias[i] && neg.dias[i].abre) || neg.abre, fecha: (neg.dias[i] && neg.dias[i].fecha) || neg.fecha });

  /* Turnos de cada dia da semana: dia curto = jornada curta. Depois garante as 11h entre o fim de um dia
     e o começo do seguinte no mesmo turno (inclusive de domingo para segunda), atrasando a entrada se preciso. */
  function turnosDaSemana(neg, fase) {
    const est = estruturaDoNegocio(neg, fase);
    const base = turnosDoNegocio(neg, fase, est);
    const lim = fase.limiteDiaMin;
    const porDia = neg.dias.map((d, i) => (d.aberto ? turnosDoNegocio({ ...neg, ...horarioDia(neg, i) }, fase, est) : null));
    for (let passada = 0; passada < 2; passada++) {
      for (let j = 0; j < base.length; j++) {
        for (let d = 0; d < 7; d++) {
          const a = porDia[d] && porDia[d][j];
          const e = (d + 1) % 7;
          const b = porDia[e] && porDia[e][j];
          if (!a || !b) continue;
          let fimA = paraMin(a.sai);
          if (fimA <= paraMin(a.ent)) fimA += 1440;
          const fimB = paraMin(b.sai);
          const inicio = teto15(fimA + R.descanso.entreJornadasMin - 1440);
          if (paraMin(b.ent) < inicio && inicio < fimB) {
            porDia[e][j] = montarTurno(b.nome, inicio, fimB, intPara(fimB - inicio), lim, b.divisao);
          }
        }
      }
    }
    return { base, porDia };
  }
  // Com dois turnos sobrepostos, a necessidade do dia é dividida: o turno que abre fica com a metade arredondada para cima.
  const necessidadeDoTurno = (n, turno) => (!turno || turno.divisao !== 'metade' ? n : ['Manhã', 'Almoço'].includes(turno.nome) ? Math.ceil(n / 2) : Math.floor(n / 2));

  const combinacoes = (arr, k) => (k <= 0 ? [[]] : arr.flatMap((x, i) => combinacoes(arr.slice(i + 1), k - 1).map((c) => [x, ...c])));
  const mascara = (dias) => { const m = Array(7).fill(false); dias.forEach((d) => { m[d] = true; }); return m; };
  function maiorSequenciaCiclo(semanas) {
    const s = semanas.flat();
    if (s.every((f) => !f)) return Infinity;
    let maior = 0, atual = 0;
    for (const f of [...s, ...s]) { atual = f ? 0 : atual + 1; if (atual > maior) maior = atual; }
    return maior;
  }

  /* Folgas de um grupo de n pessoas num ciclo de P semanas.
     Cada pessoa: um par de folgas nas semanas normais e, na sua semana de domingo, folga no domingo + 1 dia.
     Escolhe por busca local: primeiro cobrir a necessidade, depois espalhar a sobra (o dia mais fraco recebe mais folgas). */
  function gerarCiclo(n, need, aberto, P) {
    const LIM = R.descanso.maxDiasSeguidos - 1; // nunca chega a 6 seguidos
    const abertos = [0, 1, 2, 3, 4, 5, 6].filter((d) => aberto[d]);
    const fechados = [0, 1, 2, 3, 4, 5, 6].filter((d) => !aberto[d]);
    const completar = (base) => {
      const s = [...new Set(base)];
      const k = Math.max(0, 2 - s.length);
      return combinacoes(abertos.filter((d) => !s.includes(d)), k).map((c) => mascara([...s, ...c]));
    };
    const normais = completar(fechados);
    const comDomingo = aberto[6] && P > 1 ? completar([...fechados, 6]) : null;

    const opcoes = [];
    for (let i = 0; i < n; i++) {
      const g = i % P;
      let ops = comDomingo
        ? normais.flatMap((N) => comDomingo.map((S) => Array.from({ length: P }, (_, w) => (w === g ? S : N))))
        : normais.map((N) => Array.from({ length: P }, () => N));
      const validas = ops.filter((o) => maiorSequenciaCiclo(o) <= LIM);
      if (validas.length) ops = validas;
      opcoes.push(ops.length ? ops : [Array.from({ length: P }, () => mascara(fechados))]);
    }

    const trab = Array.from({ length: P }, () => Array(7).fill(0));
    const aplicar = (o, s) => { for (let w = 0; w < P; w++) for (let d = 0; d < 7; d++) if (aberto[d] && !o[w][d]) trab[w][d] += s; };
    const nota = (o) => {
      aplicar(o, 1);
      let falta = 0, menor = Infinity, soma = 0, soma2 = 0, cont = 0;
      for (let w = 0; w < P; w++) for (const d of abertos) {
        const sobra = trab[w][d] - need[d];
        if (sobra < 0) falta -= sobra;
        if (sobra < menor) menor = sobra;
        soma += sobra; soma2 += sobra * sobra; cont++;
      }
      aplicar(o, -1);
      const variancia = cont ? soma2 / cont - (soma / cont) ** 2 : 0;
      const folgasN = o[(P > 1 ? 1 : 0) % P].map((f, d) => (f ? d : -1)).filter((d) => d >= 0);
      const separado = folgasN.length === 2 && !(folgasN[1] - folgasN[0] === 1 || (folgasN[0] === 0 && folgasN[1] === 6)) ? 1 : 0;
      return [falta, -menor, Math.round(variancia * 1000), separado];
    };
    const melhor = (a, b) => { for (let i = 0; i < a.length; i++) { if (a[i] !== b[i]) return a[i] < b[i]; } return false; };

    const escolha = opcoes.map(() => 0);
    escolha.forEach((e, i) => aplicar(opcoes[i][e], 1));
    for (let passada = 0; passada < 12; passada++) {
      let mudou = false;
      for (let i = 0; i < n; i++) {
        aplicar(opcoes[i][escolha[i]], -1);
        let melhorJ = escolha[i];
        let melhorNota = nota(opcoes[i][melhorJ]);
        opcoes[i].forEach((o, j) => { const s = nota(o); if (melhor(s, melhorNota)) { melhorNota = s; melhorJ = j; } });
        if (melhorJ !== escolha[i]) { escolha[i] = melhorJ; mudou = true; }
        aplicar(opcoes[i][escolha[i]], 1);
      }
      if (!mudou) break;
    }
    const falta = trab.map((sem) => sem.map((t, d) => (aberto[d] ? Math.max(0, need[d] - t) : 0)));
    return { ciclos: escolha.map((e, i) => opcoes[i][e]), falta };
  }

  // Monta as pessoas (turno + ciclo de folgas). Com 2 turnos, testa todas as divisões da equipe.
  function gerarNegocio(neg, n, fase, P) {
    const aberto = neg.dias.map((d) => d.aberto);
    const semana = turnosDaSemana(neg, fase);
    const turnos = semana.base;
    const porDia = semana.porDia;
    // Necessidade por turno: a que o dono escreveu no passo 3 ou, sem ela, o total do dia dividido entre os turnos.
    const necT = neg.necPorTurno && neg.necPorTurno.length === turnos.length ? neg.necPorTurno : null;
    const need = necT
      ? aberto.map((ab, d) => (ab ? necT.reduce((s, arr) => s + (arr[d] || 0), 0) : 0))
      : neg.dias.map((d) => (d.aberto ? Math.max(0, Math.round(valor(d.pessoas) || 0)) : 0));
    const somaFalta = (f) => f.flat().reduce((s, x) => s + x, 0);
    if (turnos.length === 1) {
      const r = gerarCiclo(n, need, aberto, P);
      return { turnos, porDia, grupos: [{ turno: turnos[0], indice: 0, ciclos: r.ciclos, falta: r.falta, need }] };
    }
    const needM = necT ? necT[0].map((x, d) => (aberto[d] ? x : 0)) : need.map((x) => necessidadeDoTurno(x, turnos[0]));
    const needT = necT ? necT[1].map((x, d) => (aberto[d] ? x : 0)) : need.map((x) => necessidadeDoTurno(x, turnos[1]));
    const totalM = needM.reduce((s, x) => s + x, 0);
    const totalT = needT.reduce((s, x) => s + x, 0);
    let melhor = null;
    const ks = n >= 2 ? Array.from({ length: n - 1 }, (_, i) => i + 1) : [n];
    for (const k of ks) {
      const a = gerarCiclo(k, needM, aberto, P);
      const b = n - k > 0 ? gerarCiclo(n - k, needT, aberto, P) : { ciclos: [], falta: Array.from({ length: P }, () => needT.slice()) };
      const falta = somaFalta(a.falta) + somaFalta(b.falta);
      const desvio = Math.abs(k - (n * totalM) / Math.max(1, totalM + totalT));
      if (!melhor || falta < melhor.falta || (falta === melhor.falta && desvio < melhor.desvio)) {
        melhor = { falta, desvio, grupos: [
          { turno: turnos[0], indice: 0, ciclos: a.ciclos, falta: a.falta, need: needM },
          { turno: turnos[1], indice: 1, ciclos: b.ciclos, falta: b.falta, need: needT }
        ] };
      }
    }
    return { turnos, porDia, grupos: melhor.grupos };
  }

  /* Ajusta o mês para bater o mínimo de folgas: primeiro troca uma folga de lugar dentro da semana
     que vira o mês (sem mexer no total da semana); se não der, acrescenta uma folga no dia com mais gente sobrando. */
  function repararMes(ano, mes) {
    const isos = diasDoMes(ano, mes);
    const first = isos[0];
    const last = isos[isos.length - 1];
    const minimo = minimoFolgasMes(ano, mes);
    const LIM = R.descanso.maxDiasSeguidos - 1;
    const aberto = (iso) => { const d = estado.eqDias[dsDe(iso)]; return !d || d.aberto; };
    // Sobra de gente no dia, no turno da pessoa (com manhã e tarde, tirar alguém da manhã não pode deixar a manhã curta).
    const sobra = (iso, p) => {
      const ds = dsDe(iso);
      const nec = estado.necTurno && p && p.turno && estado.necTurno[p.turno];
      if (nec) return estado.pessoas.filter((q) => q.turno === p.turno && trabalhaEm(q, iso)).length - (nec[ds] || 0);
      return estado.pessoas.filter((q) => trabalhaEm(q, iso)).length - necessidadeDia(ds);
    };
    const folgasNoMes = (p, a, m) => diasDoMes(a, m).filter((iso) => !trabalhaEm(p, iso)).length;

    const bordas = [];
    const segIni = segundaDe(first);
    if (segIni < first) {
      const fora = []; const dentro = [];
      for (let i = 0; i < 7; i++) { const iso = addDias(segIni, i); (iso < first ? fora : dentro).push(iso); }
      bordas.push({ fora, dentro, outro: mesVizinho(ano, mes, -1) });
    }
    const segFim = segundaDe(last);
    if (addDias(segFim, 6) > last) {
      const fora = []; const dentro = [];
      for (let i = 0; i < 7; i++) { const iso = addDias(segFim, i); (iso > last ? fora : dentro).push(iso); }
      bordas.push({ fora, dentro, outro: mesVizinho(ano, mes, 1) });
    }

    for (const p of estado.pessoas) {
      if (!p.ciclo) continue;
      let folgas = folgasNoMes(p, ano, mes);
      for (let guarda = 0; folgas < minimo && guarda < 12; guarda++) {
        let melhor = null;
        for (const b of bordas) {
          const minOutro = minimoFolgasMes(...b.outro);
          for (const f of b.fora) {
            if (trabalhaEm(p, f) || dsDe(f) === 6 || !aberto(f)) continue;
            for (const t of b.dentro) {
              if (!trabalhaEm(p, t) || !aberto(t)) continue;
              definirAuto(p, f, true); definirAuto(p, t, false);
              const ok = maiorSequencia(p, addDias(first, -14), addDias(last, 14)) <= LIM && folgasNoMes(p, ...b.outro) >= minOutro;
              const nota = sobra(t, p) + 0.5;
              definirAuto(p, f, false); definirAuto(p, t, true);
              if (ok && (!melhor || nota > melhor.nota)) melhor = { nota, f, t };
            }
          }
        }
        for (const t of isos) {
          if (!trabalhaEm(p, t) || !aberto(t)) continue;
          definirAuto(p, t, false);
          const nota = sobra(t, p);
          definirAuto(p, t, true);
          if (!melhor || nota > melhor.nota) melhor = { nota, t };
        }
        if (!melhor) break;
        if (melhor.f) definirAuto(p, melhor.f, true);
        definirAuto(p, melhor.t, false);
        folgas = folgasNoMes(p, ano, mes);
      }
    }
    estado.rodReparado[chaveMes(ano, mes)] = true;
  }

  // Gera e grava a escala com o número de pessoas escolhido no passo 4 e atualiza a tela.
  /* Ajusta os meses em ordem, do primeiro mês gerado até o pedido, para cada mês considerar o anterior
     já ajustado. O ciclo não recomeça: trocar de mês só continua a mesma rotação. */
  function repararAte(ano, mes) {
    if (!estado.pessoas.some((p) => p.ciclo)) return;
    const ini = estado.cicloMes0 || { ano, mes };
    let [a, m] = ano * 12 + mes < ini.ano * 12 + ini.mes ? [ano, mes] : [ini.ano, ini.mes];
    while (a * 12 + m <= ano * 12 + mes) {
      if (!estado.rodReparado[chaveMes(a, m)]) repararMes(a, m);
      [a, m] = mesVizinho(a, m, 1);
    }
  }

  function gerarEscala() {
    const a = estado.assist;
    montarEscala(inteiro(a.nGerar || a.func, 1, R.maxPessoasNaEscala));
    salvar();
    preencherCampos();
    desenharEscala(); desenharEquipe(); calcularTudo();
  }

  // Monta a escala com n pessoas só no estado (sem desenhar nada). Usada também para achar o mínimo de funcionários.
  function montarEscala(n) {
    const a = estado.assist;
    const fase = faseAtual();
    const neg = negocioDoAssist(a, fase);
    const P = a.dias[6].aberto ? (R.descanso.domingoACadaSemanas[a.atividade] || R.descanso.domingoACadaSemanas.outras) : 1;
    const r = gerarNegocio(neg, n, fase, P);
    const inicio = segundaDe(isoDe(a.ano, a.mes, 1));
    const pessoas = [];
    r.grupos.forEach((g) => g.ciclos.forEach((ciclo) => {
      const i = pessoas.length;
      pessoas.push({
        id: novoId(),
        nome: (a.nomes[i] || '').trim() || `Pessoa ${i + 1}`,
        turno: r.turnos.length > 1 ? g.turno.nome : null,
        divisao: g.turno.divisao,
        dias: DIAS.map((_, d) => {
          const t = (r.porDia[d] && r.porDia[d][g.indice]) || g.turno;
          return { folga: ciclo[0][d], ent: t.ent, sai: t.sai, int: t.int, blocos: t.blocos || null };
        }),
        ciclo,
        cicloInicio: inicio
      });
    }));
    estado.pessoas = pessoas;
    estado.rodEdicoes = {};
    estado.rodAuto = {};
    estado.rodReparado = {};
    estado.rodMes = a.mes;
    estado.rodAno = a.ano;
    estado.cicloMes0 = { ano: a.ano, mes: a.mes }; // o ciclo começa aqui e continua igual nos meses seguintes
    estado.atividade = a.atividade;
    estado.necTurno = {};
    r.grupos.forEach((g) => { estado.necTurno[g.turno.nome] = g.need.slice(); });
    estado.eqDias = a.dias.map((d, i) => ({ aberto: d.aberto, pessoas: String(d.aberto ? r.grupos.reduce((s, g) => s + (g.need[i] || 0), 0) : 0) }));
    estado.func = String(n);
    estado.gerado = { turnos: r.turnos };
    repararMes(a.ano, a.mes);
    const falta = faltaDoMes(a.ano, a.mes);
    if (falta.porSemana > 0) {
      // Horas de cada pessoa-dia que falta: a média dos turnos que faltam (um domingo curto pesa menos).
      let soma = 0, peso = 0;
      falta.entradas.forEach((e) => {
        const idx = Math.max(0, r.turnos.findIndex((t) => t.nome === e.g));
        const t = (r.porDia[e.ds] && r.porDia[e.ds][idx]) || r.turnos[idx];
        const w = e.precisa - e.tem;
        soma += t.liq * w; peso += w;
      });
      estado.refTurnos = String(falta.porSemana);
      estado.refHoras = horas(peso ? Math.round(soma / peso / 15) * 15 : r.turnos[0].liq);
    }
    return r;
  }

  // Cobertura do mês: semana a semana, por turno quando há manhã e tarde.
  function faltaDoMes(ano, mes) {
    const isos = diasDoMes(ano, mes);
    const nomes = [...new Set(estado.pessoas.map((p) => p.turno).filter(Boolean))];
    const grupos = nomes.length ? nomes : [null];
    const divisao = (g) => (estado.pessoas.find((p) => p.turno === g) || {}).divisao;
    const nec = estado.necTurno || {};
    const precisa = (ds, g) => (g && nec[g] ? nec[g][ds] || 0 : !g && nec.Integral && estado.pessoas.every((p) => !p.turno) ? nec.Integral[ds] || 0
      : necessidadeDoTurno(necessidadeDia(ds), g ? { nome: g, divisao: divisao(g) } : null));
    const semanas = new Map();
    const dias = new Set();
    const mapa = new Map();
    for (const iso of isos) {
      const ds = dsDe(iso);
      let f = 0;
      for (const g of grupos) {
        const t = estado.pessoas.filter((p) => (g ? p.turno === g : true) && trabalhaEm(p, iso)).length;
        const pr = precisa(ds, g);
        f += Math.max(0, pr - t);
        anotarFalta(mapa, ds, g, pr, t);
      }
      if (f > 0) dias.add(ds);
      const k = segundaDe(iso);
      semanas.set(k, (semanas.get(k) || 0) + f);
    }
    const porSemana = Math.max(0, ...semanas.values());
    return { porSemana, dias: [...dias].sort((x, y) => x - y), itens: itensFalta(mapa, grupos), entradas: [...mapa.values()].filter((e) => e.curtas > 0) };
  }

  /* Falta em linguagem de dono: por dia e turno, "Segunda à tarde: precisa de 1, tem 0".
     Quando falta só em parte das semanas (por causa do rodízio de domingos), diz "em algumas semanas". */
  const DIAS_TITULO = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
  const TURNO_FRASE = { 'Manhã': 'de manhã', 'Tarde': 'à tarde', 'Almoço': 'no almoço', 'Jantar': 'no jantar' };
  function anotarFalta(mapa, ds, g, precisa, tem) {
    const k = `${ds}|${g || ''}`;
    const e = mapa.get(k) || { ds, g, precisa, tem: Infinity, curtas: 0, total: 0 };
    e.total++;
    e.tem = Math.min(e.tem, tem);
    if (tem < precisa) e.curtas++;
    mapa.set(k, e);
  }
  function itensFalta(mapa, grupos) {
    return [...mapa.values()].filter((e) => e.curtas > 0)
      .sort((a, b) => a.ds - b.ds || grupos.indexOf(a.g) - grupos.indexOf(b.g))
      .map((e) => `${DIAS_TITULO[e.ds]}${e.g && TURNO_FRASE[e.g] ? ' ' + TURNO_FRASE[e.g] : ''}: precisa de ${e.precisa}, tem ${e.tem}${e.curtas < e.total ? ' em algumas semanas' : ''}`);
  }
  const htmlFaltas = (itens) => `<ul class="faltas">${itens.map((t) => `<li>${t}</li>`).join('')}</ul>`;

  /* =========================================================
     ASSISTENTE
     ========================================================= */
  function aplicarModelo(id) {
    const m = R.modelos[id];
    Object.assign(estado.assist, {
      negocio: id,
      abre: m.abre, fecha: m.fecha,
      pausa: !!m.pausa,
      pausaIni: m.pausa ? m.pausa[0] : '15:00',
      pausaFim: m.pausa ? m.pausa[1] : '18:00',
      acordoIntervalo: false,
      atividade: m.atividade,
      // pessoas: total do dia no modelo, usado só para pré-preencher o passo 3; nec: o que o dono escreve por turno
      dias: m.dias.map((x, i) => {
        const h = (m.horarios && m.horarios[i]) || [m.abre, m.fecha];
        return { aberto: !!x, pessoas: String(m.pessoas[i]), abre: h[0], fecha: h[1], nec: {} };
      })
    });
  }

  /* O sistema decide os turnos sozinho: pelo dia mais longo, se a jornada máxima da fase cobre o dia inteiro
     é um turno; se não, dois (Manhã e Tarde). Pausa longa sem acordo vira Almoço e Jantar (estruturaDoNegocio). */
  function negocioDoAssist(a, fase = faseAtual()) {
    let maior = null;
    a.dias.forEach((d, i) => {
      if (!d.aberto) return;
      const h = horarioDia(a, i);
      const s = paraMin(h.abre);
      let f = paraMin(h.fecha);
      if (s == null || f == null) return;
      if (f <= s) f += 1440;
      if (!maior || f - s > maior.span) maior = { span: f - s, abre: h.abre, fecha: h.fecha };
    });
    const span = maior ? maior.span : 0;
    const neg = { ...a, abre: maior ? maior.abre : a.abre, fecha: maior ? maior.fecha : a.fecha, spanMaior: span };
    neg.turnos = span - intPara(span) > fase.limiteDiaMin ? '2' : '1';
    const nomes = turnosDoNegocio(neg, fase).map((t) => t.nome);
    neg.nomesTurnos = nomes;
    neg.necPorTurno = nomes.map((nome) => a.dias.map((d, i) => (d.aberto ? necessidadeAssist(a, i, nome, nomes) : 0)));
    return neg;
  }
  // Pessoas ao mesmo tempo num turno de um dia: o que o dono escreveu ou, sem isso, o total do modelo dividido entre os turnos.
  function necessidadeAssist(a, i, nome, nomes) {
    const d = a.dias[i];
    const v = d.nec && d.nec[nome];
    if (v != null && v !== '') return Math.max(0, Math.round(valor(v) || 0));
    const total = Math.max(0, Math.round(valor(d.pessoas) || 0));
    if (nomes.length < 2) return total;
    return nome === nomes[0] ? Math.ceil(total / 2) : Math.floor(total / 2);
  }

  function aoMudarAssist(el, tipo) {
    const a = estado.assist;
    const k = el.dataset.a;
    if (el.type === 'checkbox') a[k] = el.checked;
    else if (el.type === 'radio') { if (!el.checked) return; a[k] = el.value; }
    else if (k === 'mes' || k === 'ano') a[k] = Number(el.value);
    else a[k] = el.value;
    preencherCampos(el);
    salvar();
    if ((k === 'mes' || k === 'ano') && tipo === 'change') { desenharPronta(); return; }
    if (k === 'pausa') $('#a-pausa-campos').hidden = !a.pausa;
    mostrarPerguntaAcordo();
    if (k === 'func') { desenharNomes(); validarFunc(false); }
    if (a.passo === 4) desenharEquipeAssist();
  }

  function desenharNegocios() {
    $('#a-negocios').innerHTML = Object.entries(R.modelos).map(([id, m]) =>
      `<button type="button" class="negocio" data-neg="${id}" aria-pressed="${estado.assist.negocio === id}">${icone(id, 'ic ic--g')}<span>${m.nome}</span></button>`).join('');
    $('#a-form').hidden = !estado.assist.negocio;
    $('#a-p2-seguir').disabled = !estado.assist.negocio;
    $('#a-pausa-campos').hidden = !estado.assist.pausa;
    mostrarPerguntaAcordo();
  }
  // Pausa que daria intervalo maior que 2h: pergunta pelo acordo; sem ele, a escala usa Almoço e Jantar.
  function mostrarPerguntaAcordo() {
    const fase = faseAtual();
    const p = intervaloDaPausa(negocioDoAssist(estado.assist, fase), fase);
    const longo = !!p && p.int > R.intervaloMaximoSemAcordoMin;
    $('#a-acordo').hidden = !longo;
    if (longo) {
      $('#a-acordo-txt').textContent = `Com um turno só, o intervalo ficaria com ${horas(p.int)}. Acima de ${horas(R.intervaloMaximoSemAcordoMin)}, só com acordo escrito ou convenção. Sem isso, a escala usa dois turnos: Almoço e Jantar.`;
    }
  }
  function desenharDiasAssist() {
    const a = estado.assist;
    $('#a-dias').innerHTML = a.dias.map((d, i) => {
      const h = horarioDia(a, i);
      const off = d.aberto ? '' : 'disabled';
      return `
      <div class="dia-eq${d.aberto ? '' : ' dia-eq--fechado'}" data-i="${i}">
        <label class="chk"><input type="checkbox" data-ad="aberto" ${d.aberto ? 'checked' : ''}> ${DIAS[i]} abre</label>
        <div class="dia-eq__horario">
          <label>Abre<input type="time" data-ad="abre" value="${esc(h.abre)}" ${off} aria-label="Abre às, ${DIAS_NOME[i]}"></label>
          <label>Fecha<input type="time" data-ad="fecha" value="${esc(h.fecha)}" ${off} aria-label="Fecha às, ${DIAS_NOME[i]}"></label>
        </div>
      </div>`;
    }).join('');
  }
  $('#a-mesmo-horario').addEventListener('click', () => {
    const a = estado.assist;
    a.dias.forEach((d) => { d.abre = a.abre; d.fecha = a.fecha; });
    salvar(); desenharDiasAssist(); mostrarPerguntaAcordo();
  });
  $('#a-negocios').addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-neg]');
    if (!b) return;
    aplicarModelo(b.dataset.neg);
    salvar();
    desenharNegocios(); desenharDiasAssist(); preencherCampos();
    $(`[data-neg="${b.dataset.neg}"]`).focus();
  });
  $('#a-dias').addEventListener('input', (ev) => {
    const el = ev.target;
    const box = el.closest('.dia-eq');
    if (!box) return;
    const d = estado.assist.dias[Number(box.dataset.i)];
    if (el.dataset.ad === 'aberto') {
      d.aberto = el.checked;
      box.classList.toggle('dia-eq--fechado', !d.aberto);
      $$('input:not([type="checkbox"])', box).forEach((x) => { x.disabled = !d.aberto; });
    } else if (el.dataset.ad === 'abre' || el.dataset.ad === 'fecha') {
      if (el.value) d[el.dataset.ad] = el.value;
    }
    salvar(); mostrarPerguntaAcordo();
  });

  function desenharNomes() {
    const a = estado.assist;
    const rec = (minimoCache && minimoCache.res && minimoCache.res.minimo) || 0;
    const n = Math.max(inteiro(a.func, 1, R.maxPessoasNaEscala), Math.min(rec, R.maxPessoasNaEscala));
    const caixa = $('#a-nomes');
    if (caixa.children.length === n) return;
    caixa.innerHTML = Array.from({ length: n }, (_, i) => `
      <div class="campo"><label for="a-nome-${i}">Pessoa ${i + 1}</label>
      <input id="a-nome-${i}" data-nome="${i}" value="${esc(estado.assist.nomes[i] || '')}" placeholder="Pessoa ${i + 1}" autocomplete="off"></div>`).join('');
  }
  $('#a-nomes').addEventListener('input', (ev) => {
    const i = ev.target.dataset.nome;
    if (i == null) return;
    estado.assist.nomes[Number(i)] = ev.target.value;
    salvar();
  });

  function validarFunc(mostrar) {
    const n = Math.round(valor(estado.assist.func));
    const ok = Number.isFinite(n) && n >= 1 && n <= R.maxPessoasNaEscala;
    const erro = $('#a-func-erro');
    if (mostrar || ok) erro.textContent = ok ? '' : `Escreva quantas pessoas entram na escala, de 1 a ${R.maxPessoasNaEscala}.`;
    $('#a-func').setAttribute('aria-invalid', String(!ok && !!erro.textContent));
    return ok;
  }

  function contaAssist() {
    const a = estado.assist;
    const neg = negocioDoAssist(a);
    const necessarios = neg.necPorTurno.flat().reduce((s, x) => s + x, 0);
    const func = Math.max(0, Math.round(valor(a.func) || 0));
    const disponiveis = func * R.equipe.diasPorFuncionario;
    return { necessarios, func, disponiveis, falta: necessarios - disponiveis };
  }

  function htmlConta(c, abertos, msgPrincipal) {
    let msg = msgPrincipal;
    if (msg) { /* mensagem já decidida (passo 3, pela escala gerada) */ }
    else if (c.falta > 0) msg = aviso(`${c.falta === 1 ? 'Falta' : 'Faltam'} <strong>${pessoasDia(c.falta)}</strong> por semana: reorganizar a escala, estender a jornada ou contratar reforço.`);
    else if (c.falta < 0) msg = aviso(`A equipe dá conta e ${c.falta === -1 ? 'sobra' : 'sobram'} ${pessoasDia(-c.falta)} por semana para cobrir férias e faltas.`, 'ok');
    else msg = aviso('A equipe dá conta certinho, sem sobra para cobrir férias e faltas.', 'ok');
    return `
      <dl class="numeros">
        <div><dt>Pessoas-dia necessárias</dt><dd>${c.necessarios}</dd><dd class="numeros__conta">soma das pessoas nos ${abertos} dias abertos</dd></div>
        <div><dt>Pessoas-dia disponíveis</dt><dd>${c.disponiveis}</dd><dd class="numeros__conta">${c.func} ${c.func === 1 ? 'funcionário' : 'funcionários'} × ${R.equipe.diasPorFuncionario} dias</dd></div>
        <div><dt>Diferença</dt><dd>${c.falta > 0 ? '−' + c.falta : '+' + (-c.falta)}</dd><dd class="numeros__conta">${Math.abs(c.falta) === 1 ? 'pessoa-dia' : 'pessoas-dia'} ${c.falta > 0 ? 'faltando' : 'sobrando'}</dd></div>
      </dl>
      <p class="dica">1 pessoa-dia = 1 pessoa trabalhando 1 dia.</p>
      <ul class="avisos">${msg}</ul>`;
  }

  /* ---------- passo 3: pessoas ao mesmo tempo, por turno ---------- */
  const NOME_NEGOCIO = { loja: 'Sua loja fica aberta', mercado: 'Seu mercado fica aberto', padaria: 'Sua padaria fica aberta', restaurante: 'Seu restaurante fica aberto', outro: 'Seu negócio fica aberto' };
  function desenharNecessidade() {
    const a = estado.assist;
    const fase = faseAtual();
    const neg = negocioDoAssist(a, fase);
    const turnos = turnosDoNegocio(neg, fase);
    const quem = NOME_NEGOCIO[a.negocio] || NOME_NEGOCIO.outro;
    const lista2 = turnos.map((t) => `${t.nome} (${horarioDoTurno(t)})`);
    const base = `${quem} até ${horas(neg.spanMaior)} por dia. Cada pessoa trabalha no máximo ${horas(fase.limiteDiaMin)} por dia nesta regra.`;
    $('#a-turnos-frase').textContent = turnos.length > 1
      ? `${base} Por isso a escala tem 2 turnos: ${lista2[0]} e ${lista2[1]}.`
      : `${base} Cada pessoa cobre o dia inteiro (${horarioDoTurno(turnos[0])}).`;
    const cols = turnos.length > 1 ? turnos.map((t) => t.nome) : ['Pessoas'];
    $('#a-nec').innerHTML = `
      <div class="nec-cab" aria-hidden="true"><span>Dia</span>${cols.map((c) => `<span>${c}</span>`).join('')}</div>
      ${a.dias.map((d, i) => {
        if (!d.aberto) return '';
        const h = horarioDia(a, i);
        return `<div class="nec-linha" data-i="${i}">
          <span class="nec-dia"><strong>${DIAS[i]}</strong> ${h.abre}–${h.fecha}</span>
          ${neg.nomesTurnos.map((nome, j) => `<label><span class="nec-rot">${cols[j]}</span><input data-nec="${esc(nome)}" inputmode="numeric" value="${necessidadeAssist(a, i, nome, neg.nomesTurnos)}" aria-label="${DIAS_NOME[i]}, ${turnos.length > 1 ? cols[j].toLowerCase() : 'pessoas ao mesmo tempo'}"></label>`).join('')}
        </div>`;
      }).join('')}`;
    $('#a-nec').style.setProperty('--cols', String(cols.length));
  }
  $('#a-nec').addEventListener('input', (ev) => {
    const el = ev.target;
    const linha = el.closest('.nec-linha');
    if (!linha || !el.dataset.nec) return;
    const d = estado.assist.dias[Number(linha.dataset.i)];
    d.nec = d.nec || {};
    d.nec[el.dataset.nec] = el.value;
    salvar();
  });

  /* ---------- passo 4: mínimo de funcionários ---------- */
  // Roda o gerador de verdade para n = 1..10 e fica com o menor n sem falta no mês escolhido. Não grava nada.
  let minimoCache = null;
  let atualCache = null;
  const chaveNegocio = (a) => JSON.stringify([a.dias, a.abre, a.fecha, a.pausa, a.pausaIni, a.pausaFim, a.acordoIntervalo, a.atividade, a.mes, a.ano, dataRef()]);
  // Gera com n pessoas sem gravar nada e devolve a falta do mês (e as horas de cada pessoa-dia que falta).
  function simular(n) {
    const foto = JSON.stringify(estado);
    try {
      montarEscala(n);
      const falta = faltaDoMes(estado.assist.ano, estado.assist.mes);
      const nomes = [...new Set(estado.pessoas.map((p) => p.turno).filter(Boolean))];
      return { falta, refTurnos: estado.refTurnos, refHoras: estado.refHoras, porTurno: nomes.map((nome) => ({ nome, n: estado.pessoas.filter((p) => p.turno === nome).length })) };
    } finally {
      estado = JSON.parse(foto);
    }
  }
  function calcularMinimo() {
    const a = estado.assist;
    const chave = chaveNegocio(a);
    if (!minimoCache || minimoCache.chave !== chave) {
      const res = { minimo: null, porTurno: [] };
      for (let n = 1; n <= R.maxPessoasNaEscala; n++) {
        const s = simular(n);
        if (s.falta.porSemana === 0) { res.minimo = n; res.porTurno = s.porTurno; break; }
      }
      minimoCache = { chave, res };
    }
    const res = { ...minimoCache.res, atual: null };
    const tem = Math.round(valor(estado.assist.func));
    if (tem >= 1 && tem <= R.maxPessoasNaEscala && (res.minimo == null || tem < res.minimo)) {
      const ch = chave + '|' + tem;
      if (!atualCache || atualCache.chave !== ch) atualCache = { chave: ch, s: simular(tem) };
      const s = atualCache.s;
      res.atual = { falta: s.falta, rc: s.falta.porSemana > 0 ? calcReforco({ pd: s.refTurnos, horas: s.refHoras }) : null };
    }
    return res;
  }

  const TURNO_DE = { 'Manhã': 'de manhã', 'Tarde': 'à tarde', 'Almoço': 'no almoço', 'Jantar': 'no jantar' };
  function desenharEquipeAssist() {
    if (estado.aba !== 'inicio') return;
    const a = estado.assist;
    const fase = faseAtual();
    const res = calcularMinimo();
    const domingo = a.dias[6].aberto ? ' e o domingo em rodízio' : '';
    const folgas = `${fase.repousosSemana} ${fase.repousosSemana > 1 ? 'folgas' : 'folga'} por semana`;
    const plur = (n) => `${n} ${n === 1 ? 'funcionário' : 'funcionários'}`;
    if (res.minimo == null) {
      $('#a-minimo').innerHTML = `<p class="minimo__frase">Com até ${R.maxPessoasNaEscala} pessoas não fecha; reduza o horário ou as pessoas por turno.</p>`;
    } else {
      const divisao = res.porTurno.length > 1 ? `: ${lista(res.porTurno.map((t) => `${t.n} ${TURNO_DE[t.nome] || t.nome.toLowerCase()}`))}` : '';
      $('#a-minimo').innerHTML = `<p class="minimo__frase">Para cobrir seu horário com ${folgas}${domingo}, você precisa de <strong>${plur(res.minimo)}</strong>${divisao}.</p>`;
    }

    // resposta para quem já tem uma equipe
    const tem = Math.round(valor(a.func));
    const valido = tem >= 1 && tem <= R.maxPessoasNaEscala;
    let resp = '';
    if (valido && res.minimo != null) {
      if (tem < res.minimo) {
        const falta = res.minimo - tem;
        const rc = res.atual && res.atual.rc;
        resp = `<p class="resposta__frase">Você tem ${tem}. ${falta === 1 ? 'Falta 1' : `Faltam ${falta}`} para cobrir tudo.</p>${rc ? (rc.erro ? `<p class="vazio">${rc.erro}</p>` : `<p class="recomendacao">${rc.recomendacao}</p>`) : ''}`;
      } else if (tem === res.minimo) {
        resp = '<p class="resposta__frase resposta__frase--ok">Sua equipe fecha certinho.</p>';
      } else {
        const sobra = tem - res.minimo;
        resp = `<p class="resposta__frase resposta__frase--ok">Você tem ${tem}, ${sobra} a mais do que precisa. Sobra gente para cobrir férias e faltas.</p>`;
      }
    } else if (valido && res.minimo == null && res.atual) {
      resp = `<p class="resposta__frase">Você tem ${tem}. Mesmo assim falta gente:</p>${htmlFaltas(res.atual.falta.itens)}`;
    }
    $('#a-resposta').innerHTML = resp;

    // botões de gerar
    const bTem = $('#a-gerar-tenho');
    const bRec = $('#a-gerar-rec');
    bTem.hidden = !valido || tem === res.minimo;
    bTem.textContent = `Gerar escala com os ${tem} que tenho`;
    bTem.dataset.n = String(tem);
    bRec.hidden = res.minimo == null;
    bRec.textContent = valido && tem === res.minimo ? `Gerar escala com os ${res.minimo}` : `Gerar escala com os ${res.minimo} recomendados`;
    bRec.dataset.n = String(res.minimo || '');

    // a conta de pessoas-dia, recolhida
    const c = contaAssist();
    const abertos = a.dias.filter((d) => d.aberto).length;
    $('#a-equipe').innerHTML = htmlConta(c, abertos);
  }

  function mostrarPasso(n, focar) {
    const a = estado.assist;
    a.passo = n;
    $$('.passo').forEach((el) => { el.hidden = Number(el.dataset.passo) !== n; });
    $$('#progresso li').forEach((li) => {
      const p = Number(li.dataset.p);
      li.classList.toggle('feito', p < n);
      if (p === n) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
    });
    if (n === 1) desenharRegra();
    if (n === 2) { desenharNegocios(); desenharDiasAssist(); }
    if (n === 3) desenharNecessidade();
    if (n === 4) { desenharEquipeAssist(); desenharNomes(); }
    if (n === 5) desenharPronta();
    preencherCampos();
    salvar();
    if (focar) {
      const h = $(`.passo[data-passo="${n}"] h2`);
      h.tabIndex = -1;
      h.focus({ preventScroll: true });
      $('#inicio').scrollIntoView({ block: 'start' });
    }
  }
  function desenharAssist() { mostrarPasso(estado.assist.passo || 1, false); }

  $('#inicio').addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-ir-passo]');
    if (!b) return;
    const n = Number(b.dataset.irPasso);
    if (n >= 3 && !estado.assist.negocio) return;
    mostrarPasso(n, true);
  });

  // Passo 1: a regra escolhida (42h ou 40h) define a data das regras e o mês do rodízio.
  function desenharRegra() {
    const h = faseAtual().horasSemana;
    $$('[data-regra]').forEach((r) => { r.checked = (r.value === '2026-12-16' && h === 42) || (r.value === '2027-12-16' && h === 40); });
  }
  $$('[data-regra]').forEach((r) => r.addEventListener('change', () => {
    if (!r.checked) return;
    const a = estado.assist;
    if (r.value === '2027-12-16') { a.ano = 2028; a.mes = 1; }
    else {
      const [ah, mh] = hojeISO().split('-').map(Number);
      let [ano, mes] = mesVizinho(ah, mh, 1);
      if (ano < 2026 || (ano === 2026 && mes < 12) || ano > 2027 || (ano === 2027 && mes === 12)) { ano = 2026; mes = 12; }
      a.ano = ano; a.mes = mes;
    }
    preencherSelectsMes();
    mudarData(r.value);
  }));

  // Passo 4: gerar com os que tem ou com os recomendados.
  $('#a-gerar-botoes').addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-gerar]');
    if (!b) return;
    const n = Number(b.dataset.n);
    if (!(n >= 1 && n <= R.maxPessoasNaEscala)) { validarFunc(true); $('#a-func').focus(); return; }
    estado.assist.nGerar = n;
    gerarEscala();
    mostrarPasso(5, true);
  });
  $('#a-recomecar').addEventListener('click', () => {
    if (!confirm('Recomeçar o assistente? A escala gerada continua salva até você gerar outra.')) return;
    estado.assist = assistPadrao();
    salvar();
    preencherSelectsMes();
    mostrarPasso(1, true);
  });

  /* Meses do seletor do passo 5: os próximos 13, a partir de dezembro/2026, do mês atual se for depois,
     ou do mês em que começa a regra escolhida (40h: dezembro/2027). Nunca antes de dezembro/2026. */
  function opcoesMes() {
    const [ah, mh] = hojeISO().split('-').map(Number);
    const ini = faseAtual().inicio;
    const cand = [[2026, 12], [ah, mh]];
    if (ini) cand.push(ini.split('-').slice(0, 2).map(Number));
    let [y, m] = cand.reduce((x, c) => (c[0] * 12 + c[1] > x[0] * 12 + x[1] ? c : x));
    const lista = [];
    for (let i = 0; i < 13; i++) { lista.push([y, m]); [y, m] = mesVizinho(y, m, 1); }
    return lista;
  }
  $('#a-pronta').addEventListener('change', (ev) => {
    if (ev.target.id !== 'a-mesano') return;
    const [y, m] = ev.target.value.split('-').map(Number);
    const a = estado.assist;
    a.ano = y; a.mes = m;
    salvar();
    desenharPronta();
    const sel = $('#a-mesano');
    if (sel) sel.focus({ preventScroll: true });
    const titulo = $('#a-rodizio-titulo');
    const suave = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    titulo.scrollIntoView({ behavior: suave ? 'smooth' : 'auto', block: 'start' });
    titulo.classList.add('destaque');
    setTimeout(() => titulo.classList.remove('destaque'), 1000);
  });

  function desenharPronta() {
    const a = estado.assist;
    const fase = faseAtual();
    const lista = opcoesMes();
    if (!lista.some(([y, m]) => y === a.ano && m === a.mes)) { [a.ano, a.mes] = lista[0]; }
    const ano = a.ano, mes = a.mes;
    // Só gera se ainda não existe escala. Trocar o mês apenas continua o mesmo ciclo.
    if (!estado.gerado) gerarEscala();
    estado.rodMes = mes;
    estado.rodAno = ano;
    repararAte(ano, mes);
    salvar();

    // conferência com as validações que o app já tem
    const problemas = [];
    estado.pessoas.forEach((p) => {
      analisarPessoa(p, fase, estado.conv30).avisos.forEach((t) => problemas.push(`${esc(p.nome)}, escala da semana: ${t}`));
      checarMes(p, ano, mes).problemas.forEach((t) => problemas.push(`${esc(p.nome)}, ${MESES[mes - 1]}: ${t}`));
    });
    const falta = faltaDoMes(ano, mes);
    const avisoFalta = falta.porSemana > 0 ? aviso(`Falta gente:${htmlFaltas(falta.itens)}`) : '';
    const notas = [];
    const t0 = (estado.gerado && estado.gerado.turnos) || [];
    t0.forEach((t) => {
      if (Number(t.int) > R.intervaloMaximoSemAcordoMin) notas.push(aviso(`O intervalo do turno é de ${horas(Number(t.int))}, porque o negócio fecha no meio do dia. Vale porque você marcou que tem acordo escrito ou convenção que permite intervalo maior que ${horas(R.intervaloMaximoSemAcordoMin)}.`, 'info'));
    });
    if (t0.some((t) => t.nome === 'Almoço')) notas.push(aviso(`Sem acordo para intervalo maior que ${horas(R.intervaloMaximoSemAcordoMin)}, a escala usa dois turnos cheios que se sobrepõem: Almoço, que abre, e Jantar, que fecha. Cada pessoa fica sempre no seu turno.`, 'info'));
    const status = !problemas.length && !avisoFalta
      ? aviso('<strong>Escala conferida: nenhum problema.</strong>', 'ok')
      : `${avisoFalta}${problemas.map((t) => aviso(t)).join('')}`;

    // escala da semana (uma linha por horário; dois blocos quando o turno para no meio do dia)
    const cont = Array(7).fill(0);
    const linhas = estado.pessoas.map((p) => `<tr><th scope="row">${esc(p.nome)}${p.turno ? `<small>${esc(p.turno)}</small>` : ''}</th>${p.dias.map((d, i) => {
      if (d.folga) return `<td class="folga${i === 6 ? ' dom' : ''}">Folga</td>`;
      cont[i]++;
      return `<td class="${i === 6 ? 'dom' : ''}">${d.blocos ? d.blocos.map((b) => `${b[0]}–${b[1]}`).join('<br>') : `${d.ent}–${d.sai}`}</td>`;
    }).join('')}</tr>`).join('');
    const arraste = '<p class="dica arraste">Arraste para o lado para ver todos os dias</p>';
    const legendaTurnos = t0.map((t) => `${t0.length > 1 ? t.nome + ': ' : ''}${horarioDoTurno(t)}, ${t.blocos ? '' : textoIntervalo(t.int) + ', '}${horas(t.liq)} no dia`).join(' · ');
    const semana = `
      ${arraste}
      <div class="rolagem"><table class="grade-semana">
        <thead><tr><th scope="col">Pessoa</th>${DIAS.map((d, i) => `<th scope="col" class="${i === 6 ? 'dom' : ''}">${d}</th>`).join('')}</tr></thead>
        <tbody>${linhas}</tbody>
        <tfoot class="so-tela"><tr><th scope="row">Trabalham</th>${cont.map((n, i) => { const pr = necessidadeDia(i); return `<td class="${n < pr ? 'curto' : ''}">${n}${pr ? ` de ${pr}` : ''}</td>`; }).join('')}</tr></tfoot>
      </table></div>
      <p class="legenda">Horário mais comum · ${legendaTurnos}.</p>
      <p class="base-rodizio">A escala da semana é a base. O rodízio do mês mostra quem folga em cada dia, girando o domingo.</p>`;

    // rodízio do mês (mural)
    const isos = diasDoMes(ano, mes);
    const fers = isos.map((iso) => feriadoEm(iso));
    const listaFer = isos.map((iso, i) => (fers[i] ? `${diaMesBR(iso)} ${fers[i]}` : null)).filter(Boolean);
    const mural = `
      ${arraste}
      <div class="rolagem"><table class="mural">
        <thead><tr><th scope="col">Pessoa</th>${isos.map((iso, i) => `<th scope="col" class="${dsDe(iso) === 6 ? 'dom' : ''}${fers[i] ? ' fer' : ''}"><span>${DIAS_LETRA[dsDe(iso)]}</span>${i + 1}${fers[i] ? '★' : ''}</th>`).join('')}</tr></thead>
        <tbody>${estado.pessoas.map((p) => `<tr><th scope="row">${esc(p.nome)}</th>${isos.map((iso) => {
          const tr = trabalhaEm(p, iso);
          return `<td class="${tr ? '' : 'folga'}${dsDe(iso) === 6 ? ' dom' : ''}">${tr ? '' : 'F'}</td>`;
        }).join('')}</tr>`).join('')}</tbody>
      </table></div>
      <p class="legenda">F = folga · D = domingo${listaFer.length ? ` · ★ = feriado (${listaFer.join(', ')})` : ''}</p>`;

    // uma recomendação de custo; as outras opções ficam recolhidas
    let custo = '';
    if (falta.porSemana > 0) {
      const rc = calcReforco();
      custo = `
        <h3>Como cobrir o que falta</h3>
        ${rc.erro ? `<p class="vazio">${rc.erro}</p>` : `<p class="recomendacao">${rc.recomendacao}</p>
        <details class="outras"><summary>Ver outras opções</summary>${htmlReforco()}<p><a class="link" href="#reforco">Mudar os valores do reforço</a></p></details>`}`;
    }

    const nomeNeg = a.negocio && R.modelos[a.negocio] ? R.modelos[a.negocio].nome : '';
    $('#a-pronta').innerHTML = `
      <ul class="avisos status so-tela">${status}${notas.join('')}</ul>
      <section class="mural-impressao" aria-label="Escala para o mural">
        <p class="so-impressao mural-impressao__titulo">Escala ${nomeNeg ? `· ${esc(nomeNeg)} ` : ''}· ${mesNome(mes, ano)} · regras de ${fase.horasSemana}h</p>
        <h3>Escala da semana</h3>${semana}
        <div class="campo campo--mes so-tela">
          <label for="a-mesano">Mês do rodízio</label>
          <select id="a-mesano">${opcoesMes().map(([y, m]) => `<option value="${y}-${pad(m)}"${y === ano && m === mes ? ' selected' : ''}>${mesNome(m, y)}</option>`).join('')}</select>
        </div>
        <h3 id="a-rodizio-titulo" tabindex="-1">Rodízio de ${mesNome(mes, ano)}</h3>
        <div class="so-tela">${textoTransicao(ano, mes)}</div>
        ${mural}
      </section>
      <div class="so-tela">${textoFeriados(ano, mes)}${custo}</div>`;
    atualizarCompartilhar();
  }

  /* ---------- WhatsApp, copiar e link do rodízio ---------- */
  const horaCurta = (t) => { const m = paraMin(t); if (m == null) return t; const h = Math.floor(m / 60), mm = m % 60; return mm ? `${h}h${pad(mm)}` : `${h}h`; };
  const horarioCurto = (d) => (d.blocos ? d.blocos.map((b) => `${horaCurta(b[0])}–${horaCurta(b[1])}`).join(' e ') : `${horaCurta(d.ent)}–${horaCurta(d.sai)}`);

  // Código curto do mês: ano-mês e, por pessoa, nome:turno:folgas (dias de folga como bits em base 36).
  function codigoRodizio(ano, mes) {
    const isos = diasDoMes(ano, mes);
    const pessoas = estado.pessoas.map((p) => {
      let m = 0;
      isos.forEach((iso, i) => { if (!trabalhaEm(p, iso)) m += 2 ** i; });
      return [encodeURIComponent(p.nome || 'Pessoa'), p.turno ? encodeURIComponent(p.turno) : '', m.toString(36)].join(':');
    });
    return `${ano}-${pad(mes)},${pessoas.join(',')}`;
  }
  const linkRodizio = (ano, mes) => `${location.origin}${location.pathname}#ver=${codigoRodizio(ano, mes)}`;

  function textoWhatsApp() {
    const a = estado.assist;
    const linhas = estado.pessoas.map((p) => {
      const grupos = new Map();
      p.dias.forEach((d, i) => { if (!d.folga) { const k = horarioCurto(d); grupos.set(k, [...(grupos.get(k) || []), i]); } });
      const ordem = [...grupos.entries()].sort((x, y) => y[1].length - x[1].length);
      const principal = ordem.length ? ordem[0][0] : '';
      const outros = ordem.slice(1).map(([k, ds]) => `${ds.map((i) => DIAS_CURTO[i]).join(', ')} ${k}`);
      const folgas = p.dias.map((d, i) => (d.folga ? DIAS_CURTO[i] : null)).filter(Boolean);
      const turno = p.turno ? `${p.turno.toLowerCase()} ` : '';
      return `${p.nome} (${turno}${principal}${outros.length ? '; ' + outros.join('; ') : ''}): ${folgas.length ? `folga ${lista(folgas)}` : 'sem folga'}`;
    });
    return `*Escala da semana*\n${linhas.join('\n')}\n\nO domingo de folga gira entre as pessoas. Rodízio de ${mesNome(a.mes, a.ano)}: ${linkRodizio(a.ano, a.mes)}`;
  }
  function atualizarCompartilhar() {
    $('#a-whatsapp').href = `https://wa.me/?text=${encodeURIComponent(textoWhatsApp())}`;
  }
  $('#a-copiar').addEventListener('click', async () => {
    const texto = textoWhatsApp();
    const st = $('#a-copiar-status');
    try {
      await navigator.clipboard.writeText(texto);
      st.textContent = 'Texto copiado. Cole no WhatsApp ou onde quiser.';
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = texto; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      const ok = document.execCommand && document.execCommand('copy');
      ta.remove();
      st.textContent = ok ? 'Texto copiado. Cole no WhatsApp ou onde quiser.' : 'Não deu para copiar sozinho. Use o botão Enviar no WhatsApp.';
    }
  });

  /* ---------- rodízio recebido por link (#ver=...): só leitura, não mexe nos dados de quem abre ---------- */
  function mostrarVer(codigo) {
    const sec = $('#ver');
    let html;
    try {
      const [ym, ...ps] = codigo.split(',');
      const [ano, mes] = ym.split('-').map(Number);
      if (!ano || !mes || mes > 12) throw new Error('mês');
      const isos = diasDoMes(ano, mes);
      const pessoas = ps.filter(Boolean).map((s) => {
        const [n, t, m] = s.split(':');
        return { nome: decodeURIComponent(n), turno: t ? decodeURIComponent(t) : '', mask: parseInt(m || '0', 36) };
      });
      const fers = isos.map((iso) => feriadoEm(iso));
      const listaFer = isos.map((iso, i) => (fers[i] ? `${diaMesBR(iso)} ${fers[i]}` : null)).filter(Boolean);
      html = `
        <h2 id="ver-titulo">Rodízio de ${mesNome(mes, ano)}</h2>
        <p class="painel__intro">Escala recebida por link. F = folga.</p>
        <p class="dica arraste">Arraste para o lado para ver todos os dias</p>
        <div class="rolagem"><table class="mural">
          <thead><tr><th scope="col">Pessoa</th>${isos.map((iso, i) => `<th scope="col" class="${dsDe(iso) === 6 ? 'dom' : ''}"><span>${DIAS_LETRA[dsDe(iso)]}</span>${i + 1}${fers[i] ? '★' : ''}</th>`).join('')}</tr></thead>
          <tbody>${pessoas.map((p) => `<tr><th scope="row">${esc(p.nome)}${p.turno ? `<small>${esc(p.turno)}</small>` : ''}</th>${isos.map((iso, i) => {
            const folga = Math.floor(p.mask / 2 ** i) % 2 === 1;
            return `<td class="${folga ? 'folga' : ''}${dsDe(iso) === 6 ? ' dom' : ''}">${folga ? 'F' : ''}</td>`;
          }).join('')}</tr>`).join('')}</tbody>
        </table></div>
        <p class="legenda">F = folga · D = domingo${listaFer.length ? ` · ★ = feriado (${listaFer.join(', ')})` : ''}</p>
        <p><a class="btn btn--sec" href="#inicio">Abrir a calculadora</a></p>`;
    } catch (e) {
      html = '<h2 id="ver-titulo">Rodízio</h2><p class="vazio">Este link de rodízio está incompleto. Peça para enviarem de novo.</p><p><a class="btn btn--sec" href="#inicio">Abrir a calculadora</a></p>';
    }
    sec.innerHTML = html;
    sec.hidden = false;
    $('#abas').hidden = true;
    $('#inicio').hidden = true;
    FERRAMENTAS.forEach((x) => { $('#' + x).hidden = true; });
  }

  /* =========================================================
     4. MINHA EQUIPE DÁ CONTA?
     ========================================================= */
  function desenharEquipe() {
    $('#q-dias').innerHTML = estado.eqDias.map((d, i) => `
      <div class="dia-eq${d.aberto ? '' : ' dia-eq--fechado'}" data-i="${i}">
        <label class="chk"><input type="checkbox" data-eq="aberto" ${d.aberto ? 'checked' : ''}> ${DIAS[i]} abre</label>
        <label class="dia-eq__qtd">Pessoas<input data-eq="pessoas" inputmode="numeric" value="${esc(d.pessoas)}" ${d.aberto ? '' : 'disabled'} aria-label="Pessoas necessárias em ${DIAS_NOME[i]}"></label>
      </div>`).join('');
  }
  $('#q-dias').addEventListener('input', (ev) => {
    const el = ev.target;
    const box = el.closest('.dia-eq');
    if (!box) return;
    const d = estado.eqDias[Number(box.dataset.i)];
    estado.necTurno = null; // mudou à mão: a necessidade por turno volta a ser o total do dia dividido
    if (el.dataset.eq === 'aberto') {
      d.aberto = el.checked;
      box.classList.toggle('dia-eq--fechado', !d.aberto);
      $('[data-eq="pessoas"]', box).disabled = !d.aberto;
    } else d.pessoas = el.value;
    salvar(); calcularTudo();
  });

  function contaEquipe() {
    const necessarios = estado.eqDias.reduce((s, d) => s + (d.aberto ? Math.max(0, Math.round(valor(d.pessoas) || 0)) : 0), 0);
    const func = Math.max(0, Math.round(valor(estado.func) || 0));
    const disponiveis = func * R.equipe.diasPorFuncionario;
    return { necessarios, func, disponiveis, falta: necessarios - disponiveis };
  }

  function calcularEquipe() {
    const c = contaEquipe();
    const abertos = estado.eqDias.filter((d) => d.aberto).length;
    $('#q-resultado').innerHTML = htmlConta(c, abertos);
    const usar = $('#f-usar-equipe');
    usar.hidden = c.falta <= 0;
    usar.textContent = `Usar o resultado de “Minha equipe dá conta?”: ${pessoasDia(c.falta)}`;
  }

  /* =========================================================
     5. CUSTO DO REFORÇO
     ========================================================= */
  $('#f-usar-equipe').addEventListener('click', () => {
    const c = contaEquipe();
    if (c.falta > 0) { estado.refTurnos = String(c.falta); preencherCampos(); salvar(); calcularTudo(); }
  });

  const AVISO_FOLGA = 'Folga não pode ser trocada por dinheiro. Use só em caso excepcional, não como rotina.';

  /* Quatro formas de cobrir as pessoas-dia que faltam. A recomendação só escolhe entre as formas de contratar:
     chamar na folga é exceção e hora extra só estende jornada (até 2h por pessoa por dia). */
  function calcReforco(o = {}) {
    const fase = faseAtual();
    const pd = Math.max(0, valor(o.pd != null ? o.pd : estado.refTurnos) || 0);
    const hDia = Math.max(0, lerHoras(o.horas != null ? o.horas : estado.refHoras) || 0);
    const cs = conferirSalario(estado.salario);
    const sal = cs.v;
    const meio = valor(estado.refMeio);
    const enc = Math.max(0, valor(estado.refEnc) || 0);
    if (cs.msg) return { erro: `${cs.msg} Corrija o salário para ver os custos.` };
    if (!cs.ok || !(pd > 0) || !(hDia > 0)) {
      return { erro: 'Preencha as pessoas-dia, as horas de cada pessoa-dia e o salário da equipe para ver a comparação.' };
    }
    const semanas = R.equipe.semanasPorMes;
    const minDia = Math.round(hDia * 60);
    const minSemana = pd * minDia;
    const minMes = minSemana * semanas;
    const hMes = minMes / 60;
    const horaEquipe = sal / fase.divisor;
    const horaRef = valor(estado.refHoraValor) > 0 ? valor(estado.refHoraValor) : horaEquipe;
    const fatorEnc = 1 + enc / 100;
    const encTxt = enc ? ` + ${numCurto(enc)}% de encargos` : '';

    const custoHora = hMes * horaRef * fatorEnc;
    // Meio período: quantas pessoas são precisas para cobrir o buraco inteiro (cada uma até 30h por semana).
    const limMeio = R.equipe.meioPeriodoMaxHorasSemana * 60;
    const pessoasMeio = Math.max(1, Math.ceil(minSemana / limMeio));
    const custoMeio = meio > 0 ? pessoasMeio * meio * fatorEnc : null;
    const custoExtra = hMes * horaEquipe * (1 + R.horaExtra.adicional);
    const custoFolga = hMes * horaEquipe * (1 + R.horaExtra.adicionalDobro);
    const limMin = R.horaExtra.limiteDiaMin;
    const pessoasExtra = Math.ceil(minDia / limMin);

    // As duas formas de contratar cobrem o buraco inteiro, então dá para comparar os custos.
    const contratar = [{ id: 'hora', frase: 'contratar alguém por hora', custo: custoHora }];
    if (custoMeio != null) contratar.push({ id: 'meio', frase: `contratar meio período (${pessoasMeio} ${pessoasMeio === 1 ? 'pessoa' : 'pessoas'})`, custo: custoMeio });
    contratar.sort((a, b) => a.custo - b.custo);
    const melhor = contratar[0];
    const recomendacao = `A saída mais barata é ${melhor.frase}: <strong>${R$(melhor.custo)} por mês</strong>.`;
    return { fase, pd, minDia, minSemana, minMes, semanas, horaEquipe, horaRef, encTxt, meio, custoHora, custoMeio, pessoasMeio, custoExtra, custoFolga, limMin, pessoasExtra, melhor, outro: contratar[1], recomendacao };
  }

  /* Quatro formas de cobrir as pessoas-dia que faltam. A recomendação só escolhe entre as formas de contratar:
     chamar na folga é exceção e hora extra só estende jornada (até 2h por pessoa por dia). */
  function htmlReforco() {
    const c = calcReforco();
    if (c.erro) return `<p class="vazio">${c.erro}</p>`;
    const { fase, pd, minDia, minSemana, minMes, semanas, horaEquipe, horaRef, encTxt, meio, custoHora, custoMeio, pessoasMeio, custoExtra, custoFolga, limMin, pessoasExtra, melhor, outro } = c;
    const selo = (id) => (id === melhor.id && outro ? '<p class="opcao__selo">Melhor para contratar</p>' : '');
    const frase = `${c.recomendacao} Como o buraco se repete toda semana, a saída permanente é contratar. Hora extra só serve para estender a jornada de quem já está trabalhando, e chamar alguém na folga é só para exceção.`;

    return `
      <p class="resultado__base">Buraco na escala: ${pessoasDia(pd)} de ${horas(minDia)} por semana = ${horas(minSemana)} por semana, ou ${horas(minMes)} por mês (${num(semanas, 2)} semanas). Valor da hora da equipe: ${R$(horaEquipe)} (${fase.horasSemana}h, divisor ${fase.divisor}).</p>
      <div class="comparar comparar--4">
        <div class="opcao${melhor.id === 'hora' && outro ? ' opcao--melhor' : ''}">
          <h3>Contratar reforço por hora <span>(alguém por hora, só nos dias que faltam)</span></h3>
          <p class="opcao__valor">${R$(custoHora)}<span> por mês</span></p>
          <p class="opcao__conta">${horas(minMes)} × ${R$(horaRef)}${encTxt}</p>
          ${selo('hora')}
        </div>
        <div class="opcao${melhor.id === 'meio' ? ' opcao--melhor' : ''}">
          <h3>Salário fixo de meio período</h3>
          ${custoMeio != null ? `<p class="opcao__valor">${R$(custoMeio)}<span> por mês</span></p>
          <p class="opcao__conta">${pessoasMeio} ${pessoasMeio === 1 ? 'pessoa' : 'pessoas'} de meio período × ${R$(meio)}${encTxt}</p>
          <p class="opcao__nota">Cada pessoa de meio período trabalha até ${R.equipe.meioPeriodoMaxHorasSemana}h por semana. Para ${horas(minSemana)} por semana, ${pessoasMeio === 1 ? 'basta 1 pessoa' : `são ${pessoasMeio} pessoas`}.</p>` : '<p class="opcao__conta">Escreva o salário do meio período para comparar.</p>'}
          ${selo('meio')}
        </div>
        <div class="opcao">
          <h3>Hora extra 50% <span>(estender a jornada)</span></h3>
          <p class="opcao__valor">${R$(custoExtra)}<span> por mês</span></p>
          <p class="opcao__conta">${horas(minMes)} × ${R$(horaEquipe)} × 1,5</p>
          <p class="opcao__nota">Cada pessoa estende no máximo ${horas(limMin)} por dia. Para cobrir ${horas(minDia)} de um dia, são <strong>${pessoasExtra} ${pessoasExtra === 1 ? 'pessoa' : 'pessoas'} × ${horas(limMin)}</strong> a mais no mesmo dia.</p>
        </div>
        <div class="opcao opcao--excecao">
          <h3>Chamar alguém na folga <span>(100%, dia de repouso)</span></h3>
          <p class="opcao__valor">${R$(custoFolga)}<span> por mês</span></p>
          <p class="opcao__conta">${horas(minMes)} × ${R$(horaEquipe)} × 2</p>
          <p class="opcao__nota opcao__nota--forte">${icone('alerta')}<span>${AVISO_FOLGA}</span></p>
        </div>
      </div>
      <p class="resultado__frase">${frase}</p>
      <ul class="avisos">${aviso('Hora extra e trabalho na folga também aumentam férias, 13º e o repouso da semana. Esse acréscimo não entra nesta conta: confira com seu contador.', 'info')}</ul>`;
  }
  function calcularReforco() {
    const cs = conferirSalario(estado.salario);
    const fase = faseAtual();
    const hEq = cs.ok ? cs.v / fase.divisor : 0;
    $('#f-hora-ref').placeholder = hEq ? num(hEq) : '';
    $('#f-hora-ref-dica').textContent = hEq ? `Em branco, usa o valor da hora da equipe: ${R$(hEq)}.` : 'Em branco, usa o valor da hora da equipe.';
    $('#f-resultado').innerHTML = htmlReforco();
  }

  /* =========================================================
     6. DESCONTO POR FALTA
     ========================================================= */
  function calcularFalta() {
    const tipo = estado.fTipo === 'horista' ? 'horista' : 'mensalista';
    $$('#falta [data-so]').forEach((el) => { el.hidden = el.dataset.so !== tipo; });
    const faltas = Math.max(0, Math.min(7, Math.round(valor(estado.fFaltas) || 0)));
    const out = $('#d-resultado');
    const S = R.salario;
    const avisos = [];
    if (estado.fFeriado) avisos.push(aviso('Semana com feriado: o desconto pode mudar. Confira com seu contador.'));

    if (faltas === 0) {
      out.innerHTML = `<p class="vazio">Sem falta na semana, não há desconto.</p><ul class="avisos">${avisos.join('')}</ul>`;
      return;
    }

    if (tipo === 'mensalista') {
      const cs = conferirSalario(estado.salario);
      const sal = cs.v;
      if (!cs.ok) { out.innerHTML = `<p class="vazio">${cs.msg || 'Escreva o salário mensal para ver o desconto.'}</p>`; return; }
      const dia = sal / S.diasDoMesMensalista;
      const repouso = dia * S.repousoEmDias;
      const descDias = dia * faltas;
      const total = descDias + repouso;
      out.innerHTML = `
        <dl class="numeros">
          <div><dt>${faltas === 1 ? 'Dia faltado' : `${faltas} dias faltados`}</dt><dd>${R$(descDias)}</dd><dd class="numeros__conta">${R$(sal)} ÷ ${S.diasDoMesMensalista}${faltas > 1 ? ` × ${faltas}` : ''}</dd></div>
          <div><dt>Repouso da semana</dt><dd>${R$(repouso)}</dd><dd class="numeros__conta">os repousos da semana valem juntos 1 dia</dd></div>
          <div class="numeros__total"><dt>Desconto total</dt><dd>${R$(total)}</dd><dd class="numeros__conta">${faltas === 1 ? 'cerca de 2 dias, não 3' : `${faltas} dias + 1 repouso`}</dd></div>
        </dl>
        <p class="resultado__frase">A pessoa perde o dia que faltou e o valor do repouso daquela semana. Mesmo assim, <strong>continua folgando os dias de folga</strong> da escala.</p>
        <ul class="avisos">${avisos.join('')}</ul>`;
    } else {
      const vh = valor(estado.fHora);
      const hs = valor(estado.fHorasSemana);
      if (!(vh > 0) || !(hs > 0)) { out.innerHTML = '<p class="vazio">Escreva o valor da hora e as horas da semana para ver o desconto.</p>'; return; }
      const hDia = hs / R.equipe.diasPorFuncionario;
      const horasPerdidas = Math.min(hs, hDia * faltas);
      const repouso = hs * S.repousoHorista * vh;
      const naoPagas = horasPerdidas * vh;
      out.innerHTML = `
        <dl class="numeros">
          <div><dt>Repouso da semana sem falta</dt><dd>${R$(repouso)}</dd><dd class="numeros__conta">${horas(hs * 60)} ÷ 6 × ${R$(vh)}</dd></div>
          <div><dt>Horas não trabalhadas</dt><dd>${R$(naoPagas)}</dd><dd class="numeros__conta">${horas(horasPerdidas * 60)} que não são pagas</dd></div>
          <div class="numeros__total"><dt>Deixa de receber</dt><dd>${R$(naoPagas + repouso)}</dd><dd class="numeros__conta">horas faltadas + repouso</dd></div>
        </dl>
        <p class="resultado__frase">O horista recebe só as horas que trabalha. Com falta sem justificativa, perde também o repouso da semana (1/6 das horas, cerca de 16,7% a mais). Mesmo assim, <strong>continua folgando os dias de folga</strong> da escala.</p>
        <ul class="avisos">${avisos.join('')}</ul>`;
    }
  }

  /* ---------- tudo ---------- */
  function calcularTudo() {
    calcularHora();
    calcularEscala();
    calcularEquipe();
    calcularReforco();
    calcularFalta();
    if (estado.aba === 'inicio') {
      if (estado.assist.passo === 4) desenharEquipeAssist();
    }
  }

  $('#limpar').addEventListener('click', () => {
    if (!confirm('Apagar todos os dados salvos neste aparelho e começar de novo?')) return;
    try { localStorage.removeItem(CHAVE); } catch (e) { /* nada */ }
    estado = padrao();
    iniciar();
  });

  function iniciar() {
    preencherSelectsMes();
    preencherCampos();
    mostrarFase();
    desenharEscala();
    desenharEquipe();
    desenharRodizio();
    calcularTudo();
    const rota = location.hash.slice(1);
    if (rota.startsWith('ver=')) { mostrarVer(rota.slice(4)); return; }
    abrirAba(ROTAS.includes(rota) ? rota : estado.aba);
  }
  iniciar();
})();
