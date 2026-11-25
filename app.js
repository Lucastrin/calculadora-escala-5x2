/* Calculadora de Escala e Horas — lógica da tela.
   Toda regra de negócio vem de regras.js (window.REGRAS). */
(() => {
  'use strict';

  const R = window.REGRAS;
  const CHAVE = 'mapa5x2:v1';
  const DIAS = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'];
  const DIAS_NOME = ['segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo'];
  const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const ABAS = ['hora', 'escala', 'rodizio', 'equipe', 'reforco', 'falta'];

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
  const dataBR = (iso) => iso.split('-').reverse().join('/');
  const pad = (n) => String(n).padStart(2, '0');
  const hojeISO = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function valor(s) {
    if (typeof s === 'number') return s;
    s = String(s ?? '').replace(/[R$\s %]/g, '');
    if (!s) return NaN;
    if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
    else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
    const n = Number(s);
    return Number.isFinite(n) ? n : NaN;
  }
  const paraMin = (t) => {
    if (!t || !/^\d{1,2}:\d{2}/.test(t)) return null;
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };

  /* ---------- regras ---------- */
  const faseDaData = (iso) => R.fases.find((f) => (!f.inicio || iso >= f.inicio) && (!f.fim || iso <= f.fim)) || R.fases[R.fases.length - 1];
  const faseAtual = () => faseDaData(estado.data || hojeISO());

  function intervaloMinimo(jornadaMin, conv30) {
    const faixa = R.descanso.intervalo.find((f) => jornadaMin <= f.jornadaAteMin);
    if (!faixa) return 0;
    return conv30 && faixa.minimoComConvencaoMin != null ? faixa.minimoComConvencaoMin : faixa.minimoMin;
  }

  /* ---------- estado ---------- */
  let seq = 0;
  const novoId = () => Date.now().toString(36) + (seq++).toString(36);
  const novaPessoa = (n) => ({
    id: novoId(),
    nome: `Pessoa ${n}`,
    dias: DIAS.map((_, i) => (i < 5 ? { folga: false, ent: '08:00', sai: '17:00', int: '60' } : { folga: true, ent: '08:00', sai: '17:00', int: '60' }))
  });

  function padrao() {
    const d = new Date();
    return {
      data: null,
      aba: 'hora',
      salario: '3.000,00',
      horasExtras: '10',
      conv30: false,
      pessoas: [novaPessoa(1), novaPessoa(2)],
      rodMes: d.getMonth() + 1,
      rodAno: d.getFullYear(),
      atividade: 'comercio',
      rodEdicoes: {},
      eqDias: DIAS.map(() => ({ aberto: true, pessoas: '3' })),
      func: '4',
      refTurnos: '1',
      refHoras: '8',
      refMeio: '1.800,00',
      refEnc: '',
      fTipo: 'mensalista',
      fHora: '10,00',
      fHorasSemana: '42',
      fFaltas: '1',
      fFeriado: false
    };
  }

  let estado = padrao();
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE) || 'null');
    if (salvo && typeof salvo === 'object') estado = Object.assign(padrao(), salvo);
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
      const k = el.dataset.k;
      const v = estado[k];
      if (el.type === 'checkbox') el.checked = !!v;
      else if (el.type === 'radio') el.checked = String(v) === el.value;
      else if (el.value !== String(v ?? '')) el.value = v ?? '';
    });
  }

  document.addEventListener('input', aoMudarCampo);
  document.addEventListener('change', aoMudarCampo);
  function aoMudarCampo(ev) {
    const el = ev.target;
    if (!el.dataset || !el.dataset.k) return;
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
    const iso = estado.data || hojeISO();
    inputData.value = iso;
    const f = faseDaData(iso);
    const periodo = f.inicio && f.fim ? `de ${dataBR(f.inicio)} a ${dataBR(f.fim)}`
      : f.fim ? `até ${dataBR(f.fim)}` : `a partir de ${dataBR(f.inicio)}`;
    $('#fase-selo').innerHTML = `<strong>Fase ${f.horasSemana}h</strong> ${periodo} · divisor ${f.divisor} · ${f.repousosSemana} ${f.repousosSemana > 1 ? 'repousos' : 'repouso'} por semana`;
    $$('[data-ir-data]').forEach((b) => {
      const alvo = b.dataset.irData === 'hoje' ? hojeISO() : b.dataset.irData;
      b.setAttribute('aria-pressed', String(faseDaData(alvo) === f && (b.dataset.irData !== 'hoje' || !estado.data)));
    });
  }
  inputData.addEventListener('change', () => {
    if (!inputData.value) return;
    estado.data = inputData.value === hojeISO() ? null : inputData.value;
    salvar(); mostrarFase(); calcularTudo();
  });
  $$('[data-ir-data]').forEach((b) => b.addEventListener('click', () => {
    estado.data = b.dataset.irData === 'hoje' ? null : b.dataset.irData;
    salvar(); mostrarFase(); calcularTudo();
  }));

  /* ---------- abas ---------- */
  const botoesAba = $$('[role="tab"]');
  function abrirAba(id, focar) {
    if (!ABAS.includes(id)) id = 'hora';
    estado.aba = id;
    botoesAba.forEach((b) => {
      const ativa = b.dataset.aba === id;
      b.setAttribute('aria-selected', String(ativa));
      b.tabIndex = ativa ? 0 : -1;
      if (ativa && focar) b.focus();
    });
    ABAS.forEach((a) => { $('#' + a).hidden = a !== id; });
    if (location.hash !== '#' + id) history.replaceState(null, '', '#' + id);
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
  window.addEventListener('hashchange', () => abrirAba(location.hash.slice(1)));

  /* ---------- imprimir ---------- */
  $$('[data-imprimir]').forEach((b) => b.addEventListener('click', () => {
    const alvo = b.dataset.imprimir;
    document.body.dataset.imprimir = alvo;
    window.print();
  }));
  window.addEventListener('afterprint', () => { delete document.body.dataset.imprimir; });

  /* =========================================================
     1. QUANTO VALE A HORA
     ========================================================= */
  function calcularHora() {
    const sal = valor(estado.salario);
    const x = valor(estado.horasExtras);
    const erro = $('#h-salario-erro');
    const ok = Number.isFinite(sal) && sal > 0;
    erro.textContent = estado.salario && !ok ? 'Escreva o salário só com números, por exemplo 3.000,00.' : '';
    $('#h-salario').setAttribute('aria-invalid', String(!!erro.textContent));
    const qtd = Number.isFinite(x) && x > 0 ? x : 0;
    $('#h-col-x').textContent = `${numCurto(qtd)} ${qtd === 1 ? 'hora extra' : 'horas extras'} no mês (50%)`;
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
        <td data-rot="${numCurto(qtd)} h extras no mês">${ok ? R$(h * (1 + ad.adicional) * qtd) : '–'}</td>
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

  function desenharEscala() {
    const caixa = $('#e-pessoas');
    caixa.innerHTML = estado.pessoas.map((p, pi) => `
      <article class="pessoa" data-p="${pi}">
        <div class="pessoa__cab">
          <div class="campo campo--nome">
            <label for="e-nome-${p.id}">Nome</label>
            <input id="e-nome-${p.id}" data-pf="nome" value="${esc(p.nome)}" autocomplete="off">
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
            </li>`).join('')}
        </ol>
      </article>`).join('');
    const max = R.maxPessoasNaEscala;
    $('#e-add').disabled = estado.pessoas.length >= max;
    $('#e-add-nota').textContent = estado.pessoas.length >= max ? `A escala vai até ${max} pessoas.` : `${estado.pessoas.length} de ${max} pessoas.`;
  }

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
        $('[data-out="horas"]', li).textContent = d.folga ? 'Folga' : d.vazio ? 'Sem horário' : `${horas(d.liq)} no dia`;
        if (!d.folga && !d.vazio) cont[d.i]++;
      });
      $('[data-out="total"]', art).innerHTML = `<strong>${horas(r.total)}</strong> na semana · ${r.folgas} ${r.folgas === 1 ? 'folga' : 'folgas'}`;
      $('[data-out="avisos"]', art).innerHTML = r.avisos.length
        ? r.avisos.map((a) => aviso(a)).join('')
        : aviso(`Tudo certo pelas regras de ${fase.horasSemana}h.`, 'ok');
    });
    $('#e-cobertura').innerHTML = cont.map((n, i) => `<li class="${i === 6 ? 'dom' : ''}"><span>${DIAS[i]}</span><strong>${n}</strong></li>`).join('');
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
    } else return;
    salvar();
    calcularEscala();
    desenharRodizio();
    calcularTudo();
  });
  $('#e-pessoas').addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-remover]');
    if (!b) return;
    const pi = Number(b.dataset.remover);
    const p = estado.pessoas[pi];
    if (!confirm(`Tirar ${p.nome} da escala?`)) return;
    estado.pessoas.splice(pi, 1);
    salvar(); desenharEscala(); desenharRodizio(); calcularTudo();
  });
  $('#e-add').addEventListener('click', () => {
    if (estado.pessoas.length >= R.maxPessoasNaEscala) return;
    estado.pessoas.push(novaPessoa(estado.pessoas.length + 1));
    salvar(); desenharEscala(); desenharRodizio(); calcularTudo();
    const campos = $$('.pessoa [data-pf="nome"]');
    const novo = campos[campos.length - 1];
    if (novo) { novo.focus(); novo.select(); }
  });

  /* =========================================================
     3. RODÍZIO DO MÊS
     ========================================================= */
  const chaveMes = () => `${estado.rodAno}-${pad(estado.rodMes)}`;
  const diaDaSemana = (ano, mes, dia) => (new Date(ano, mes - 1, dia).getDay() + 6) % 7; // SEG = 0

  function repousosDoMes(ano, mes, nDias) {
    const a = faseDaData(`${ano}-${pad(mes)}-01`);
    const b = faseDaData(`${ano}-${pad(mes)}-${pad(nDias)}`);
    return a.repousosSemana >= b.repousosSemana ? a : b;
  }

  function mesDaPessoa(p, ano, mes, nDias) {
    const ed = (estado.rodEdicoes[chaveMes()] || {})[p.id] || {};
    const lista = [];
    for (let dia = 1; dia <= nDias; dia++) {
      const ds = diaDaSemana(ano, mes, dia);
      const base = p.dias[ds];
      const baseTrab = !base.folga;
      const trab = ed[dia] != null ? ed[dia] === 'T' : baseTrab;
      lista.push({ dia, ds, trab, editado: ed[dia] != null, base });
    }
    return lista;
  }

  function preencherSelectsMes() {
    $('#r-mes').innerHTML = MESES.map((m, i) => `<option value="${i + 1}">${m}</option>`).join('');
    const anoHoje = new Date().getFullYear();
    const anos = [];
    for (let a = Math.min(anoHoje, 2026); a <= Math.max(anoHoje, 2026) + 3; a++) anos.push(a);
    if (!anos.includes(estado.rodAno)) anos.push(estado.rodAno);
    $('#r-ano').innerHTML = anos.sort().map((a) => `<option value="${a}">${a}</option>`).join('');
  }

  function desenharRodizio() {
    const ano = estado.rodAno;
    const mes = estado.rodMes;
    const nDias = new Date(ano, mes, 0).getDate();
    const fase = repousosDoMes(ano, mes, nDias);
    const minimo = Math.ceil((fase.repousosSemana * nDias) / 7);
    const janela = R.descanso.domingoACadaSemanas[estado.atividade] || R.descanso.domingoACadaSemanas.outras;
    const vazio = diaDaSemana(ano, mes, 1);

    $('#r-resumo').innerHTML = `<p><strong>${MESES[mes - 1][0].toUpperCase() + MESES[mes - 1].slice(1)} de ${ano}</strong> tem ${nDias} dias. Pelas regras de ${fase.horasSemana}h, cada pessoa precisa de pelo menos <strong>${minimo} folgas</strong> no mês e de uma folga no domingo a cada ${janela} semanas${estado.atividade === 'comercio' ? ' (comércio)' : ''}.</p>`;

    $('#r-pessoas').innerHTML = estado.pessoas.map((p) => {
      const dias = mesDaPessoa(p, ano, mes, nDias);
      const folgas = dias.filter((d) => !d.trab).length;
      // dias seguidos
      let maior = 0, atual = 0, fimMaior = 0;
      dias.forEach((d) => { atual = d.trab ? atual + 1 : 0; if (atual > maior) { maior = atual; fimMaior = d.dia; } });
      // domingos
      const doms = dias.filter((d) => d.ds === 6);
      const domFolga = doms.filter((d) => !d.trab).length;
      let semDomingo = null;
      for (let i = 0; i + janela <= doms.length; i++) {
        if (doms.slice(i, i + janela).every((d) => d.trab)) { semDomingo = doms.slice(i, i + janela); break; }
      }
      const avisos = [];
      avisos.push(folgas >= minimo
        ? aviso(`${folgas} folgas no mês. O mínimo é ${minimo}.`, 'ok')
        : aviso(`Só ${folgas} folgas no mês. O mínimo é ${minimo}: faltam ${minimo - folgas}.`));
      if (maior > R.descanso.maxDiasSeguidos) {
        avisos.push(aviso(`${maior} dias seguidos de trabalho (do dia ${fimMaior - maior + 1} ao dia ${fimMaior}). O máximo é ${R.descanso.maxDiasSeguidos}.`));
      } else if (maior === R.descanso.maxDiasSeguidos) {
        avisos.push(aviso(`${maior} dias seguidos de trabalho (do dia ${fimMaior - maior + 1} ao dia ${fimMaior}). Só vale com regime de compensação previsto na convenção.`));
      } else {
        avisos.push(aviso(`No máximo ${maior} dias seguidos de trabalho.`, 'ok'));
      }
      avisos.push(semDomingo
        ? aviso(`Trabalha ${janela} domingos seguidos (dias ${semDomingo.map((d) => d.dia).join(', ')}). ${estado.atividade === 'comercio' ? 'No comércio' : 'Nesta atividade'}, a folga tem que cair no domingo pelo menos 1 vez a cada ${janela} semanas.`)
        : aviso(`${domFolga} de ${doms.length} domingos de folga.`, 'ok'));

      const celulas = [];
      for (let i = 0; i < vazio; i++) celulas.push('<li class="cal__vazio" aria-hidden="true"></li>');
      dias.forEach((d) => {
        const txt = d.trab ? (!d.base.folga && paraMin(d.base.ent) != null ? d.base.ent.replace(':', 'h').replace('h00', 'h') : 'Trab.') : 'Folga';
        celulas.push(`<li><button type="button" class="cal__dia${d.trab ? '' : ' cal__dia--folga'}${d.ds === 6 ? ' cal__dia--dom' : ''}${d.editado ? ' cal__dia--editado' : ''}" data-pid="${p.id}" data-dia="${d.dia}" aria-label="${d.dia} de ${MESES[mes - 1]}, ${DIAS_NOME[d.ds]}: ${d.trab ? 'trabalho' : 'folga'}. Tocar para trocar."><span class="cal__num">${d.dia}</span><span class="cal__txt">${txt}</span></button></li>`);
      });

      return `<article class="pessoa pessoa--mes">
        <div class="pessoa__cab">
          <h3 class="pessoa__nome">${esc(p.nome || 'Sem nome')}</h3>
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
    const pid = b.dataset.pid;
    const dia = Number(b.dataset.dia);
    const p = estado.pessoas.find((x) => x.id === pid);
    if (!p) return;
    const nDias = new Date(estado.rodAno, estado.rodMes, 0).getDate();
    const atual = mesDaPessoa(p, estado.rodAno, estado.rodMes, nDias)[dia - 1];
    const k = chaveMes();
    estado.rodEdicoes[k] = estado.rodEdicoes[k] || {};
    const ed = (estado.rodEdicoes[k][pid] = estado.rodEdicoes[k][pid] || {});
    const novoTrab = !atual.trab;
    const baseTrab = !atual.base.folga;
    if (novoTrab === baseTrab) delete ed[dia];
    else ed[dia] = novoTrab ? 'T' : 'F';
    salvar();
    desenharRodizio();
    const igual = $(`.cal__dia[data-pid="${pid}"][data-dia="${dia}"]`);
    if (igual) igual.focus();
  });
  $('#r-recopiar').addEventListener('click', () => {
    if (!confirm('Apagar as mudanças feitas neste mês e copiar de novo a escala da semana?')) return;
    delete estado.rodEdicoes[chaveMes()];
    salvar(); desenharRodizio();
  });

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
    let msg;
    if (c.falta > 0) msg = aviso(`Falta cobrir <strong>${c.falta} ${c.falta === 1 ? 'turno' : 'turnos'}</strong> por semana: reorganizar a escala, pagar hora extra ou contratar reforço.`);
    else if (c.falta < 0) msg = aviso(`A equipe dá conta e sobram ${-c.falta} ${-c.falta === 1 ? 'turno' : 'turnos'} por semana para cobrir férias e faltas.`, 'ok');
    else msg = aviso('A equipe dá conta certinho, sem sobra para cobrir férias e faltas.', 'ok');
    $('#q-resultado').innerHTML = `
      <dl class="numeros">
        <div><dt>Turnos necessários</dt><dd>${c.necessarios}</dd><dd class="numeros__conta">soma das pessoas nos ${abertos} dias abertos</dd></div>
        <div><dt>Turnos disponíveis</dt><dd>${c.disponiveis}</dd><dd class="numeros__conta">${c.func} ${c.func === 1 ? 'funcionário' : 'funcionários'} × ${R.equipe.diasPorFuncionario} dias</dd></div>
        <div><dt>Diferença</dt><dd>${c.falta > 0 ? '−' + c.falta : '+' + (-c.falta)}</dd><dd class="numeros__conta">${c.falta > 0 ? 'turnos faltando' : 'turnos sobrando'}</dd></div>
      </dl>
      <ul class="avisos">${msg}</ul>`;
    const usar = $('#f-usar-equipe');
    usar.hidden = c.falta <= 0;
    usar.textContent = `Usar o resultado de “Minha equipe dá conta?”: ${c.falta} ${c.falta === 1 ? 'turno' : 'turnos'}`;
  }

  /* =========================================================
     5. CUSTO DO REFORÇO
     ========================================================= */
  $('#f-usar-equipe').addEventListener('click', () => {
    const c = contaEquipe();
    if (c.falta > 0) { estado.refTurnos = String(c.falta); preencherCampos(); salvar(); calcularTudo(); }
  });

  function calcularReforco() {
    const fase = faseAtual();
    const turnos = Math.max(0, valor(estado.refTurnos) || 0);
    const hTurno = Math.max(0, valor(estado.refHoras) || 0);
    const sal = valor(estado.salario);
    const meio = valor(estado.refMeio);
    const enc = Math.max(0, valor(estado.refEnc) || 0);
    const out = $('#f-resultado');
    if (!(sal > 0) || !(meio > 0) || !(turnos > 0) || !(hTurno > 0)) {
      out.innerHTML = '<p class="vazio">Preencha os turnos, as horas, os dois salários para ver a comparação.</p>';
      return;
    }
    const semanas = R.equipe.semanasPorMes;
    const hSemana = turnos * hTurno;
    const hMes = hSemana * semanas;
    const hora = sal / fase.divisor;
    const custoExtra = hMes * hora * (1 + R.horaExtra.adicional);
    const custoMeio = meio * (1 + enc / 100);
    const dif = Math.abs(custoExtra - custoMeio);
    const extraGanha = custoExtra < custoMeio;
    const avisos = [];
    const limH = R.horaExtra.limiteDiaMin / 60;
    if (hTurno > limH) {
      const pessoasDia = Math.ceil(hTurno / limH);
      avisos.push(aviso(`Cada pessoa pode fazer no máximo ${numCurto(limH)}h extras por dia. Para cobrir um turno de ${numCurto(hTurno)}h só com hora extra, são ${pessoasDia} pessoas ficando ${numCurto(limH)}h a mais no mesmo dia.`));
    }
    if (hSemana > R.equipe.meioPeriodoMaxHorasSemana) {
      avisos.push(aviso(`São ${numCurto(hSemana)}h por semana. Meio período vai até ${R.equipe.meioPeriodoMaxHorasSemana}h por semana: uma pessoa só não cobre tudo.`));
    }
    avisos.push(aviso('A hora extra também aumenta férias, 13º e o repouso da semana. Esse acréscimo não entra nesta conta: confira com seu contador.', 'info'));

    out.innerHTML = `
      <p class="resultado__base">Buraco na escala: ${numCurto(turnos)} ${turnos === 1 ? 'turno' : 'turnos'} de ${numCurto(hTurno)}h por semana = ${numCurto(hSemana)}h por semana, ou ${num(hMes, 1)}h por mês (${num(semanas, 2)} semanas).</p>
      <div class="comparar">
        <div class="opcao${extraGanha ? ' opcao--melhor' : ''}">
          <h3>Hora extra</h3>
          <p class="opcao__valor">${R$(custoExtra)}<span> por mês</span></p>
          <p class="opcao__conta">${num(hMes, 1)}h × ${R$(hora)} × 1,5</p>
          ${extraGanha ? '<p class="opcao__selo">Mais barato</p>' : ''}
        </div>
        <div class="opcao${!extraGanha ? ' opcao--melhor' : ''}">
          <h3>Meio período</h3>
          <p class="opcao__valor">${R$(custoMeio)}<span> por mês</span></p>
          <p class="opcao__conta">${R$(meio)}${enc ? ` + ${numCurto(enc)}% de encargos` : ', sem encargos informados'}</p>
          ${!extraGanha ? '<p class="opcao__selo">Mais barato</p>' : ''}
        </div>
      </div>
      <p class="resultado__frase">${dif < 0.005 ? 'As duas opções custam o mesmo.' : `${extraGanha ? 'Pagar hora extra' : 'Contratar meio período'} sai <strong>${R$(dif)}</strong> mais barato por mês.`} Valor da hora pelas regras de ${fase.horasSemana}h (divisor ${fase.divisor}).</p>
      <ul class="avisos">${avisos.join('')}</ul>`;
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
      const sal = valor(estado.salario);
      if (!(sal > 0)) { out.innerHTML = '<p class="vazio">Escreva o salário mensal para ver o desconto.</p>'; return; }
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
          <div><dt>Repouso da semana sem falta</dt><dd>${R$(repouso)}</dd><dd class="numeros__conta">${numCurto(hs)}h ÷ 6 × ${R$(vh)}</dd></div>
          <div><dt>Horas não trabalhadas</dt><dd>${R$(naoPagas)}</dd><dd class="numeros__conta">${numCurto(horasPerdidas)}h que não são pagas</dd></div>
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
    abrirAba(ABAS.includes(location.hash.slice(1)) ? location.hash.slice(1) : estado.aba);
  }
  iniciar();
})();
