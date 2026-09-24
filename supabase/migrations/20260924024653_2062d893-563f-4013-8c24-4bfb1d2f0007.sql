ALTER TABLE public.applications
  ADD CONSTRAINT applications_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD CONSTRAINT applications_selected_mentor_id_fkey FOREIGN KEY (selected_mentor_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.mentor_pool
  ADD CONSTRAINT mentor_pool_mentor_id_fkey FOREIGN KEY (mentor_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.ratings
  ADD CONSTRAINT ratings_to_user_fkey FOREIGN KEY (to_user) REFERENCES public.profiles(id) ON DELETE CASCADE;