import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const s = searchParams.get('s');

    if (!s) {
      return NextResponse.json({ error: 'Missing param s (serial)' }, { status: 400 });
    }

    return NextResponse.redirect(
      `https://carescriptrx.vercel.app/dashboard/doctor/appointments?serial=${encodeURIComponent(s)}`
    );
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
