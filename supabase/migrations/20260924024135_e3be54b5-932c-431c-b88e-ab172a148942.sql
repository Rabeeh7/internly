CREATE VIEW public.application_progress
WITH (security_invoker = true) AS
SELECT
  a.id AS application_id,
  a.student_id,
  a.selected_mentor_id,
  a.listing_id,
  a.status,
  a.mentor_approved,
  a.employer_approved,
  a.created_at,
  COUNT(f.id) AS follow_up_count,
  MAX(f.created_at) AS last_follow_up_at,
  (a.status IN ('mentor_selected','approved','in_progress')
    AND COALESCE(MAX(f.created_at), a.created_at) < now() - interval '10 days') AS overdue
FROM public.applications a
LEFT JOIN public.follow_ups f ON f.application_id = a.id
GROUP BY a.id;

GRANT SELECT ON public.application_progress TO authenticated;
GRANT ALL ON public.application_progress TO service_role;

CREATE OR REPLACE FUNCTION public.finalise_application()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.mentor_approved AND NEW.employer_approved THEN
    NEW.status := 'completed';
    IF NEW.certificate_id IS NULL THEN
      NEW.certificate_id := 'INTLY-' || to_char(now(), 'YYYY') || '-' || upper(substr(replace(NEW.id::text, '-', ''), 1, 6));
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER applications_finalise
BEFORE UPDATE ON public.applications
FOR EACH ROW EXECUTE FUNCTION public.finalise_application();

CREATE OR REPLACE FUNCTION public.claim_admin()
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  existing INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;
  SELECT COUNT(*) INTO existing FROM public.user_roles WHERE role = 'admin';
  IF existing > 0 THEN
    RETURN false;
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(), 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  UPDATE public.profiles SET role = 'admin' WHERE id = auth.uid();
  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_admin() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.claim_admin() TO authenticated;