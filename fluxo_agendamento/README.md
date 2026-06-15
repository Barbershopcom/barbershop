# Fluxo de Agendamento — NAVALHA (cliente)

Pasta com **tudo do fluxo de quem está agendando** (o cliente), pronta pra mandar ao Claude Code.

## Conteúdo
- **`screenshots/`** — print de cada tela do funil, em ordem (01 → 12).
- **`icons/`** — todos os ícones usados no fluxo, em SVG (24×24, traço `#1c1917`; recoloríveis via `currentColor`/`stroke`).
- **`images/`** — elementos gráficos do app (promo card, avatar monograma, banner da barbearia, padrão de listras barber).
- **`logo/`** — o selo da marca, o barber pole e o lockup completo (selo + wordmark + tagline).
- **`index.html`** — folha de índice visual: abra no navegador pra ver logo + ícones + imagens + os 12 prints juntos.

## O funil (ordem das telas)
| # | Tela | Arquivo |
|---|---|---|
| 01 | Login | `screenshots/01-login.png` |
| 02 | Home | `screenshots/02-home.png` |
| 03 | Busca de barbearia | `screenshots/03-busca.png` |
| 04 | Página da barbearia | `screenshots/04-barbearia.png` |
| 05 | Agendar · escolher serviços | `screenshots/05-agendar-servicos.png` |
| 06 | Agendar · escolher barbeiro | `screenshots/06-agendar-barbeiro.png` |
| 07 | Agendar · dia e hora | `screenshots/07-agendar-dia-hora.png` |
| 08 | Pagamento (checkout comanda) | `screenshots/08-pagamento.png` |
| 09 | Pix (status do pagamento) | `screenshots/09-pix.png` |
| 10 | Sucesso do agendamento | `screenshots/10-sucesso.png` |
| 11 | Histórico de agendamentos | `screenshots/11-historico.png` |
| 12 | Detalhe do agendamento | `screenshots/12-detalhe.png` |

> Cascata do agendamento: escolher serviço → barbeiro filtrado pelos serviços → dia/hora disponível pro barbeiro → pagamento → status → histórico. Mudar um passo anterior reseta os seguintes.

## Marca / tokens rápidos
- **Cores:** navy `#1a365d` · vermelho `#bf212f` · dourado `#c5a059` · papel `#fffcf5` · tinta `#1c1917`.
- **Status:** Pendente `#F59E0B` · Confirmado `#1a365d` · Concluído `#10B981` · Cancelado `#94A3B8` · Expirado `#bf212f` · No-show `#D97706`.
- **Fontes:** Bebas Neue (títulos/números) · Lora *itálico* (legendas) · Inter (UI). Todas Google Fonts.

## Notas sobre os assets
- Os ícones são **SVG de traço** (`stroke`), 24×24, prontos pra virar um icon set (ex.: lucide/react-native-svg). Os coloridos (`estrela`, `whatsapp`, `check-circulo`, `pix`) já vêm com a cor da marca.
- As **imagens não são fotos** — no produto, as fotos reais (logo da barbearia, fotos de barbeiros, mapa) entram no lugar dos placeholders. Os avatares são monogramas coloridos; promos e banners são gráficos vetoriais.
- O **logo** está em 3 formatos: `navalha-selo.svg` (marca), `barber-pole.svg` (símbolo) e `navalha-lockup.svg` (assinatura completa — usa as fontes via `@import`, então renderize num navegador com internet pra ver a wordmark).
- Os prints saíram dos protótipos hi-fi dentro de uma moldura de iPhone — a moldura é **só apresentação**, não faz parte do produto.
