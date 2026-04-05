-- Garante que o usuário informado esteja marcado como platform_admin em profiles.
-- Idempotente: pode rodar múltiplas vezes sem erro.
INSERT INTO public.profiles (id, global_role, updated_at)
VALUES (
  'ff3ad233-c682-4dd8-b028-616b5e0f76d2'::uuid,
  'platform_admin',
  now()
)
ON CONFLICT (id) DO UPDATE
SET
  global_role = EXCLUDED.global_role,
  updated_at = now();
