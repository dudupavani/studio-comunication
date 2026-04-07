# Gemini CLI Mandates

## Contexto e Documentação
Este projeto utiliza uma base de conhecimento mínima em `.context/`.
- **NÃO** leia estes arquivos proativamente.
- **CONSULTE** `.context/docs/` apenas sob demanda explícita para arquitetura ou design system.

## Regras Críticas
- **Segurança:** Nunca logue ou commite chaves de API (`.env`).
- **Escopo:** Módulos arquivados (`src/app/(app)/chats`, etc.) são invisíveis.
