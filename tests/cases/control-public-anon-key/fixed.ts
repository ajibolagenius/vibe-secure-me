import { createClient } from '@supabase/supabase-js'

// The anon key is designed to be publishable and ships to the browser by
// design. Authorization is enforced by row-level security on every table,
// not by hiding this value.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
