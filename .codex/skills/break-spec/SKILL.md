---
name: break-spec
description: |
  Use quando existir uma spec macro já criada em .context/plans/ e for necessário quebrá-la em etapas menores de execução (micro-specs) mantendo o contexto global.

  Use quando:
  - há uma spec grande pronta
  - é necessário transformar em etapas sequenciais de implementação
  - há risco de perder contexto arquitetural ao implementar direto

  NÃO use quando:
  - a spec ainda não existe
  - a tarefa é pequena e não precisa decomposição
  - já existem tasks bem definidas
---

# Break Spec — Decomposição de Spec Macro

## Objetivo

Transformar uma spec macro em etapas menores de execução (micro-specs),
preservando integralmente o contexto, requisitos e comportamento da feature,
sem perda, simplificação ou reinterpretação.

---

## Entrada

Argumento obrigatório:

$ARGUMENTS → nome do arquivo da spec (ex: feature-x.md)

A spec deve estar localizada em:

.context/plans/

---

## Pré-condições

Antes de executar:

1. Verificar se o arquivo existe em `.context/plans/`
2. Ler completamente a spec macro
3. Identificar:
   - objetivo da feature
   - resultado final esperado
   - regras de negócio
   - restrições
   - o que não pode quebrar

4. Identificar EXPLICITAMENTE os requisitos críticos da spec, incluindo:
   - regras obrigatórias (non-negotiable constraints)
   - instruções de execução
   - regras de permissão e acesso
   - regras de UI/comportamento
   - qualquer item marcado como MUST, REQUIRED ou equivalente

5. Identificar TODAS as referências externas mencionadas na spec:
   - arquivos de design (ex: Figma via MCP)
   - contratos de API
   - documentação externa
   - qualquer fonte declarada como source of truth

6. Mapear:
   - onde cada requisito crítico aparece na spec
   - quais partes da spec dependem de cada referência externa

Se alguma dessas informações não estiver clara:
→ parar e informar inconsistência

---

## Execução

### 1. Criar pasta de saída

Criar uma pasta com o mesmo nome da spec (sem extensão):

.context/plans/<nome-da-spec>/

---

### 2. Gerar plano mestre

Criar arquivo:

00-master-plan.md

Conteúdo:

- resumo da feature
- objetivo geral
- resultado final esperado
- lista sequencial das etapas
- dependência entre etapas

Adicional obrigatório:

- lista completa dos requisitos críticos (sem resumo)
- lista completa das referências externas
- mapeamento de quais etapas dependem de quais requisitos e referências

---

### 3. Quebrar em micro-specs

Gerar entre 6 e 10 etapas.

Cada etapa deve ser funcional (não técnica isolada).

Criar arquivos:

01-<nome>.md  
02-<nome>.md  
...

---

### 4. Estrutura obrigatória de cada micro-spec

Cada arquivo deve conter:

## Contexto

Qual parte da feature essa etapa atende

## Objetivo da etapa

O que será entregue

## Relação com o todo

Como isso contribui para o resultado final

## Escopo

O que entra nesta etapa

## Não pode quebrar

Regras globais que devem ser respeitadas

OBRIGATÓRIO:

- Incluir TODOS os requisitos críticos aplicáveis à etapa
- Preservar o texto original ou equivalente sem perda de significado
- NÃO simplificar
- NÃO reinterpretar
- NÃO reduzir nível de obrigatoriedade (MUST continua MUST)

- Incluir TODAS as referências externas utilizadas nesta etapa
- Se uma referência externa influencia comportamento, ela DEVE estar explícita

## Resultado esperado

Estado final após a etapa

## Critérios de aceite

Como validar que a etapa foi concluída

## Dependências

Etapas anteriores necessárias

## Rastreabilidade

- Listar quais requisitos da spec original estão sendo atendidos nesta etapa
- Referenciar explicitamente (por seção ou descrição)

---

## Regras de decomposição

- Não quebrar por arquivo técnico
- Não quebrar por função isolada
- Quebrar por valor funcional
- Cada etapa deve ser validável isoladamente
- Manter contexto global em todas as etapas

REGRAS CRÍTICAS:

- Nenhum requisito pode ser omitido
- Nenhum requisito pode ser enfraquecido
- Nenhum requisito pode ser reinterpretado
- Requisitos críticos DEVEM ser repetidos sempre que aplicáveis

Atualização da regra de duplicação:

- Evitar duplicação desnecessária
- MAS duplicação de requisitos críticos é obrigatória quando necessário

---

## Preservação de Requisitos Críticos

O agente DEVE garantir que:

- Nenhum requisito obrigatório seja perdido
- Nenhuma regra marcada como MUST seja convertida em SHOULD ou equivalente
- Nenhuma instrução seja simplificada a ponto de alterar comportamento
- O resultado final das micro-specs seja funcionalmente idêntico à spec original

---

## Tratamento de Referências Externas

- TODAS as referências externas da spec original DEVEM ser preservadas
- Se uma referência externa impacta uma etapa, ela DEVE aparecer na micro-spec
- Se uma referência externa é definida como source of truth:
  - ela se torna automaticamente um requisito não-negociável
  - deve ser tratada com o mesmo nível de obrigatoriedade que regras MUST

- NÃO inferir novas referências externas
- NÃO remover referências existentes

---

## Restrições

- Não implementar código
- Não alterar a spec original
- Não inventar arquitetura
- Não assumir comportamento não descrito
- Não criar tarefas técnicas desconectadas do valor
- NÃO omitir requisitos críticos
- NÃO reinterpretar requisitos
- NÃO omitir referências externas

---

## Verificação de Integridade (OBRIGATÓRIO)

Após gerar as micro-specs, o agente DEVE validar:

1. Cobertura completa:
   - Todos os requisitos da spec original estão presentes em pelo menos uma etapa

2. Preservação:
   - Nenhum requisito foi perdido
   - Nenhum requisito foi enfraquecido
   - Nenhuma regra MUST foi alterada

3. Referências externas:
   - Todas as referências foram preservadas
   - Todas as referências aplicáveis aparecem nas etapas corretas

4. Equivalência funcional:
   - Executar todas as micro-specs resulta no mesmo comportamento da spec original

5. Rastreabilidade:
   - Cada requisito da spec original pode ser rastreado para pelo menos uma micro-spec

Se qualquer item falhar:
→ PARAR e reportar inconsistência

---

## Output

Entregar:

1. Caminho da pasta criada
2. Lista de arquivos gerados
3. Resumo das etapas criadas
4. Confirmação de coerência com a spec original
5. Mapeamento de requisitos → micro-specs
6. Confirmação explícita de preservação total dos requisitos
7. Confirmação explícita de preservação das referências externas

---

## Erros

Se o arquivo não existir:
→ informar erro e parar

Se a spec for insuficiente:
→ listar lacunas e parar

Se houver ambiguidade:
→ apontar antes de continuar

Se qualquer requisito for perdido, alterado ou enfraquecido:
→ erro crítico e parar execução

Se qualquer referência externa for omitida:
→ erro crítico e parar execução

Se não for possível garantir equivalência funcional:
→ erro crítico e parar execução
