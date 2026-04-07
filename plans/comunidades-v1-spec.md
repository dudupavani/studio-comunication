# SPEC MACRO — Módulo Comunidades (V1)

## Status da verificação
- Escopo está coerente para V1 de infraestrutura (comunidades + espaços), sem invadir conteúdos.
- Regras de permissão estão consistentes com os roles já usados no sistema (`platform_admin`, `org_admin`, `org_master`, `unit_master`, `unit_user`).
- Fluxo cobre criação, seleção, navegação e gestão básica de comunidades/espaços.
- Não há conflito explícito com módulos existentes, desde que as integrações sejam aditivas.

## Objetivo
- Permitir comunicação segmentada dentro da aplicação.
- Suportar diferentes mídias e formatos de comunicação.
- Organizar essa comunicação por **Comunidades** e **Espaços**.

## Contexto
- A aplicação é usada por empresas.
- O módulo de **Comunidades** servirá para a matriz se comunicar com colaboradores.
- A comunicação poderá ser:
  - **global**, para todos os colaboradores.
  - **segmentada**, por **Grupos de Usuários** ou **Equipes**.
- Cada comunidade poderá ter vários **Espaços**.
- Cada comunidade também terá uma opção de **Feed**, que consolida na timeline as postagens de todos os espaços.
- Neste momento, a V1 terá foco na **infraestrutura primária** de comunidades e espaços, para expansão futura.

## Resultado esperado
- Usuários autorizados da organização poderão:
  - criar comunidades.
  - editar comunidades.
  - excluir comunidades.
  - configurar a segmentação da comunidade.
  - criar espaços dentro da comunidade por tipo.
  - editar espaços.
  - excluir espaços.
- O módulo ficará pronto como estrutura base para expansão futura com conteúdos dentro dos espaços.
- Quando houver conteúdos, eles deverão aparecer apenas para o público definido na segmentação da comunidade.

## Fluxo
1. Usuário autorizado acessa **Comunidades** pelo menu principal da **sidebar**.
2. Ao clicar em **Comunidades**, o sistema apresenta um modal para seleção das comunidades já criadas.
3. Quando não existir nenhuma comunidade criada, o sistema deve exibir a opção para **criar comunidade**.
4. Usuário autorizado clica em **criar comunidade**.
5. Preenche os dados da comunidade.
6. Define se a comunidade será:
   - **global**
   - **segmentada**
7. Caso seja segmentada, escolhe a segmentação:
   - **grupo de usuários**
   - **equipe**
8. Finaliza a criação da comunidade.
9. Ao acessar uma comunidade, o usuário visualiza uma **sidebar interna à esquerda**.
10. Essa sidebar da comunidade deve listar:
    - o **Feed** da comunidade.
    - os **Espaços** já criados.
    - o botão de **criar espaço**.
11. Usuário autorizado clica em **criar espaço**.
12. O sistema abre um modal com os tipos de espaço disponíveis na V1.
13. Usuário escolhe o tipo de espaço.
14. O espaço é criado dentro da comunidade e passa a aparecer na sidebar da comunidade.

## Regras
- Uma comunidade pode ser **global** ou **segmentada**.
- A segmentação da comunidade pode ser feita por:
  - **grupo de usuários**
  - **equipe**
- Apenas os roles `platform_admin`, `org_admin` e `org_master` podem criar comunidades e espaços.
- Cada comunidade terá uma configuração para habilitar ou não a possibilidade de `unit_master` e `unit_user` fazerem postagens.
- O feed da comunidade deve mostrar apenas posts dos espaços que o usuário tiver permissão para ver.
- A segmentação da comunidade pode ser alterada após a criação.
- Apenas `platform_admin`, `org_admin` e `org_master` podem alterar a segmentação.
- Não pode existir mais de uma comunidade com o mesmo nome.
- Os espaços herdam a segmentação da comunidade.
- Cada comunidade pode ter muitos espaços, por isso a navegação interna deve suportar listagem lateral dos espaços.

## Permissões
- **Criar / editar / excluir comunidades e espaços**
  - `platform_admin`
  - `org_admin`
  - `org_master`
- **Postagem por `unit_master` e `unit_user`**
  - depende de configuração da comunidade.
- **Visibilidade da comunidade**
  - global: todos os colaboradores.
  - segmentada: apenas os públicos definidos.
- **Visibilidade dos espaços**
  - herdam a segmentação da comunidade.
- **Visibilidade do feed da comunidade**
  - deve respeitar as permissões dos espaços que o usuário pode acessar.

## Interações
- Criar comunidade.
- Editar comunidade.
- Excluir comunidade.
- Selecionar comunidade pelo acesso em **Comunidades** na sidebar principal.
- Criar espaço.
- Editar espaço.
- Excluir espaço.
- Navegar pelos espaços a partir da sidebar interna da comunidade.

## Dados
### Comunidade
- nome.
- tipo de segmentação:
  - global
  - segmentada
- segmentação por:
  - grupo de usuários
  - equipe
- configuração para permitir ou não postagens de:
  - `unit_master`
  - `unit_user`

### Espaço
- tipo do espaço:
  - publicações
  - eventos
- pertence a uma comunidade.
- herda a segmentação da comunidade.

## Não pode quebrar
- Nada do sistema atual pode ser impactado.
- Todas as funcionalidades já existentes no software devem continuar funcionando normalmente.
- As segmentações atuais do software devem continuar funcionando normalmente.
- As permissões atuais por role devem continuar funcionando normalmente.
- As estruturas já existentes de posts e eventos no software não podem ser afetadas.

## Fora de escopo
- Implementação das publicações.
- Comentários.
- Reações.
- Chats.
- Cursos.
- Qualquer detalhe interno dos conteúdos.
- Implementação dos conteúdos em si dentro dos espaços.
- Detalhamento funcional do feed além da estrutura de navegação e organização.
- Qualquer expansão além da criação da estrutura de comunidades e espaços por tipo.

## Riscos ou dúvidas
- No momento, não há riscos adicionais além do que já foi definido.

## Pontos para confirmação na implementação
- A regra de unicidade de nome de comunidade será global na base inteira ou por organização.
- Para usuários sem permissão de criação, confirmar se o modal de entrada em **Comunidades** deve exibir apenas seleção (sem CTA de criação).
