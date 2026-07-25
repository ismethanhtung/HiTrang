import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspect() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .limit(10);

  if (error) {
    console.error('Error fetching profiles:', error);
  } else {
    console.log('Profiles:', data);
  }
}

inspect();
