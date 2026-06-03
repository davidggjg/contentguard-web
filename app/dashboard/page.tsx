'use client'
import { useState, useEffect } from 'react'
import { supabase, generateActivationCode } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Device = {
  id: string
  name: string
  activation_code: string
  last_seen: string | null
  created_at: string
}

export default function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const [devices, setDevices] = useState<Device[]>([])
  const [newDeviceName, setNewDeviceName] = useState('')
  const [loading, setLoading] = useState(true)
  const [showAddDevice, setShowAddDevice] = useState(false)
  const router = useRouter()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    setUser(user)
    const { data } = await supabase.from('devices').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    setDevices(data || [])
    setLoading(false)
  }

  async function addDevice() {
    if (!newDeviceName.trim()) return
    const code = generateActivationCode()
    const { data } = await supabase.from('devices').insert({
      user_id: user.id, name: newDeviceName, activation_code: code,
    }).select().single()
    if (data) {
      await supabase.from('block_settings').insert({ device_id: data.id })
      setDevices(prev => [data, ...prev])
      setNewDeviceName('')
      setShowAddDevice(false)
    }
  }

  function isOnline(lastSeen: string | null): boolean {
    if (!lastSeen) return false
    return Date.now() - new Date(lastSeen).getTime() < 20 * 60 * 1000
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen"><p className="text-slate-400">טוען...</p></div>

  return (
    <main className="min-h-screen p-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-8 pt-4">
        <div>
          <h1 className="text-2xl font-bold">🛡️ ContentGuard</h1>
          <p className="text-slate-400 text-sm">{user?.email}</p>
        </div>
        <button onClick={async () => { await supabase.auth.signOut(); router.push('/') }}
          className="text-slate-400 hover:text-white text-sm border border-slate-700 px-3 py-1 rounded-lg">
          יציאה
        </button>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-lg">📱 המכשירים שלי ({devices.length})</h2>
        <button onClick={() => setShowAddDevice(!showAddDevice)}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-xl transition">
          + הוסף מכשיר
        </button>
      </div>

      {showAddDevice && (
        <div className="flex gap-2 mb-4">
          <input value={newDeviceName} onChange={e => setNewDeviceName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addDevice()}
            placeholder="שם המכשיר (למשל: טלפון של יוסי)"
            className="flex-1 bg-slate-800 rounded-xl px-4 py-3 text-white text-sm outline-none" />
          <button onClick={addDevice} className="bg-green-600 hover:bg-green-700 text-white px-5 py-3 rounded-xl text-sm font-medium">צור</button>
        </div>
      )}

      {devices.length === 0 ? (
        <div className="bg-slate-900 rounded-2xl p-8 text-center">
          <p className="text-4xl mb-3">📱</p>
          <p className="text-slate-300 font-medium mb-1">אין מכשירים עדיין</p>
          <p className="text-slate-500 text-sm">לחץ "הוסף מכשיר" כדי להתחיל</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {devices.map(device => (
            <div key={device.id} onClick={() => router.push(`/dashboard/device/${device.id}`)}
              className="bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-600 rounded-2xl p-4 cursor-pointer transition">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-lg">{device.name}</p>
                  <p className="text-slate-400 text-sm mt-0.5">
                    קוד הפעלה: <span className="font-mono text-yellow-400">{device.activation_code}</span>
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className={`w-3 h-3 rounded-full ${isOnline(device.last_seen) ? 'bg-green-500' : 'bg-slate-600'}`} />
                  <span className={`text-xs ${isOnline(device.last_seen) ? 'text-green-400' : 'text-slate-500'}`}>
                    {isOnline(device.last_seen) ? 'מחובר' : 'מנותק'}
                  </span>
                </div>
              </div>
              <div className="mt-3 text-slate-500 text-sm flex items-center gap-1">
                לחץ לניהול ←
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
