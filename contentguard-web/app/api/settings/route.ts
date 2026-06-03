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
    const { device_id, blocked_domains, blocked_apps, block_level } = await req.json()

    if (!device_id) {
      return NextResponse.json({ error: 'חסר device_id' }, { status: 400 })
    }

    const { data: existing } = await supabase
      .from('block_settings')
      .select('id')
      .eq('device_id', device_id)
      .single()

    if (existing) {
      await supabase
        .from('block_settings')
        .update({
          blocked_domains: blocked_domains || [],
          blocked_apps: blocked_apps || [],
          block_level: block_level || 'medium',
          updated_at: new Date().toISOString()
        })
        .eq('device_id', device_id)
    } else {
      await supabase
        .from('block_settings')
        .insert({
          device_id,
          blocked_domains: blocked_domains || [],
          blocked_apps: blocked_apps || [],
          block_level: block_level || 'medium',
        })
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
