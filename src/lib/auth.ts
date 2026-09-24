import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Role = "student" | "mentor" | "employer" | "admin";

export type Profile = {
  id: string;
  role: Role;
  name: string;
  email: string | null;
  institution_name: string | null;
  course: string | null;
  institution_id: string | null;
  expertise_tags: string[];
  max_load: number;
  onboarded: boolean;
};

export const homeForRole = (role: Role | undefined) => {
  switch (role) {
    case "mentor":
      return "/mentor";
    case "employer":
      return "/employer";
    case "admin":
      return "/admin";
    default:
      return "/app";
  }
};

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) return { user: null, profile: null as Profile | null, isAdmin: false };

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      return {
        user,
        profile: (profile as Profile | null) ?? null,
        isAdmin: (roles ?? []).some((r) => r.role === "admin"),
      };
    },
  });
}
