# Smoke test — Sprint 2: mobile-business

Checklist manual pra validar todas as superfícies do app antes de fechar
o sprint. Roda contra a API local (`pnpm --filter @barbearia/api dev`)
+ Neon dev branch.

## Pré-requisitos

- API rodando em `http://<seu-ip>:3333` (não usar `localhost` no device —
  ele resolve pro próprio celular, não pro Mac/PC)
- `EXPO_PUBLIC_API_URL` no `.env.local` da mobile-business apontando pro IP
  correto (com `http://` na frente)
- Pelo menos 1 tenant onboardado via web admin com:
  - 1 funcionário com role `admin_barber` (ou `barber`) cujo email bate com
    o user no Supabase
  - ≥1 service ativo no catálogo
  - BarbershopHours pelo menos pra 2 dias da semana

## Fluxos a verificar

### 1. Login + auto-link

- [ ] App abre em `/login` quando sem sessão (cold start, AsyncStorage vazio)
- [ ] Login com credenciais inválidas mostra erro embaixo do form
- [ ] Login com credenciais válidas leva pra `/inicio` em ≤2s
- [ ] Após login, refresh da tela (Cmd+R no Expo Go) NÃO pede login de novo
  (sessão persistida)

### 2. Sem vínculo

- [ ] Login com email Supabase que NÃO tem Employee correspondente
  → cai em `/sem-vinculo` com mensagem clara
- [ ] Botão "Tentar de novo" re-tenta `/me/employee/link` (testar criando o
  Employee no admin web e voltando)
- [ ] Botão "Sair" volta pra `/login`

### 3. Início

- [ ] Mostra nome correto (employee.displayName, primeiro nome no header)
- [ ] Mostra tenant.name + barbershop.name + role label correto
- [ ] Banner "0 pendentes" aparece (placeholder Sprint 4)
- [ ] 3 menu rows navegam pras telas certas
- [ ] Botão "Sair" volta pra `/login`

### 4. Perfil

- [ ] displayName pré-preenchido com valor atual
- [ ] Botão "Salvar" desabilitado quando sem mudança
- [ ] Botão "Salvar" desabilitado se nome <2 chars
- [ ] Salvar com sucesso → flash "Salvo!" por 2s + nome atualiza no header
- [ ] Campos read-only mostram email/role/status/barbearia corretos
- [ ] Salvar com rede caída → erro embaixo do form, nada quebra

### 5. Serviços

- [ ] Lista todos os services ativos do tenant
- [ ] Pre-marca os que já são "mine" (capabilities atuais)
- [ ] Toggle muda visual (border + check)
- [ ] Footer mostra contagem "X de Y marcados"
- [ ] Botão "Salvar" só habilita se houve mudança
- [ ] Salvar → flash + state reflete novo conjunto
- [ ] Empty state se tenant não tem services ativos

### 6. Agenda

- [ ] 7 dias listados (segunda...domingo), labels em pt-BR
- [ ] Dia sem faixa mostra "Não atende" em itálico
- [ ] "+ Adicionar faixa" cria range default 09:00-18:00
- [ ] Editar input aceita formato `09:00` e `0900` (auto-format pra `09:00`)
- [ ] Lixeira remove faixa
- [ ] Salvar com formato inválido → erro específico citando o dia
- [ ] Salvar com closesAt ≤ opensAt → erro específico citando o dia
- [ ] Salvar OK → flash "Salvo!" + GET refetch confirma ordem persistida
- [ ] Dia sem nenhuma faixa salva (deleta todas as faixas daquele dia)
- [ ] Múltiplas faixas no mesmo dia (manhã + tarde) persistem corretamente

### 7. Offline indicator (Phase 5)

- [ ] Desligar wifi/dados → banner vermelho "Sem conexão" aparece no topo
- [ ] Ligar wifi → banner some
- [ ] Banner aparece em todas as rotas (login, inicio, perfil, etc)
- [ ] Tentar salvar offline → erro de fetch na tela (não trava o app)

### 8. Sessão expirada (401)

- [ ] Forçar token Supabase inválido (ex: editar AsyncStorage no devtools)
- [ ] Chamada autenticada falha → app volta pra `/login` automaticamente
- [ ] Re-login funciona

### 9. Permission UX

- [ ] User com role `barber` (sem admin) ainda consegue editar perfil,
  serviços e agenda (são endpoints `/me/*`, não dependem de role admin)

### 10. Cross-platform

- [ ] iOS: status bar não sobrepõe header (banner offline empurra)
- [ ] Android: idem
- [ ] Web (`pnpm --filter @barbearia/mobile-business web`): renderiza sem
  crash em pelo menos a tela `/inicio` (NetInfo usa `navigator.onLine`)

## Bugs conhecidos / não-objetivos

- Push notifications (Sprint 8+)
- Appointments / slots calculation (Sprint 4)
- Reset de senha (Sprint posterior — usuário pede pro admin reenviar
  convite por enquanto)
- Idempotency-Key headers (postponed — não há endpoint não-idempotente
  ainda; aplicar quando criar `POST /appointments` no Sprint 4)
