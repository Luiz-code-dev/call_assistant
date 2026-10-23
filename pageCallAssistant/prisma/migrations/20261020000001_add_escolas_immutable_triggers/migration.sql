-- Migration: triggers de imutabilidade para ledger de notas, atas e auditoria
-- Nenhuma tabela existente é alterada.

CREATE OR REPLACE FUNCTION edu_block_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Registro imutável (%): alteração e exclusão não são permitidas', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER edu_grade_entry_immutable
  BEFORE UPDATE OR DELETE ON "EduGradeEntry"
  FOR EACH ROW EXECUTE FUNCTION edu_block_mutation();

CREATE TRIGGER edu_term_closure_immutable
  BEFORE UPDATE OR DELETE ON "EduTermClosure"
  FOR EACH ROW EXECUTE FUNCTION edu_block_mutation();

CREATE TRIGGER edu_audit_log_immutable
  BEFORE UPDATE OR DELETE ON "EduAuditLog"
  FOR EACH ROW EXECUTE FUNCTION edu_block_mutation();
