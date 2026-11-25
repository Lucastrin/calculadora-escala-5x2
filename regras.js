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

  maxPessoasNaEscala: 10
};
