# Dados de seed — ambiente de desenvolvimento

Registro do que foi populado manualmente no banco Supabase (`pguszziywaeyniluntxw`) para fins de teste.

---

## Organização de referência

| Campo  | Valor                                    |
|--------|------------------------------------------|
| org_id | `07fbb1d0-d0f8-41f6-8f8d-93aff972f41f` |

---

## Unidades (tabela `units`)

**Quando:** 2026-05-29
**Quantidade:** 100 unidades
**Método:** script Node.js temporário via Supabase JS client (service role)

Nomes baseados em cidades brasileiras. Cada unidade tem endereço, CEP, telefone e CNPJ inventados.

Cidades usadas (em ordem de inserção):
São Paulo, Rio de Janeiro, Belo Horizonte, Salvador, Fortaleza, Curitiba, Manaus, Recife, Porto Alegre, Belém, Goiânia, Guarulhos, Campinas, São Luís, São Gonçalo, Maceió, Duque de Caxias, Natal, Campo Grande, Teresina, Nova Iguaçu, Santo André, Osasco, João Pessoa, Contagem, São José dos Campos, Ribeirão Preto, Aracaju, Cuiabá, Juiz de Fora, Aparecida de Goiânia, Porto Velho, Florianópolis, Sorocaba, Mogi das Cruzes, Uberlândia, Caxias do Sul, Macapá, Santos, Mauá, São José do Rio Preto, Niterói, Betim, Boa Vista, Ananindeua, Novo Hamburgo, Joinville, Londrina, Maringá, Canoas, Belford Roxo, Campos dos Goytacazes, Vila Velha, Diadema, Jaboatão dos Guararapes, Serra, Paulista, Montes Claros, Carapicuíba, Caucaia, Olinda, Campina Grande, Piracicaba, São Bernardo do Campo, Camaçari, Franca, Jundiaí, Ribeirão das Neves, Bauru, Blumenau, Petrolina, Cascavel, Itaquaquecetuba, Limeira, Caruaru, São João de Meriti, Anápolis, Feira de Santana, Porto Seguro, Cabo Frio, Ilhéus, Vitória, Macaé, Pelotas, Itajaí, Ponta Grossa, Mossoró, Gravataí, Santarém, Volta Redonda, Barueri, Imperatriz, Aparecida, Taubaté, Divinópolis, Rio Branco, Palmas, Lages, Mogi Guaçu, Suzano

---

## Usuários (tabelas `auth.users`, `profiles`, `org_members`, `unit_members`)

**Quando:** 2026-05-29
**Quantidade:** 1.000 usuários
**Método:** script Node.js temporário via `supabase.auth.admin.createUser` (service role)

### Credenciais

| Campo | Valor |
|-------|-------|
| Email | `fake.user0001@studio-seed.internal` até `fake.user1000@studio-seed.internal` |
| Senha | `Seed@2026!` |
| Role  | `unit_user` |

> Emails têm domínio `.internal` — não são endereços reais.

### Distribuição

| Grupo | Quantidade | Observação |
|-------|-----------|------------|
| Matriz | 120 | Sem vínculo a nenhuma unidade (`unit_members` vazio) |
| Unidades | 880 | Distribuídos entre as 100 unidades criadas |

- Usuários `fake.user0001` a `fake.user0120` → Matriz
- Usuários `fake.user0121` a `fake.user1000` → distribuídos nas unidades (≈ 8–9 por unidade)

### Como "usuário da Matriz" funciona no sistema

Usuário sem linha em `unit_members` é tratado como da Matriz pela UI (filtro `unitFilter === "matriz"` em `users-client.tsx` e `AddMembersDrawer.tsx`). Não há flag ou tabela separada — é uma convenção implícita.

---

## Observações gerais

- Os dados são **exclusivamente para testes locais/staging** — não devem ser replicados para produção.
- Nomes e dados pessoais são completamente fictícios (gerados por combinação de listas fixas).
- CNPJs e CEPs das unidades são inventados e não passam por validação de dígitos verificadores.
- Para remover os dados de seed, filtrar por `email LIKE 'fake.user%@studio-seed.internal'` nos usuários e por `slug LIKE` nas unidades das cidades listadas acima.
