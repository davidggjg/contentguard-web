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
    const { device_id, apps } = await req.json()
    if (!device_id || !apps) return NextResponse.json({ error: 'חסרים פרטים' }, { status: 400 })

    await supabase
      .from('devices')
      .update({ installed_apps: apps })
      .eq('id', device_id)

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: 'שגיאה' }, { status: 500 })
  }
}
