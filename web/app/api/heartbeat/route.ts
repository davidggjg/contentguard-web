export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
)

export async function POST(req: NextRequest) {
  try {
    const { device_id } = await req.json()
    if (!device_id) return NextResponse.json({ error: 'חסר device_id' }, { status: 400 })

    await supabase
      .from('devices')
      .update({ last_seen: new Date().toISOString() })
      .eq('id', device_id)

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: 'שגיאה' }, { status: 500 })
  }
}
