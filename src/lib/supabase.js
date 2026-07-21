// Supabase client — the publishable key is safe to expose in frontend code.
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://fkxucoahutmnitfnyjtr.supabase.co";
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY || "sb_publishable_IIsXHhr5j53BfaM09iwuKw_hPMjiI4i";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
