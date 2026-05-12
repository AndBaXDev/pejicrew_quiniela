import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://wnhgobsunevpkwmynwli.supabase.co'
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InduaGdvYnN1bmV2cGt3bXlud2xpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MDU3MDgsImV4cCI6MjA5NDE4MTcwOH0.pep9SliPMYk-qQFr3pYXFt09u7-pgQWoA_r9gPbEmv0'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
