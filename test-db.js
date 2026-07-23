import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  console.log('Connecting to:', supabaseUrl);
  // Try to select one row from profiles
  const { data, error } = await supabase.from('profiles').select('*').limit(1);
  if (error) {
    console.error('Error fetching profiles:', error);
  } else {
    console.log('Success fetching profiles. Data row:', data);
  }
}

test();
