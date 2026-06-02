import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// חשוב: persistSession: false מונע מ-session של משתמש לדרוס את ה-service key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  }
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const activation_code = body?.activation_code

    if (!activation_code) {
      return NextResponse.json({ error: 'קוד הפעלה חסר' }, { status: 400 })
    }

    const { data: device, error } = await supabase
      .from('devices')
      .select('id, name, activation_code, block_settings(*)')
      .eq('activation_code', activation_code.toUpperCase().trim())
      .maybeSingle()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!device) {
      return NextResponse.json({ error: 'קוד הפעלה לא נמצא' }, { status: 404 })
    }

    return NextResponse.json({
      device_id: device.id,
      device_name: device.name,
      settings: (device.block_settings as any)?.[0] || {
        blocked_domains: [],
        block_level: 'medium'
      }
    })
  } catch (e: any) {
    console.error('Route error:', e)
    return NextResponse.json({ error: 'שגיאת שרת: ' + e.message }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const device_id = req.nextUrl.searchParams.get('device_id')

    if (!device_id) {
      return NextResponse.json({ error: 'device_id חסר' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('block_settings')
      .select('*')
      .eq('device_id', device_id)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'לא נמצא' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: 'שגיאת שרת' }, { status: 500 })
  }
}
