export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )

  try {
    const { device_id, action, value } = await req.json()
    if (!device_id || !action) return NextResponse.json({ error: 'חסרים פרטים' }, { status: 400 })

    let update: any = {}

    switch (action) {
      case 'lock':
        update = { is_locked: true }
        break
      case 'unlock':
        update = { is_locked: false }
        break
      case 'set_hours':
        update = { allowed_hours: value }
        break
      case 'remove_admin':
        update = { admin_protected: false }
        break
      case 'delete':
        await supabase.from('block_settings').delete().eq('device_id', device_id)
        await supabase.from('devices').delete().eq('id', device_id)
        return NextResponse.json({ ok: true })
      default:
        return NextResponse.json({ error: 'פעולה לא מוכרת' }, { status: 400 })
    }

    await supabase.from('devices').update(update).eq('id', device_id)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
