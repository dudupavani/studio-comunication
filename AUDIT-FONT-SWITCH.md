# AUDIT REPORT: Font Family Switching Inconsistency in Design Editor

## Sumário Executivo

Este relatório apresenta uma auditoria técnica completa da inconsistência observada ao trocar a font family de elementos de texto no editor de design (React + Next.js 15 + react-konva). Após análise detalhada do código, identificamos várias causas-raiz que contribuem para o comportamento não determinístico da aplicação de fontes.

## Passo a passo de reprodução

1. Iniciar o servidor de desenvolvimento: `npm run dev`
2. Acessar http://localhost:9002/design-editor
3. Criar um elemento de texto
4. Alternar rapidamente entre diferentes fontes no seletor (ex: Inter ↔ Roboto ↔ Montserrat)
5. Observar que às vezes a fonte não é aplicada corretamente

## Causas-raiz identificadas

### 1. Falta de sincronização entre carregamento de fontes e atualização do nó Konva

**Local:** `src/components/design-editor/TextFontControl.tsx` (linhas 75-85)
**Problema:** O código tenta carregar a fonte mas não aguarda sua disponibilidade antes de atualizar o nó Konva.

### 2. Ausência de clearCache() e batchDraw() após atualização da fonte

**Local:** `src/components/design-editor/Canvas.tsx` (linhas 600-700)
**Problema:** Ao atualizar propriedades do texto, o código não chama `clearCache()` antes de `batchDraw()`, o que pode resultar em renderização incorreta.

### 3. Estado de seleção desatualizado devido a race conditions

**Local:** `src/components/design-editor/TextFontControl.tsx` (linhas 40-50)
**Problema:** O componente utiliza tanto estado local quanto eventos para gerenciar a seleção, o que pode causar dessincronização.

### 4. Falta de verificação se a fonte está realmente carregada antes da aplicação

**Local:** `src/lib/design-editor/fonts/font-loader.ts` (linhas 50-70)
**Problema:** A função `requestFont` não garante que a fonte esteja prontamente disponível para uso no canvas Konva.

## Proposta de correções mínimas e seguras

### 1. Criar helper para garantir carregamento de fontes

```typescript
// src/lib/design-editor/fonts/font-loader.ts
export async function ensureFontLoaded(family: string, weight: number = 400, style: "normal" | "italic" = "normal"): Promise<void> {
  const fontSpec = `${style === "italic" ? "italic " : ""}${weight} 16px "${family}"`;
  try {
    // Primeiro, solicita o carregamento da fonte
    await requestFont({ family, weight, style, subset: "latin" });
    
    // Depois, espera que ela esteja realmente disponível
    await (document as any).fonts.load(fontSpec);
    await (document as any).fonts.ready;
  } catch (err) {
    console.warn(`Failed to load font: ${family}`, err);
    // Mesmo que falhe, continua a execução
  }
}
```

### 2. Modificar TextFontControl para usar o helper e aguardar o carregamento

```typescript
// src/components/design-editor/TextFontControl.tsx
async function handleChangeFont(value: string) {
  if (!isText || !sel?.id) return;

  // deduz variante (peso/estilo) a partir do estado atual
  const bold = sel.fontStyle?.includes("bold");
  const italic = sel.fontStyle?.includes("italic");
  const weight = bold ? 700 : 400;
  const style: "normal" | "italic" = italic ? "italic" : "normal";

  // Garante que a fonte esteja carregada antes de aplicar
  await ensureFontLoaded(value, weight, style);

  // Canal padrão
  window.dispatchEvent(
    new CustomEvent("design-editor:update-props", {
      detail: { id: sel.id, patch: { fontFamily: value } },
    })
  );
  // Compatibilidade (se houver listeners legados)
  window.dispatchEvent(
    new CustomEvent("design-editor:update-text", {
      detail: { id: sel.id, patch: { fontFamily: value } },
    })
  );
}
```

### 3. Adicionar clearCache e batchDraw no Canvas após atualização de fonte

```typescript
// src/components/design-editor/Canvas.tsx
// Na função que aplica as atualizações (por volta da linha 550)
useEffect(() => {
  type Patch = Partial<
    ShapeText &
      ShapeRect &
      ShapeCircle &
      ShapeTriangle &
      ShapeLine &
      ShapeStar &
      ShapeBase
  >;

  const applyPatch = (id: string, patch: Patch) => {
    setShapes((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        
        // Se for uma atualização de fonte, limpa o cache
        if (patch.fontFamily && s.type === "text") {
          const node = shapeRefs.current[id];
          if (node) {
            // Limpa o cache para forçar re-renderização
            node.clearCache?.();
            // Atualiza o nó diretamente para garantir aplicação imediata
            node.fontFamily?.(patch.fontFamily);
            // Redesenha a camada
            node.getLayer?.()?.batchDraw?.();
          }
        }
        
        return { ...s, ...patch };
      })
    );
  };

  // ... restante do código
}, []);
```

### 4. Sincronizar seleção entre propriedades e componente de fonte

```typescript
// src/components/design-editor/TextPropertiesPanel.tsx
// Substituir a linha 291 por:
<TextFontControl
  selection={state ? {
    id: state.id,
    type: state.type,
    fontFamily: state.fontFamily,
    fontStyle: state.fontStyle,
  } : null}
/>
```

## Impacto em performance e riscos

1. **Performance**: A adição de `await document.fonts.load()` pode introduzir uma pequena latência, mas é necessária para garantir a correta aplicação da fonte.

2. **Riscos**: 
   - A modificação é mínima e segura, afetando apenas o fluxo de atualização de fontes.
   - O uso de `clearCache()` e `batchDraw()` é uma prática recomendada no Konva para forçar re-renderização.

## Plano de testes e checklist de validação

### Testes manuais:
- [ ] Criar texto e alternar entre 10+ fontes diferentes rapidamente
- [ ] Verificar que todas as fontes são aplicadas corretamente
- [ ] Testar com fontes que exigem carregamento (não padrão do sistema)
- [ ] Verificar comportamento em diferentes navegadores (Chrome, Firefox, Safari)

### Testes automatizados:
- [ ] Adicionar testes unitários para o helper `ensureFontLoaded`
- [ ] Verificar que a função lança erro apropriado quando fonte não pode ser carregada

## Status
Diagnóstico + Fix draft pronto em branch chore/audit-font-switch-konva

## Conclusão

A inconsistência na troca de fontes é causada por uma combinação de fatores: falta de sincronização entre carregamento de fontes e atualização do canvas, ausência de invalidação de cache e possíveis race conditions no estado de seleção. As correções propostas abordam essas causas de forma direta e segura, sem alterar o comportamento geral do editor.