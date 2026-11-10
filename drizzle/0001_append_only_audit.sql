CREATE OR REPLACE FUNCTION ep_prevent_audit_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Audit events are append-only: updates and deletes are prohibited' USING ERRCODE = '55000';
END;
$$;
--> statement-breakpoint
DROP TRIGGER IF EXISTS ep_audit_append_only ON audit_events;
--> statement-breakpoint
CREATE TRIGGER ep_audit_append_only BEFORE UPDATE OR DELETE ON audit_events FOR EACH ROW EXECUTE FUNCTION ep_prevent_audit_mutation();