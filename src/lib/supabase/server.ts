import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import {
  getSupabaseAdminKey,
  hasSupabaseAdminConfig,
  hasSupabaseConfig,
  isPersonalMode,
} from "@/lib/config";

type PersonalUser = {
  id: string;
  email: string | null;
  user_metadata?: {
    display_name?: string | null;
  };
};

type ProfileRow = {
  id: string;
  email: string | null;
  display_name: string | null;
};

let cachedPersonalUser: PersonalUser | null = null;

function toPersonalUser(profile: ProfileRow): PersonalUser {
  const email = process.env.PERSONAL_USER_EMAIL?.trim() || profile.email || null;
  return {
    id: profile.id,
    email,
    user_metadata: {
      display_name:
        profile.display_name ||
        email?.split("@")[0] ||
        "Personal user",
    },
  };
}

async function getPersonalUser(
  supabase: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
): Promise<PersonalUser | null> {
  if (cachedPersonalUser) {
    return cachedPersonalUser;
  }

  const configuredId = process.env.PERSONAL_USER_ID?.trim();
  const profileQuery = supabase
    .from("profiles")
    .select("id, email, display_name")
    .order("created_at", { ascending: true })
    .limit(1);

  const { data: profiles, error: profileError } = configuredId
    ? await supabase
        .from("profiles")
        .select("id, email, display_name")
        .eq("id", configuredId)
        .limit(1)
    : await profileQuery;

  if (profileError) {
    return null;
  }

  const profile = profiles?.[0] as ProfileRow | undefined;
  if (profile) {
    cachedPersonalUser = toPersonalUser(profile);
    return cachedPersonalUser;
  }

  const { data: users, error: usersError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1,
  });

  if (usersError || !users.users[0]) {
    return null;
  }

  const authUser = users.users[0];
  const newProfile: ProfileRow = {
    id: authUser.id,
    email: process.env.PERSONAL_USER_EMAIL?.trim() || authUser.email || null,
    display_name:
      process.env.PERSONAL_USER_DISPLAY_NAME?.trim() ||
      authUser.user_metadata?.display_name ||
      authUser.email?.split("@")[0] ||
      "Personal user",
  };

  const { error: upsertError } = await supabase.from("profiles").upsert(newProfile);
  if (upsertError) {
    return null;
  }

  cachedPersonalUser = toPersonalUser(newProfile);
  return cachedPersonalUser;
}

export async function createSupabaseServerClient() {
  if (!hasSupabaseConfig()) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server components cannot always write cookies. Route handlers can.
          }
        },
      },
    },
  );
}

export async function getCurrentUser() {
  if (isPersonalMode()) {
    const supabase = createSupabaseAdminClient();
    if (!supabase) {
      return { supabase: null, user: null };
    }

    const user = await getPersonalUser(supabase);
    return { supabase, user };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { supabase: null, user: null };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabase, user };
}

export function createSupabaseAdminClient() {
  if (!hasSupabaseAdminConfig()) {
    return null;
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    getSupabaseAdminKey(),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}
