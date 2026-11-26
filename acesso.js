/*
  DADOS DAS PÁGINAS DE ACESSO — o único arquivo que você precisa mudar.

  - Datas, nomes de arquivo, links e o e-mail de suporte ficam aqui.
  - Arquivo pode ser um caminho na pasta /arquivos/ (começa com ../) ou um link do Google Drive
    (o arquivo precisa estar compartilhado como "Qualquer pessoa com o link").
  - Se um PDF da pasta /arquivos/ ainda não existir, o botão aparece como "Em breve".
  - suporteEmail: vazio = botão "Suporte em breve".
*/
window.ACESSO = {
  produto: 'Mapa Fácil da Escala 5x2',
  atualizadoEm: '25/11/2026',
  baseLegal: 'de acordo com a EC 141/2026, o Decreto 13.173/2026 e a Portaria MTE 2.041/2026',

  suporteEmail: 'planilhas@triux.com.br',
  assuntoSuporte: 'Ajuda com o Mapa Fácil da Escala 5x2',
  mensagemSuporte: 'Olá! Comprei o Mapa Fácil da Escala 5x2 e preciso de ajuda.',

  calculadora: 'https://mapafaciltriux.vercel.app/#inicio',

  arquivos: {
    guia: 'https://drive.google.com/file/d/1Y9eBEFPfkdWkPNgHQW0lpDiq6FA5xPl2/view?usp=sharing',
    modelos: 'https://drive.google.com/file/d/1gzGJ7xClkACEZ8z_C0ZcWUTek28_MxIe/view?usp=sharing',
    kit: 'https://drive.google.com/file/d/1CqkleGVpM6Km6jm-9Ph0n5pqbCbgwsGV/view?usp=sharing'
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
