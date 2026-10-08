const SUPABASE_URL =
    "https://zwnqskqedxapauorqrid.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_HTSWqLYEdmt77fDQYKVilg_vtVJqRo6";

const supabaseClient =
    supabase.createClient(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY
    );