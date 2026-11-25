# Calculadora de Escala e Horas — Mapa Fácil da Escala 5x2

Bônus do guia para donos de pequenos negócios. Roda 100% no navegador, sem login e sem servidor; os dados ficam no próprio aparelho (localStorage).

A tela inicial (`#inicio`) é um assistente de 4 passos: o que muda, seu negócio, sua equipe e a escala pronta. Ele gera a escala da semana e o rodízio do mês respeitando as regras e confere tudo com as mesmas validações das ferramentas.

Ferramentas: Quanto vale a hora · Monte a escala da semana · Rodízio do mês · Minha equipe dá conta? · Custo do reforço · Desconto por falta.

## Quando a lei mudar

Toda regra está em **`regras.js`**: datas das fases, divisores, limites diários, descansos, adicionais, percentuais, feriados nacionais, a data padrão do planejamento e os modelos de negócio do assistente. Edite só esse arquivo, salve e publique de novo. Tempos estão em minutos (8h24 = 504) e percentuais em fração (50% = 0.5).

## Arquivos

- `index.html`: a página
- `regras.js`: regras de negócio
- `app.js`: cálculos e tela
- `estilo.css`: visual e impressão

Ferramenta de apoio ao planejamento. Não substitui contador, DP ou advogado.
