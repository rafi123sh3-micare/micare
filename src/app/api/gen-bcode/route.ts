import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const BASE62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

function randomBase62(len: number): string {
  let result = '';
  for (let i = 0; i < len; i++) {
    result += BASE62[Math.floor(Math.random() * 62)];
  }
  return result;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patient_id');

    if (!patientId) {
      return NextResponse.json({ error: 'Missing patient_id' }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from('patients')
      .select('bcode')
      .eq('id', patientId)
      .single();

    if (existing?.bcode) {
      return NextResponse.json({ code: existing.bcode });
    }

    let bcode: string;
    let attempts = 0;
    do {
      bcode = randomBase62(8);
      const { data: conflict } = await supabase
        .from('patients')
        .select('id')
        .eq('bcode', bcode)
        .maybeSingle();
      if (!conflict) break;
      attempts++;
    } while (attempts < 10);

    if (attempts >= 10) {
      return NextResponse.json({ error: 'Failed to generate unique code' }, { status: 500 });
    }

    await supabase.from('patients').update({ bcode }).eq('id', patientId);

    return NextResponse.json({ code: bcode });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
