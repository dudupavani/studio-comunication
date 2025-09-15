// src/app/(app)/design-editor/editor/NodesLayer.tsx
"use client";

import React, { Fragment } from "react";
import { Layer } from "react-konva";
import { useEditor } from "./store";
import { shapesRegistry, isShapeType } from "./nodes/registry";

type Props = { children?: React.ReactNode };

/**
 * Camada que renderiza os nós (shapes/textos).
 * Agora suporta modo "automático" via registry de shapes.
 * - Se `children` for fornecido: mantém comportamento legado.
 * - Caso contrário: renderiza a pilha a partir do estado (apenas shapes por enquanto).
 */
export default function NodesLayer({ children }: Props) {
  const { state, api } = useEditor();

  // Modo automático: desenha a partir do stack se nenhum children for passado
  const autoChildren =
    children == null
      ? state.order.map((id) => {
          const s = state.shapes[id];
          if (!s) return null;

          // Por enquanto, renderizamos somente SHAPES geométricos via registry.
          // (Texto/Imagem continuam onde já estiverem sendo renderizados.)
          if (!isShapeType(s.type)) return null;

          const entry = shapesRegistry[s.type];
          const Comp = entry.Component as any;

          return (
            <Fragment key={id}>
              <Comp
                id={id}
                s={s}
                editing={state.editingId === id}
                onSelect={(tid: string, isShift?: boolean) =>
                  api.selectOne(tid)
                } // mantém compat
                onUpdate={(tid: string, patch: any) =>
                  api.updateShape(tid, patch)
                }
                onDragStart={(tid: string, node: any, isShift?: boolean) => {
                  // Aqui podemos repassar para StageView se necessário
                }}
                onDragMove={(tid: string, node: any) => {
                  // idem
                }}
                onDragEnd={(tid: string, node: any) => {
                  // idem
                }}
              />
            </Fragment>
          );
        })
      : null;

  return <Layer listening>{children ?? autoChildren}</Layer>;
}
