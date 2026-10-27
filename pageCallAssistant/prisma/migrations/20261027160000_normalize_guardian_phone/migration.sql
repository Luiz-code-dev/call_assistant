-- Normaliza telefones ja gravados para somente digitos (login da familia por
-- celular passa a casar com o valor digitado, sem pontuacao). Aditivo/idempotente.
UPDATE "EduGuardian"
SET "phone" = regexp_replace("phone", '[^0-9]', '', 'g')
WHERE "phone" IS NOT NULL
  AND "phone" <> regexp_replace("phone", '[^0-9]', '', 'g');
