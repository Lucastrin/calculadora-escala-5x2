/*
  DADOS DAS PÁGINAS DE ACESSO — o único arquivo que você precisa mudar.

  - Datas, nomes de arquivo, links e o número de suporte ficam aqui.
  - Caminhos de arquivo são relativos à página de acesso (por isso começam com ../).
  - Se um PDF ainda não estiver na pasta /arquivos/, o botão aparece como "Em breve".
  - suporteWhatsApp: só números, com DDI e DDD (ex.: 5511999998888). Vazio = botão "Suporte em breve".
*/
window.ACESSO = {
  produto: 'Mapa Fácil da Escala 5x2',
  atualizadoEm: '25/11/2026',
  baseLegal: 'de acordo com a EC 141/2026, o Decreto 13.173/2026 e a Portaria MTE 2.041/2026',

  suporteWhatsApp: '',
  mensagemSuporte: 'Olá! Comprei o Mapa Fácil da Escala 5x2 e preciso de ajuda.',

  calculadora: '../#inicio',

  arquivos: {
    guia: '../arquivos/mapa-facil-escala-5x2.pdf',
    modelos: '../arquivos/modelos-de-escala.pdf',
    kit: '../arquivos/kit-dezembro.pdf'
  },

  itens: {
    guia: {
      titulo: 'Guia Mapa Fácil (PDF)',
      descricao: 'O que muda, folgas, domingo, feriado e hora extra',
      icone: 'guia',
      arquivo: 'guia'
    },
    calculadora: {
      titulo: 'Calculadora de Escala e Horas',
      descricao: 'Monte a escala da sua equipe em 2 minutos',
      icone: 'calc',
      link: 'calculadora',
      botao: 'Abrir a calculadora'
    },
    modelos: {
      titulo: 'Modelos de escala',
      descricao: 'Mercado, loja, padaria e restaurante',
      icone: 'modelos',
      arquivo: 'modelos'
    },
    kit: {
      titulo: 'Kit Dezembro',
      descricao: 'Natal, Ano Novo e a virada para a nova regra em 16/12',
      icone: 'kit',
      arquivo: 'kit'
    }
  },

  planos: {
    basico: {
      nome: 'Plano Básico',
      itens: ['guia']
    },
    completo: {
      nome: 'Plano Completo',
      itens: ['guia', 'calculadora', 'modelos', 'kit']
    }
  }
};
