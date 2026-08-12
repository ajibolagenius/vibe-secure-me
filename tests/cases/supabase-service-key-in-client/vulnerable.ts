import { createClient } from '@supabase/supabase-js'

// Bundled into the browser: NEXT_PUBLIC_ values are inlined at build time.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
)

export async function listInvoices() {
  return supabase.from('invoices').select('*')
}
