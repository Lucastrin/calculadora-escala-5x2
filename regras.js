/*
  REGRAS DA CALCULADORA — o único arquivo que você precisa mudar se a lei mudar.

  Revisado em 25/11/2026.
  Fontes: EC 141/2026, Decreto 13.173/2026, Portaria MTE 2.041/2026 e CLT.

  Como editar:
  - Datas sempre no formato 'AAAA-MM-DD'.
  - Tempos sempre em MINUTOS (8h24 = 504, 8h = 480, 11h = 660).
  - Percentuais como fração (50% = 0.5, 100% = 1).
  - Textos entre aspas aparecem na tela do jeito que estão escritos.
*/
window.REGRAS = {
  revisadoEm: '25/11/2026',
  fontes: 'EC 141/2026, Decreto 13.173/2026, Portaria MTE 2.041/2026',

  /* Fases da redução da jornada. A ferramenta escolhe a fase pela data informada.
     inicio: null = desde sempre; fim: null = sem data para acabar. */
  fases: [
    {
      id: '44h',
      inicio: null,
      fim: '2026-12-15',
      horasSemana: 44,
      divisor: 220,
      repousosSemana: 1,
      // Regra anterior (CLT art. 58): 8h por dia. Acima disso, só com acordo de compensação.
      limiteDiaMin: 480,
      alertaDia: 'passou de 8h no dia. Acima disso, só com acordo de compensação (até 8h48 em 5 dias) ou como hora extra.'
    },
    {
      id: '42h',
      inicio: '2026-12-16',
      fim: '2027-12-15',
      horasSemana: 42,
      divisor: 210,
      repousosSemana: 2,
      // Até 8h24 por dia em 5 dias vale mesmo sem convenção (liminar do STF, ainda sujeita a julgamento).
      limiteDiaMin: 504,
      alertaDia: 'passou de 8h24 no dia. Jornada desigual exige convenção ou acordo coletivo.'
    },
    {
      id: '40h',
      inicio: '2027-12-16',
      fim: null,
      horasSemana: 40,
      divisor: 200,
      repousosSemana: 2,
      limiteDiaMin: 480,
      alertaDia: 'passou de 8h no dia. Jornada desigual exige convenção ou acordo coletivo.'
    }
  ],

  horaExtra: {
    adicional: 0.5,          // mínimo de 50%
    adicionalDobro: 1.0,     // repouso ou feriado trabalhado sem folga na semana: 100%
    limiteDiaMin: 120        // no máximo 2h extras por dia
  },

  descanso: {
    entreJornadasMin: 660,   // 11h entre o fim de uma jornada e o começo da próxima
    // Intervalo para refeição, pela duração da jornada (em minutos trabalhados).
    intervalo: [
      { jornadaAteMin: 240, minimoMin: 0 },
      { jornadaAteMin: 360, minimoMin: 15 },
      { jornadaAteMin: Infinity, minimoMin: 60, minimoComConvencaoMin: 30 }
    ],
    maxDiasSeguidos: 6,      // 6 dias seguidos só com regime de compensação na convenção
    // Folgas mínimas no mês = arredondar para cima (repousos por semana × dias do mês ÷ 7).
    // Num mês que junta duas fases, vale a fase com mais repousos.
    domingoACadaSemanas: {
      comercio: 3,
      outras: 4
    }
  },

  salario: {
    diasDoMesMensalista: 30, // o dia do mensalista = salário ÷ 30
    // Os repousos da semana valem juntos 1 dia de trabalho (mensalista: salário ÷ 30).
    repousoEmDias: 1,
    repousoHorista: 1 / 6    // horista: repouso = 1/6 das horas da semana × valor da hora
  },

  equipe: {
    diasPorFuncionario: 5,   // escala 5x2: cada pessoa cobre 5 dias por semana
    semanasPorMes: 4.33,     // média de semanas em um mês
    meioPeriodoMaxHorasSemana: 30
  },

  maxPessoasNaEscala: 10,

  /* Antes desta data, a calculadora já abre planejando a nova regra. */
  planejamento: {
    dataPadraoMinima: '2026-12-16',
    aviso: 'Você está planejando a nova regra, que começa em 16/12/2026.'
  },

  /* Feriados nacionais mostrados no rodízio do mês.
     fixos: todo ano no mesmo dia ('MM-DD'). moveis: data completa ('AAAA-MM-DD'). */
  feriados: {
    fixos: [
      { dia: '01-01', nome: 'Confraternização Universal' },
      { dia: '04-21', nome: 'Tiradentes' },
      { dia: '05-01', nome: 'Dia do Trabalho' },
      { dia: '09-07', nome: 'Independência do Brasil' },
      { dia: '10-12', nome: 'Nossa Senhora Aparecida' },
      { dia: '11-02', nome: 'Finados' },
      { dia: '11-15', nome: 'Proclamação da República' },
      { dia: '11-20', nome: 'Dia Nacional de Zumbi e da Consciência Negra' },
      { dia: '12-25', nome: 'Natal' }
    ],
    moveis: [
      { data: '2026-04-03', nome: 'Sexta-feira Santa' },
      { data: '2027-03-26', nome: 'Sexta-feira Santa' },
      { data: '2028-04-14', nome: 'Sexta-feira Santa' }
    ],
    aviso: 'Feriado trabalhado sem folga na semana é pago em dobro. Feriado no comércio depende da convenção da sua categoria.'
  },

  /* Turnos prontos da escala da semana (Manhã, Tarde, Integral).
     A duração segue o limite diário da fase + o intervalo. Se o assistente já tem o horário
     do negócio, Manhã começa na abertura e Tarde termina no fechamento. */
  turnosProntos: {
    manhaInicio: '07:00',
    tardeFim: '22:00',
    integralInicio: '08:00',
    intervaloMin: 60
  },

  /* Modelos do assistente. Tudo pode ser mudado na tela.
     dias e pessoas: SEG, TER, QUA, QUI, SEX, SÁB, DOM.
     turnos: 1 = todos no mesmo horário; 2 = manhã e tarde (cada pessoa fica sempre no seu).
     pausa: horário em que o negócio fecha no meio do dia (ou null).
     horarios: dias com horário diferente do padrão, pelo número do dia (0 = SEG ... 6 = DOM). */
  modelos: {
    loja:        { nome: 'Loja',        atividade: 'comercio', turnos: 1, abre: '09:00', fecha: '18:00', pausa: null,
                   dias: [1, 1, 1, 1, 1, 1, 0], pessoas: [2, 2, 2, 2, 2, 3, 0], horarios: { 5: ['09:00', '13:00'] } },
    mercado:     { nome: 'Mercado',     atividade: 'comercio', turnos: 2, abre: '07:00', fecha: '21:00', pausa: null,
                   dias: [1, 1, 1, 1, 1, 1, 1], pessoas: [3, 3, 3, 3, 3, 4, 4], horarios: { 6: ['07:00', '13:00'] } },
    padaria:     { nome: 'Padaria',     atividade: 'comercio', turnos: 2, abre: '06:00', fecha: '20:00', pausa: null,
                   dias: [1, 1, 1, 1, 1, 1, 1], pessoas: [3, 3, 3, 3, 3, 3, 3], horarios: { 6: ['06:00', '12:00'] } },
    restaurante: { nome: 'Restaurante', atividade: 'comercio', turnos: 1, abre: '11:00', fecha: '23:00', pausa: ['15:00', '18:00'],
                   dias: [0, 1, 1, 1, 1, 1, 1], pessoas: [0, 3, 3, 3, 4, 4, 4] },
    outro:       { nome: 'Outro',       atividade: 'outras',   turnos: 1, abre: '08:00', fecha: '17:00', pausa: null,
                   dias: [1, 1, 1, 1, 1, 0, 0], pessoas: [2, 2, 2, 2, 2, 0, 0] }
  },

  /* Intervalo acima disto só com acordo escrito ou convenção (CLT art. 71). Só gera uma nota no assistente. */
  intervaloMaximoSemAcordoMin: 120,

  /* Conferência de digitação: salário fora desta faixa mostra "Confira o salário" e os custos esperam a correção. */
  conferenciaSalario: { minimo: 1000, maximo: 50000 }
};
