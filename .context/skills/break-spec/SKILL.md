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
preservando o contexto global da feature e evitando implementação fragmentada.

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

## Resultado esperado

Estado final após a etapa

## Critérios de aceite

Como validar que a etapa foi concluída

## Dependências

Etapas anteriores necessárias

---

## Regras de decomposição

- Não quebrar por arquivo técnico
- Não quebrar por função isolada
- Quebrar por valor funcional
- Cada etapa deve ser validável isoladamente
- Manter contexto global em todas as etapas
- Evitar duplicação de regras
- Evitar perda de escopo

---

## Restrições

- Não implementar código
- Não alterar a spec original
- Não inventar arquitetura
- Não assumir comportamento não descrito
- Não criar tarefas técnicas desconectadas do valor

---

## Output

Entregar:

1. Caminho da pasta criada
2. Lista de arquivos gerados
3. Resumo das etapas criadas
4. Confirmação de coerência com a spec original

---

## Erros

Se o arquivo não existir:
→ informar erro e parar

Se a spec for insuficiente:
→ listar lacunas e parar

Se houver ambiguidade:
→ apontar antes de continuar
