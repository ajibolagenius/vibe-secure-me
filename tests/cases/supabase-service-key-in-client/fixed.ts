import { createClient } from '@supabase/supabase-js'

// Anon key is publishable; row-level security constrains what it can read.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function listInvoices() {
  return supabase.from('invoices').select('*')
}
