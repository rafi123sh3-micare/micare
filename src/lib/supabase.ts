import { createClient } from '@supabase/supabase-js';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase environment variables');
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const supabaseUrl1 = process.env.NEXT_PUBLIC_SUPABASE_URL1;
const supabaseAnonKey1 = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY1;

export const supabase1 = supabaseUrl1 && supabaseAnonKey1 
  ? createClient(supabaseUrl1, supabaseAnonKey1)
  : supabase;

export async function generateSerialNumber(doctorId: string, date: string, type: 'appointment' | 'teleconsult'): Promise<string> {
  console.log('generateSerialNumber called:', { doctorId, date, type });
  
  const { data: doctor, error: docError } = await supabase
    .from('doctors')
    .select('id, name, doctor_code')
    .eq('id', doctorId)
    .single();

  console.log('Doctor data:', doctor, 'error:', docError);
  
  if (docError) {
    console.error('Doctor fetch error:', docError);
  }

  const doctorCode = doctor?.doctor_code || 'DR01';
  const typeSuffix = type === 'teleconsult' ? 'T' : 'A';
  console.log('Using doctor code:', doctorCode, 'for doctor:', doctor?.name);
  
  const { data: existingApts, error: countError } = await supabase
    .from('appointments')
    .select('id, serial_number')
    .eq('doctor_id', doctorId)
    .eq('date', date)
    .in('status', ['confirmed', 'completed']);

  console.log('Existing appointments:', existingApts, 'count:', existingApts?.length, 'error:', countError);
  
  if (countError) {
    console.error('Error calculating serial number:', countError.message);
  }
  
  const count = existingApts?.length || 0;
  const nextNumber = count + 1;
  console.log('Next serial number calculated:', nextNumber);
  
  return `${doctorCode}-${String(nextNumber).padStart(3, '0')}${typeSuffix}`;
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  return { session: data.session, error };
}

export async function generateNextDoctorCode() {
  const { data, error } = await supabase
    .from('doctors')
    .select('doctor_code')
    .order('doctor_code', { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0) return 'DR01';

  const lastCode = data[0].doctor_code;
  if (!lastCode) return 'DR01';
  const numericPart = parseInt(lastCode.replace('DR', ''), 10);
  const nextNum = numericPart + 1;
  return `DR${String(nextNum).padStart(2, '0')}`;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) {
    console.error('Sign in error:', error.message);
  }
  return { data, error };
}

export async function signUp(email: string, password: string, role: string, userData: any) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        role,
        name: userData.name,
        phone: userData.phone,
      },
    },
  });

  if (error) {
    console.error('Sign up error:', error.message);
    return { data, error };
  }

  // If email confirmation required, user will be null until confirmed
  if (!data.user) {
    return {
      data,
      error: {
        message: 'আপনার ইমেইলে নিশ্চিতকরণ লিংক পাঠানো হয়েছে। দয়া করে ইমেইল যাচাই করুন।'
      }
    };
  }

  // If doctor, add to doctors table
  if (role === 'doctor') {
    const doctorCode = await generateNextDoctorCode();
    const { error: doctorError } = await supabase.from('doctors').insert([
      {
        user_id: data.user.id,
        name: userData.name,
        phone: userData.phone,
        specialty: userData.specialty || 'General',
        consultation_fee: userData.fee || 500,
        experience: userData.experience || '0 years',
        rating: 4.5,
        review_count: 0,
        is_available: true,
        doctor_code: doctorCode,
      },
    ]);

    if (doctorError) {
      console.error('Error adding doctor:', doctorError.message);
    }
  }

  return { data, error: null };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('Sign out error:', error.message);
  }
  return { error };
}

export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) {
    console.error('Get user error:', error.message);
  }
  return { user, error };
}

export function subscribeToAuth(callback: (user: any) => void) {
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    callback(session?.user || null);
  });

  return () => {
    data.subscription.unsubscribe();
  };
}

// Doctors functions
export async function getDoctors() {
  const { data, error } = await supabase
    .from('doctors')
    .select('*')
    .eq('is_available', true)
    .order('rating', { ascending: false });

  if (error) {
    console.error('Error fetching doctors:', error.message);
    return [];
  }
  return data || [];
}

export async function getDoctorByUserId(userId: string) {
  const { data, error } = await supabase
    .from('doctors')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error('Error fetching doctor:', error.message);
    return null;
  }
  return data;
}