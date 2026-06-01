-- Adiciona coluna state (UF) à tabela units
ALTER TABLE public.units
  ADD COLUMN IF NOT EXISTS state text;
