-- Agrega columna 'confirmado' a la tabla acopios
-- Ejecutar en: Supabase Dashboard → SQL Editor
ALTER TABLE acopios
  ADD COLUMN IF NOT EXISTS confirmado BOOLEAN NOT NULL DEFAULT false;
