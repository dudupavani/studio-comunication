Transform Rules — Design Editor

Este módulo centraliza todas as regras de transformação de objetos (shapes, text, image) no Design Editor.
O objetivo é garantir consistência, escalabilidade e performance quando múltiplas formas são movidas ou redimensionadas.

📂 Estrutura
transform-rules/
├── shape.ts # Regras genéricas para shapes (Rect, Circle, Polygon, Star, etc.)
└── README.md # Este guia

🚀 Conceito de Categorias

Cada objeto no editor pertence a uma das três categorias:

Text → regras próprias (ajuste de width e fontSize).

Shape → engloba todas as formas geométricas (Rect, Circle, Star, Polygon, etc.).

Image → planejado para futuro (comportamento semelhante ao shape, mas preservando proporções de bitmap).

🛠️ Funções Principais
applyShapeLiveConstraint(node: Konva.Node)

Executada durante o transform (resize em tempo real).

Mantém o Circle proporcional (impede virar elipse).

Outras formas não precisam de intervenção.

Chamada automaticamente no StageView dentro do handler de transform.

Exemplo de uso no StageView:

tr.on("transform", () => {
tr.nodes().forEach((node) => {
if (node.getClassName() !== "Text") {
applyShapeLiveConstraint(node);
}
});
});

commitShapeTransform(node: Konva.Node)

Executada ao final (transformend).

Converte scaleX/scaleY em novos width/height.

Reseta scaleX/scaleY → evita acúmulo de escala.

Corrige coordenadas:

Circle: Konva usa centro → convertemos para top-left (x - w/2, y - h/2).

Demais shapes: já usam top-left, não precisam de ajuste.

Exemplo de uso em qualquer ShapeNode:

onTransformEnd={(evt) => {
const node = evt.target as Konva.Node;
onUpdate(id, commitShapeTransform(node));
}}

📏 Como adicionar uma nova forma

Para criar uma nova forma (ex.: StarNode):

Criar o componente React em nodes/shapes/StarNode.tsx.

Implementar os eventos padrão (onMouseDown, onDragStart, onDragMove, onDragEnd).

No onTransformEnd, basta chamar:

onTransformEnd={(evt) => {
const node = evt.target as Konva.Star;
onUpdate(id, commitShapeTransform(node));
}}

O resto do comportamento já estará coberto por StageView e transform-rules.

✅ Benefícios

Consistência: todas as formas se comportam igual ao redimensionar.

Escalabilidade: adicionar dezenas de formas não exige duplicação de lógica.

Performance: operações pesadas (batchDraw, cálculos) são minimizadas.

Separação de responsabilidades:

StageView → orquestração.

transform-rules → lógica de transformação.

nodes/\* → renderização individual.

👉 Seguindo este padrão, conseguimos manter o código limpo, fácil de manter e pronto para escalar.
