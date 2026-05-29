---
name: break-spec
description: |
  Use quando existir uma spec macro jÃ¡ criada em plans/ e for necessÃ¡rio quebrÃ¡-la em etapas menores de execuÃ§Ã£o (micro-specs) mantendo o contexto global.

  Use quando:
  - hÃ¡ uma spec grande pronta
  - Ã© necessÃ¡rio transformar em etapas sequenciais de implementaÃ§Ã£o
  - hÃ¡ risco de perder contexto arquitetural ao implementar direto

  NÃƒO use quando:
  - a spec ainda nÃ£o existe
  - a tarefa Ã© pequena e nÃ£o precisa decomposiÃ§Ã£o
  - jÃ¡ existem tasks bem definidas
---

# Break Spec â€” DecomposiÃ§Ã£o de Spec Macro

## Objetivo

Transformar uma spec macro em etapas menores de execuÃ§Ã£o (micro-specs),
preservando integralmente o contexto, requisitos e comportamento da feature,
sem perda, simplificaÃ§Ã£o ou reinterpretaÃ§Ã£o.

---

## Entrada

Argumento obrigatÃ³rio:

$ARGUMENTS â†’ nome do arquivo da spec (ex: feature-x.md)

A spec deve estar localizada em:

plans/

---

## PrÃ©-condiÃ§Ãµes

Antes de executar:

1. Verificar se o arquivo existe em `plans/`
2. Ler completamente a spec macro
3. Identificar:
   - objetivo da feature
   - resultado final esperado
   - regras de negÃ³cio
   - restriÃ§Ãµes
   - o que nÃ£o pode quebrar

4. Identificar EXPLICITAMENTE os requisitos crÃ­ticos da spec, incluindo:
   - regras obrigatÃ³rias (non-negotiable constraints)
   - instruÃ§Ãµes de execuÃ§Ã£o
   - regras de permissÃ£o e acesso
   - regras de UI/comportamento
   - qualquer item marcado como MUST, REQUIRED ou equivalente

5. Identificar TODAS as referÃªncias externas mencionadas na spec:
   - arquivos de design (ex: Figma via MCP)
   - contratos de API
   - documentaÃ§Ã£o externa
   - qualquer fonte declarada como source of truth

6. Mapear:
   - onde cada requisito crÃ­tico aparece na spec
   - quais partes da spec dependem de cada referÃªncia externa

Se alguma dessas informaÃ§Ãµes nÃ£o estiver clara:
â†’ parar e informar inconsistÃªncia

---

## ExecuÃ§Ã£o

### 1. Criar pasta de saÃ­da

Criar uma pasta com o mesmo nome da spec (sem extensÃ£o):

plans/<nome-da-spec>/

---

### 2. Gerar plano mestre

Criar arquivo:

00-master-plan.md

ConteÃºdo:

- resumo da feature
- objetivo geral
- resultado final esperado
- lista sequencial das etapas
- dependÃªncia entre etapas

Adicional obrigatÃ³rio:

- lista completa dos requisitos crÃ­ticos (sem resumo)
- lista completa das referÃªncias externas
- mapeamento de quais etapas dependem de quais requisitos e referÃªncias

---

### 3. Quebrar em micro-specs

Gerar entre 6 e 10 etapas.

Cada etapa deve ser funcional (nÃ£o tÃ©cnica isolada).

Criar arquivos:

01-<nome>.md  
02-<nome>.md  
...

---

### 4. Estrutura obrigatÃ³ria de cada micro-spec

Cada arquivo deve conter:

## Contexto

Qual parte da feature essa etapa atende

## Objetivo da etapa

O que serÃ¡ entregue

## RelaÃ§Ã£o com o todo

Como isso contribui para o resultado final

## Escopo

O que entra nesta etapa

## NÃ£o pode quebrar

Regras globais que devem ser respeitadas

OBRIGATÃ“RIO:

- Incluir TODOS os requisitos crÃ­ticos aplicÃ¡veis Ã  etapa
- Preservar o texto original ou equivalente sem perda de significado
- NÃƒO simplificar
- NÃƒO reinterpretar
- NÃƒO reduzir nÃ­vel de obrigatoriedade (MUST continua MUST)

- Incluir TODAS as referÃªncias externas utilizadas nesta etapa
- Se uma referÃªncia externa influencia comportamento, ela DEVE estar explÃ­cita

## Resultado esperado

Estado final apÃ³s a etapa

## CritÃ©rios de aceite

Como validar que a etapa foi concluÃ­da

## DependÃªncias

Etapas anteriores necessÃ¡rias

## Rastreabilidade

- Listar quais requisitos da spec original estÃ£o sendo atendidos nesta etapa
- Referenciar explicitamente (por seÃ§Ã£o ou descriÃ§Ã£o)

---

## Regras de decomposiÃ§Ã£o

- NÃ£o quebrar por arquivo tÃ©cnico
- NÃ£o quebrar por funÃ§Ã£o isolada
- Quebrar por valor funcional
- Cada etapa deve ser validÃ¡vel isoladamente
- Manter contexto global em todas as etapas

REGRAS CRÃTICAS:

- Nenhum requisito pode ser omitido
- Nenhum requisito pode ser enfraquecido
- Nenhum requisito pode ser reinterpretado
- Requisitos crÃ­ticos DEVEM ser repetidos sempre que aplicÃ¡veis

AtualizaÃ§Ã£o da regra de duplicaÃ§Ã£o:

- Evitar duplicaÃ§Ã£o desnecessÃ¡ria
- MAS duplicaÃ§Ã£o de requisitos crÃ­ticos Ã© obrigatÃ³ria quando necessÃ¡rio

---

## PreservaÃ§Ã£o de Requisitos CrÃ­ticos

O agente DEVE garantir que:

- Nenhum requisito obrigatÃ³rio seja perdido
- Nenhuma regra marcada como MUST seja convertida em SHOULD ou equivalente
- Nenhuma instruÃ§Ã£o seja simplificada a ponto de alterar comportamento
- O resultado final das micro-specs seja funcionalmente idÃªntico Ã  spec original

---

## Tratamento de ReferÃªncias Externas

- TODAS as referÃªncias externas da spec original DEVEM ser preservadas
- Se uma referÃªncia externa impacta uma etapa, ela DEVE aparecer na micro-spec
- Se uma referÃªncia externa Ã© definida como source of truth:
  - ela se torna automaticamente um requisito nÃ£o-negociÃ¡vel
  - deve ser tratada com o mesmo nÃ­vel de obrigatoriedade que regras MUST

- NÃƒO inferir novas referÃªncias externas
- NÃƒO remover referÃªncias existentes

---

## RestriÃ§Ãµes

- NÃ£o implementar cÃ³digo
- NÃ£o alterar a spec original
- NÃ£o inventar arquitetura
- NÃ£o assumir comportamento nÃ£o descrito
- NÃ£o criar tarefas tÃ©cnicas desconectadas do valor
- NÃƒO omitir requisitos crÃ­ticos
- NÃƒO reinterpretar requisitos
- NÃƒO omitir referÃªncias externas

---

## VerificaÃ§Ã£o de Integridade (OBRIGATÃ“RIO)

ApÃ³s gerar as micro-specs, o agente DEVE validar:

1. Cobertura completa:
   - Todos os requisitos da spec original estÃ£o presentes em pelo menos uma etapa

2. PreservaÃ§Ã£o:
   - Nenhum requisito foi perdido
   - Nenhum requisito foi enfraquecido
   - Nenhuma regra MUST foi alterada

3. ReferÃªncias externas:
   - Todas as referÃªncias foram preservadas
   - Todas as referÃªncias aplicÃ¡veis aparecem nas etapas corretas

4. EquivalÃªncia funcional:
   - Executar todas as micro-specs resulta no mesmo comportamento da spec original

5. Rastreabilidade:
   - Cada requisito da spec original pode ser rastreado para pelo menos uma micro-spec

Se qualquer item falhar:
â†’ PARAR e reportar inconsistÃªncia

---

## Output

Entregar:

1. Caminho da pasta criada
2. Lista de arquivos gerados
3. Resumo das etapas criadas
4. ConfirmaÃ§Ã£o de coerÃªncia com a spec original
5. Mapeamento de requisitos â†’ micro-specs
6. ConfirmaÃ§Ã£o explÃ­cita de preservaÃ§Ã£o total dos requisitos
7. ConfirmaÃ§Ã£o explÃ­cita de preservaÃ§Ã£o das referÃªncias externas

---

## Erros

Se o arquivo nÃ£o existir:
â†’ informar erro e parar

Se a spec for insuficiente:
â†’ listar lacunas e parar

Se houver ambiguidade:
â†’ apontar antes de continuar

Se qualquer requisito for perdido, alterado ou enfraquecido:
â†’ erro crÃ­tico e parar execuÃ§Ã£o

Se qualquer referÃªncia externa for omitida:
â†’ erro crÃ­tico e parar execuÃ§Ã£o

Se nÃ£o for possÃ­vel garantir equivalÃªncia funcional:
â†’ erro crÃ­tico e parar execuÃ§Ã£o
