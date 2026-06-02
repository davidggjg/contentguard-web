import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// האפליקציה על הטלפון שולחת קוד הפעלה ומקבלת את ההגדרות
export async function POST(req: NextRequest) {
  const { activation_code } = await req.json()

  if (!activation_code) {
    return NextResponse.json({ error: 'קוד הפעלה חסר' }, { status: 400 })
  }

  // מחפש את המכשיר לפי קוד הפעלה
  const { data: device, error } = await supabase
    .from('devices')
    .select('*, block_settings(*)')
    .eq('activation_code', activation_code.toUpperCase())
    .single()

  if (error || !device) {
    return NextResponse.json({ error: 'קוד הפעלה לא נמצא' }, { status: 404 })
  }

  return NextResponse.json({
    device_id: device.id,
    device_name: device.name,
    settings: device.block_settings?.[0] || { blocked_domains: [], block_level: 'medium' }
  })
}

// האפליקציה מושכת עדכוני הגדרות
export async function GET(req: NextRequest) {
  const device_id = req.nextUrl.searchParams.get('device_id')

  if (!device_id) {
    return NextResponse.json({ error: 'device_id חסר' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('block_settings')
    .select('*')
    .eq('device_id', device_id)
    .single()

  if (error) {
    return NextResponse.json({ error: 'לא נמצא' }, { status: 404 })
  }

  return NextResponse.json(data)
}
