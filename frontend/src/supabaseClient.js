import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://btnrbnbhemcfpxjifnph.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0bnJibmJoZW1jZnB4amlmbnBoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2NDY5MzcsImV4cCI6MjA3MDIyMjkzN30.tZgdjTrJQnShc7Gh1v04VcV5r0glCi7__quxCgj6L04';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);