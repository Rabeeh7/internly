-- ===== enums =====
CREATE TYPE public.app_role AS ENUM ('student','mentor','employer','admin');
CREATE TYPE public.verification_status AS ENUM ('pending','approved','rejected');
CREATE TYPE public.listing_mode AS ENUM ('internship','exchange');
CREATE TYPE public.listing_status AS ENUM ('open','closed','taken_down');
CREATE TYPE public.application_status AS ENUM ('pending','mentor_selected','approved','rejected','in_progress','completed');
CREATE TYPE public.follow_up_status AS ENUM ('submitted','approved','changes_requested');

-- ===== profiles =====
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY,
  role public.app_role NOT NULL DEFAULT 'student',
  name TEXT NOT NULL DEFAULT '',
  email TEXT,
  institution_name TEXT,
  course TEXT,
  institution_id UUID,
  expertise_tags TEXT[] NOT NULL DEFAULT '{}',
  max_load INTEGER NOT NULL DEFAULT 5,
  onboarded BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ===== user_roles (authoritative for admin) =====
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'admin');
$$;

CREATE OR REPLACE FUNCTION public.my_role()
RETURNS public.app_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.my_institution_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT institution_id FROM public.profiles WHERE id = auth.uid();
$$;

CREATE POLICY "profiles readable by all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid() OR public.is_admin());
CREATE POLICY "admin deletes profiles" ON public.profiles FOR DELETE TO authenticated USING (public.is_admin());

CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());

-- ===== institutions =====
CREATE TABLE public.institutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT,
  website TEXT,
  logo_url TEXT,
  owner_id UUID,
  verification_status public.verification_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.institutions TO authenticated;
GRANT SELECT ON public.institutions TO anon;
GRANT ALL ON public.institutions TO service_role;
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "institutions readable" ON public.institutions FOR SELECT USING (verification_status = 'approved' OR owner_id = auth.uid() OR public.is_admin());
CREATE POLICY "owner creates institution" ON public.institutions FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "owner or admin updates institution" ON public.institutions FOR UPDATE TO authenticated USING (owner_id = auth.uid() OR public.is_admin());
CREATE POLICY "admin deletes institution" ON public.institutions FOR DELETE TO authenticated USING (public.is_admin());

-- ===== categories =====
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT SELECT ON public.categories TO anon;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories readable by all" ON public.categories FOR SELECT USING (true);
CREATE POLICY "admin manages categories" ON public.categories FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ===== listings =====
CREATE TABLE public.listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL,
  location TEXT,
  remote BOOLEAN NOT NULL DEFAULT false,
  mode public.listing_mode NOT NULL DEFAULT 'internship',
  duration TEXT,
  openings INTEGER NOT NULL DEFAULT 1,
  status public.listing_status NOT NULL DEFAULT 'open',
  featured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX listings_category_idx ON public.listings (category);
CREATE INDEX listings_status_idx ON public.listings (status);
CREATE INDEX listings_institution_idx ON public.listings (institution_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.listings TO authenticated;
GRANT SELECT ON public.listings TO anon;
GRANT ALL ON public.listings TO service_role;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open listings readable" ON public.listings FOR SELECT USING (
  status = 'open' OR institution_id = public.my_institution_id() OR public.is_admin()
);
CREATE POLICY "employer creates listing" ON public.listings FOR INSERT TO authenticated WITH CHECK (
  institution_id = public.my_institution_id() AND EXISTS (
    SELECT 1 FROM public.institutions i WHERE i.id = institution_id AND i.verification_status = 'approved'
  )
);
CREATE POLICY "employer or admin updates listing" ON public.listings FOR UPDATE TO authenticated USING (
  institution_id = public.my_institution_id() OR public.is_admin()
);
CREATE POLICY "employer or admin deletes listing" ON public.listings FOR DELETE TO authenticated USING (
  institution_id = public.my_institution_id() OR public.is_admin()
);

-- ===== student preferences =====
CREATE TABLE public.student_preferences (
  student_id UUID PRIMARY KEY,
  categories TEXT[] NOT NULL DEFAULT '{}',
  location TEXT,
  remote BOOLEAN NOT NULL DEFAULT false,
  mode public.listing_mode,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_preferences TO authenticated;
GRANT ALL ON public.student_preferences TO service_role;
ALTER TABLE public.student_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own preferences" ON public.student_preferences FOR ALL TO authenticated
  USING (student_id = auth.uid() OR public.is_admin()) WITH CHECK (student_id = auth.uid());

-- ===== applications =====
CREATE TABLE public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  status public.application_status NOT NULL DEFAULT 'pending',
  motivation TEXT NOT NULL DEFAULT '',
  attachment_url TEXT,
  selected_mentor_id UUID,
  mentor_approved BOOLEAN NOT NULL DEFAULT false,
  employer_approved BOOLEAN NOT NULL DEFAULT false,
  certificate_id TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX applications_student_idx ON public.applications (student_id);
CREATE INDEX applications_mentor_idx ON public.applications (selected_mentor_id);
CREATE INDEX applications_listing_idx ON public.applications (listing_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.applications TO authenticated;
GRANT ALL ON public.applications TO service_role;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.owns_application(_application_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.applications a
    JOIN public.listings l ON l.id = a.listing_id
    WHERE a.id = _application_id
      AND (a.student_id = auth.uid()
        OR a.selected_mentor_id = auth.uid()
        OR l.institution_id = public.my_institution_id()
        OR public.has_role(auth.uid(), 'admin'))
  );
$$;

CREATE POLICY "applications visible to参与者" ON public.applications FOR SELECT TO authenticated USING (
  student_id = auth.uid()
  OR selected_mentor_id = auth.uid()
  OR public.is_admin()
  OR EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.institution_id = public.my_institution_id())
);
CREATE POLICY "student creates application" ON public.applications FOR INSERT TO authenticated WITH CHECK (student_id = auth.uid());
CREATE POLICY "participants update application" ON public.applications FOR UPDATE TO authenticated USING (
  student_id = auth.uid()
  OR selected_mentor_id = auth.uid()
  OR public.is_admin()
  OR EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.institution_id = public.my_institution_id())
);
CREATE POLICY "admin deletes application" ON public.applications FOR DELETE TO authenticated USING (public.is_admin() OR student_id = auth.uid());

-- ===== mentor pool =====
CREATE TABLE public.mentor_pool (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID NOT NULL,
  category TEXT,
  listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mentor_pool TO authenticated;
GRANT ALL ON public.mentor_pool TO service_role;
ALTER TABLE public.mentor_pool ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mentor pool readable" ON public.mentor_pool FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin manages mentor pool" ON public.mentor_pool FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ===== follow ups =====
CREATE TABLE public.follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  link_url TEXT,
  status public.follow_up_status NOT NULL DEFAULT 'submitted',
  mentor_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX follow_ups_application_idx ON public.follow_ups (application_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.follow_ups TO authenticated;
GRANT ALL ON public.follow_ups TO service_role;
ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "follow ups visible to participants" ON public.follow_ups FOR SELECT TO authenticated USING (public.owns_application(application_id));
CREATE POLICY "student adds follow up" ON public.follow_ups FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.applications a WHERE a.id = application_id AND a.student_id = auth.uid())
);
CREATE POLICY "participants update follow up" ON public.follow_ups FOR UPDATE TO authenticated USING (public.owns_application(application_id));

-- ===== ratings =====
CREATE TABLE public.ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  from_user UUID NOT NULL,
  to_user UUID,
  from_role public.app_role NOT NULL,
  to_role public.app_role NOT NULL,
  stars INTEGER NOT NULL CHECK (stars BETWEEN 1 AND 5),
  comment TEXT,
  disputed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ratings TO authenticated;
GRANT ALL ON public.ratings TO service_role;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ratings visible to participants" ON public.ratings FOR SELECT TO authenticated USING (public.owns_application(application_id));
CREATE POLICY "write own rating" ON public.ratings FOR INSERT TO authenticated WITH CHECK (from_user = auth.uid());
CREATE POLICY "admin updates rating" ON public.ratings FOR UPDATE TO authenticated USING (public.is_admin() OR from_user = auth.uid());

-- ===== project briefs =====
CREATE TABLE public.project_briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  scope TEXT,
  deliverables TEXT,
  start_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_briefs TO authenticated;
GRANT ALL ON public.project_briefs TO service_role;
ALTER TABLE public.project_briefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "briefs visible to participants" ON public.project_briefs FOR SELECT TO authenticated USING (public.owns_application(application_id));
CREATE POLICY "employer manages brief" ON public.project_briefs FOR INSERT TO authenticated WITH CHECK (public.owns_application(application_id));
CREATE POLICY "employer updates brief" ON public.project_briefs FOR UPDATE TO authenticated USING (public.owns_application(application_id));

-- ===== escalations =====
CREATE TABLE public.escalations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reason TEXT NOT NULL,
  details TEXT,
  application_id UUID REFERENCES public.applications(id) ON DELETE CASCADE,
  involved TEXT,
  resolved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.escalations TO authenticated;
GRANT ALL ON public.escalations TO service_role;
ALTER TABLE public.escalations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manages escalations" ON public.escalations FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ===== aptitude results =====
CREATE TABLE public.aptitude_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  answers JSONB NOT NULL DEFAULT '{}',
  suggested_categories TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aptitude_results TO authenticated;
GRANT ALL ON public.aptitude_results TO service_role;
ALTER TABLE public.aptitude_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own aptitude results" ON public.aptitude_results FOR ALL TO authenticated
  USING (student_id = auth.uid() OR public.is_admin()) WITH CHECK (student_id = auth.uid());

-- ===== notifications =====
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "anyone notifies" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "own notifications update" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- ===== AI summary cache on applications =====
ALTER TABLE public.applications
  ADD COLUMN ai_summary TEXT,
  ADD COLUMN ai_summary_at TIMESTAMPTZ;

-- ===== demo seed data =====
INSERT INTO public.categories (name, description) VALUES
  ('Software Engineering','Web, mobile and systems development'),
  ('Data & AI','Analytics, machine learning and research'),
  ('Design','Product, graphic and UX design'),
  ('Public Health','Clinical, community and research placements'),
  ('Sustainability','Climate, energy and environment work'),
  ('Business & Finance','Operations, strategy and finance');

INSERT INTO public.institutions (id, name, type, website, verification_status) VALUES
  ('11111111-1111-4111-8111-111111111111','Northwind Labs','Company','https://northwind.example','approved'),
  ('22222222-2222-4222-8222-222222222222','Kyoto Institute of Design','University','https://kid.example','approved'),
  ('33333333-3333-4333-8333-333333333333','Sahara Health Trust','NGO','https://saharahealth.example','approved'),
  ('44444444-4444-4444-8444-444444444444','Volt Energy Collective','Company','https://volt.example','pending');

INSERT INTO public.profiles (id, role, name, email, institution_name, course, institution_id, expertise_tags, max_load, onboarded) VALUES
  ('aaaaaaa1-0000-4000-8000-000000000001','student','Amara Singh','amara@demo.internly','Delhi University','B.Tech Computer Science',NULL,'{}',5,true),
  ('aaaaaaa1-0000-4000-8000-000000000002','student','Liam Torres','liam@demo.internly','Kyoto Institute of Design','BA Product Design',NULL,'{}',5,true),
  ('aaaaaaa1-0000-4000-8000-000000000003','student','Fatima Noor','fatima@demo.internly','Aga Khan University','MSc Public Health',NULL,'{}',5,true),
  ('bbbbbbb2-0000-4000-8000-000000000001','mentor','Dr. Rhea Kapoor','rhea@demo.internly',NULL,NULL,NULL,'{"Data & AI","Software Engineering"}',4,true),
  ('bbbbbbb2-0000-4000-8000-000000000002','mentor','Marcus Bell','marcus@demo.internly',NULL,NULL,NULL,'{"Design"}',3,true),
  ('bbbbbbb2-0000-4000-8000-000000000003','mentor','Aisha Kone','aisha@demo.internly',NULL,NULL,NULL,'{"Public Health","Sustainability"}',5,true),
  ('ccccccc3-0000-4000-8000-000000000001','employer','Nina Alvarez','nina@demo.internly','Northwind Labs',NULL,'11111111-1111-4111-8111-111111111111','{}',5,true),
  ('ccccccc3-0000-4000-8000-000000000002','employer','Toshi Yamada','toshi@demo.internly','Kyoto Institute of Design',NULL,'22222222-2222-4222-8222-222222222222','{}',5,true);

INSERT INTO public.listings (id, institution_id, title, description, category, location, remote, mode, duration, openings, status, featured) VALUES
  ('dddddddd-0000-4000-8000-000000000001','11111111-1111-4111-8111-111111111111','Backend Engineering Intern','Work with our platform team on APIs, data pipelines and reliability. You will ship code to production in week two, paired with a senior engineer.','Software Engineering','Berlin, Germany',false,'internship','12 weeks',3,'open',true),
  ('dddddddd-0000-4000-8000-000000000002','11111111-1111-4111-8111-111111111111','Applied ML Research Intern','Support our applied research group on retrieval and evaluation for document understanding models.','Data & AI','Remote',true,'internship','16 weeks',2,'open',false),
  ('dddddddd-0000-4000-8000-000000000003','22222222-2222-4222-8222-222222222222','Design Exchange Semester','A full exchange semester in our studio programme, with studio critique, fabrication labs and a public final show.','Design','Kyoto, Japan',false,'exchange','1 semester',6,'open',true),
  ('dddddddd-0000-4000-8000-000000000004','33333333-3333-4333-8333-333333333333','Community Health Field Placement','Field placement supporting maternal health outreach clinics and data collection.','Public Health','Nairobi, Kenya',false,'internship','10 weeks',4,'open',false),
  ('dddddddd-0000-4000-8000-000000000005','33333333-3333-4333-8333-333333333333','Health Data Analyst Intern','Clean, analyse and visualise field survey data for our programme teams.','Data & AI','Remote',true,'internship','8 weeks',2,'open',false),
  ('dddddddd-0000-4000-8000-000000000006','22222222-2222-4222-8222-222222222222','Sustainable Materials Studio','Research bio-based materials with our sustainability studio and partner makers.','Sustainability','Kyoto, Japan',false,'exchange','1 semester',3,'open',false);

INSERT INTO public.mentor_pool (mentor_id, category) VALUES
  ('bbbbbbb2-0000-4000-8000-000000000001','Software Engineering'),
  ('bbbbbbb2-0000-4000-8000-000000000001','Data & AI'),
  ('bbbbbbb2-0000-4000-8000-000000000002','Design'),
  ('bbbbbbb2-0000-4000-8000-000000000003','Public Health'),
  ('bbbbbbb2-0000-4000-8000-000000000003','Sustainability');

INSERT INTO public.student_preferences (student_id, categories, location, remote, mode) VALUES
  ('aaaaaaa1-0000-4000-8000-000000000001','{"Software Engineering","Data & AI"}','Berlin, Germany',true,'internship'),
  ('aaaaaaa1-0000-4000-8000-000000000002','{"Design","Sustainability"}','Kyoto, Japan',false,'exchange');

INSERT INTO public.applications (id, student_id, listing_id, status, motivation, selected_mentor_id, mentor_approved, employer_approved, certificate_id, created_at) VALUES
  ('eeeeeeee-0000-4000-8000-000000000001','aaaaaaa1-0000-4000-8000-000000000001','dddddddd-0000-4000-8000-000000000001','in_progress','I have been building distributed side projects for two years and want production reliability experience.','bbbbbbb2-0000-4000-8000-000000000001',false,false,NULL, now() - interval '40 days'),
  ('eeeeeeee-0000-4000-8000-000000000002','aaaaaaa1-0000-4000-8000-000000000002','dddddddd-0000-4000-8000-000000000003','approved','A studio semester in Kyoto would let me develop my material research properly.','bbbbbbb2-0000-4000-8000-000000000002',false,false,NULL, now() - interval '20 days'),
  ('eeeeeeee-0000-4000-8000-000000000003','aaaaaaa1-0000-4000-8000-000000000003','dddddddd-0000-4000-8000-000000000004','completed','Maternal health outreach is the core of my dissertation fieldwork.','bbbbbbb2-0000-4000-8000-000000000003',true,true,'INTLY-2026-0001', now() - interval '120 days'),
  ('eeeeeeee-0000-4000-8000-000000000004','aaaaaaa1-0000-4000-8000-000000000001','dddddddd-0000-4000-8000-000000000002','pending','I want to work on retrieval evaluation with a research group.',NULL,false,false,NULL, now() - interval '4 days'),
  ('eeeeeeee-0000-4000-8000-000000000005','aaaaaaa1-0000-4000-8000-000000000003','dddddddd-0000-4000-8000-000000000005','mentor_selected','Analysis work would complement my field placement well.','bbbbbbb2-0000-4000-8000-000000000003',false,false,NULL, now() - interval '9 days');

INSERT INTO public.follow_ups (application_id, content, status, created_at) VALUES
  ('eeeeeeee-0000-4000-8000-000000000001','Week 1: onboarded, set up the local stack and shipped a small logging fix.','approved', now() - interval '30 days'),
  ('eeeeeeee-0000-4000-8000-000000000001','Week 2: took over the rate-limiting ticket, wrote tests and a short design note.','approved', now() - interval '23 days'),
  ('eeeeeeee-0000-4000-8000-000000000001','Week 3: paired on the ingestion pipeline refactor; blocked on staging access.','submitted', now() - interval '16 days'),
  ('eeeeeeee-0000-4000-8000-000000000003','Completed outreach clinic rotation and handed over the survey dataset.','approved', now() - interval '100 days'),
  ('eeeeeeee-0000-4000-8000-000000000005','Started data cleaning on the 2025 survey extract.','submitted', now() - interval '3 days');

INSERT INTO public.project_briefs (application_id, title, scope, deliverables, start_date) VALUES
  ('eeeeeeee-0000-4000-8000-000000000001','Ingestion reliability project','Improve retry and observability for the document ingestion pipeline.','Design note, retry implementation, dashboard','2026-08-01');

INSERT INTO public.ratings (application_id, from_user, to_user, from_role, to_role, stars, comment) VALUES
  ('eeeeeeee-0000-4000-8000-000000000003','bbbbbbb2-0000-4000-8000-000000000003','aaaaaaa1-0000-4000-8000-000000000003','mentor','student',5,'Outstanding fieldwork and very careful documentation.'),
  ('eeeeeeee-0000-4000-8000-000000000003','aaaaaaa1-0000-4000-8000-000000000003','bbbbbbb2-0000-4000-8000-000000000003','student','mentor',5,'Always available and gave sharp feedback on my drafts.');

INSERT INTO public.escalations (reason, details, application_id, involved) VALUES
  ('Overdue follow-up','No follow-up logged in 16 days on the Northwind backend placement.','eeeeeeee-0000-4000-8000-000000000001','Amara Singh · Dr. Rhea Kapoor'),
  ('Pending verification','Volt Energy Collective is waiting on institution verification.',NULL,'Volt Energy Collective');
