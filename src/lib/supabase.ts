import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase configuration is missing. Using defaults.');
}

export const supabase = createClient(
  supabaseUrl || 'https://2n8n-supabase.oggciy.easypanel.host', 
  supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzczNjIzMDg1LCJleHAiOjIwODg5ODMwODV9.IrvPErUlOQkGgqBYIawrt_8CzYNiRShm6_yHtYH-410'
);
