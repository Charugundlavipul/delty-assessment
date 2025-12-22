import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dtdkbefvrshhenupwega.supabase.co'
// Using same anon key as server for client-side Auth
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0ZGtiZWZ2cnNoaGVudXB3ZWdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MTAyNjYsImV4cCI6MjA4MTk4NjI2Nn0.5jMrgTZ6rvmd5ukQ6qG5Pfz6xXjfWwG_DAZuga-MoHI'

export const supabase = createClient(supabaseUrl, supabaseKey)
