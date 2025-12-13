import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://tpvkgurmchjizbtxjoff.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRwdmtndXJtY2hqaXpidHhqb2ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzNzAxMTksImV4cCI6MjA4MDk0NjExOX0.GVw9iLcVvTInDlZkxgoyeeXh3QU_VNdLMVhphIOXxKs'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)