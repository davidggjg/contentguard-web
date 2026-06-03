'use client'
import { useState, useEffect } from 'react'
import { supabase, generateActivationCode } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Device = {
  id: string
  name: string
  activation_code: string
  is_active: boolean
  last_seen: string | null
  installed_apps: { package: string; name: string }[]
  created_at: string
}

type BlockSettings = {
  blocked_domains: string[]
  blocked_apps: string[]
  block_level: string
}

export default function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const [devices, setDevices] = useState<Device[]>([])
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null)
  const [settings, setSettings] = useState<BlockSettings>({ blocked_domains: [], blocked_apps: [], block_level: 'medium' })
  const [newDomain, setNewDomain] = useState('')
  const [newDeviceName, setNewDeviceName] = useState('')
  const [loading, setLoading] = useState(true)
  const [showAddDevice, setShowAddDevice] = useState(false)
  const [appSearch, setAppSearch] = useState('')
  const router = useRouter()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    setUser(user)
    await loadDevices(user.id)
    setLoading(false)
  }

  async function loadDevices(userId: string) {
    const { data } = await supabase
      .from('devices')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    setDevices(data || [])
  }

  async function loadSettings(deviceId: string) {
    const { data } = await supabase
      .from('block_settings')
      .select('*')
      .eq('device_id', deviceId)
      .single()
    if (data) setSettings({
      blocked_domains: data.blocked_domains || [],
      blocked_apps: data.blocked_apps || [],
      block_level: data.block_level || 'medium'
    })
    else setSettings({ blocked_domains: [], blocked_apps: [], block_level: 'medium' })
  }

  async function selectDevice(device: Device) {
    setSelectedDevice(device)
    setAppSearch('')
    await loadSettings(device.id)
  }

  async function addDevice() {
    if (!newDeviceName.trim()) return
    const code = generateActivationCode()
    const { data } = await supabase.from('devices').insert({
      user_id: user.id,
      name: newDeviceName,
      activation_code: code,
    }).select().single()
    if (data) {
      await supabase.from('block_settings').insert({ device_id: data.id })
      setDevices(prev => [data, ...prev])
      setNewDeviceName('')
      setShowAddDevice(false)
    }
  }

  async function saveSettings() {
    if (!selectedDevice) return
    await supabase.from('block_settings')
      .upsert({ device_id: selectedDevice.id, ...settings, updated_at: new Date().toISOString() })
    alert('✅ הגדרות נשמרו!')
  }

  async function addDomain() {
    if (!newDomain.trim()) return
    const domain = newDomain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*/, '')
    setSettings(prev => ({ ...prev, blocked_domains: [...prev.blocked_domains, domain] }))
    setNewDomain('')
  }

  function removeDomain(domain: string) {
    setSettings(prev => ({ ...prev, blocked_domains: prev.blocked_domains.filter(d => d !== domain) }))
  }

  function toggleBlockApp(packageName: string) {
    setSettings(prev => ({
      ...prev,
      blocked_apps: prev.blocked_apps.includes(packageName)
        ? prev.blocked_apps.filter(a => a !== packageName)
        : [...prev.blocked_apps, packageName]
    }))
  }

  function isOnline(lastSeen: string | null): boolean {
    if (!lastSeen) return false
    return Date.now() - new Date(lastSeen).getTime() < 20 * 60 * 1000 // 20 דקות
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  const filteredApps = (selectedDevice?.installed_apps || [])
    .filter(app => app.name?.toLowerCase().includes(appSearch.toLowerCase()))

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-slate-400 text-xl">טוען...</div>
    </div>
  )

  return (
    <main className="min-h-screen p-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pt-4">
        <div>
          <h1 className="text-xl font-bold">🛡️ ContentGuard</h1>
          <p className="text-slate-400 text-sm">{user?.email}</p>
        </div>
        <button onClick={handleLogout} className="text-slate-400 hover:text-white text-sm border border-slate-700 px-3 py-1 rounded-lg">
          יציאה
        </button>
      </div>

      {/* Devices */}
      <div className="bg-slate-900 rounded-2xl p-4 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg">📱 המכשירים שלי</h2>
          <button onClick={() => setShowAddDevice(!showAddDevice)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1.5 rounded-lg transition">
            + הוסף מכשיר
          </button>
        </div>

        {showAddDevice && (
          <div className="flex gap-2 mb-4">
            <input value={newDeviceName} onChange={e => setNewDeviceName(e.target.value)}
              placeholder="שם המכשיר" className="flex-1 bg-slate-800 rounded-xl px-3 py-2 text-white text-sm outline-none" />
            <button onClick={addDevice} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-sm">צור</button>
          </div>
        )}

        {devices.length === 0 ? (
          <p className="text-slate-500 text-center py-4">אין מכשירים עדיין.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {devices.map(device => (
              <div key={device.id} onClick={() => selectDevice(device)}
                className={`p-3 rounded-xl cursor-pointer transition border ${selectedDevice?.id === device.id ? 'border-blue-500 bg-blue-950' : 'border-slate-800 hover:border-slate-600 bg-slate-800'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{device.name}</p>
                    <p className="text-slate-400 text-xs mt-0.5">
                      קוד: <span className="font-mono font-bold text-yellow-400">{device.activation_code}</span>
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className={`w-2.5 h-2.5 rounded-full ${isOnline(device.last_seen) ? 'bg-green-500' : 'bg-slate-600'}`} />
                    <span className="text-xs text-slate-500">{isOnline(device.last_seen) ? 'מחובר' : 'מנותק'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Settings */}
      {selectedDevice && (
        <div className="bg-slate-900 rounded-2xl p-4 mb-4">
          <h2 className="font-bold text-lg mb-4">⚙️ הגדרות – {selectedDevice.name}</h2>

          {/* Block Level */}
          <div className="mb-4">
            <label className="text-slate-400 text-sm mb-2 block">רמת חסימה</label>
            <div className="grid grid-cols-3 gap-2">
              {[{ value: 'light', label: '🟡 קלה' }, { value: 'medium', label: '🟠 בינונית' }, { value: 'strict', label: '🔴 מחמירה' }].map(level => (
                <button key={level.value} onClick={() => setSettings(prev => ({ ...prev, block_level: level.value }))}
                  className={`py-2 rounded-xl text-sm font-medium transition border ${settings.block_level === level.value ? 'border-blue-500 bg-blue-950 text-white' : 'border-slate-700 text-slate-400 hover:border-slate-500'}`}>
                  {level.label}
                </button>
              ))}
            </div>
          </div>

          {/* Blocked Domains */}
          <div className="mb-4">
            <label className="text-slate-400 text-sm mb-2 block">אתרים חסומים</label>
            <div className="flex gap-2 mb-2">
              <input value={newDomain} onChange={e => setNewDomain(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addDomain()}
                placeholder="הכנס כתובת אתר..."
                className="flex-1 bg-slate-800 rounded-xl px-3 py-2 text-white text-sm outline-none" />
              <button onClick={addDomain} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-sm">חסום</button>
            </div>
            <div className="flex flex-col gap-1 max-h-32 overflow-y-auto">
              {settings.blocked_domains.map(domain => (
                <div key={domain} className="flex items-center justify-between bg-slate-800 rounded-lg px-3 py-2">
                  <span className="text-sm font-mono text-red-300">{domain}</span>
                  <button onClick={() => removeDomain(domain)} className="text-slate-500 hover:text-red-400 text-lg leading-none">×</button>
                </div>
              ))}
              {settings.blocked_domains.length === 0 && <p className="text-slate-600 text-sm text-center py-2">אין אתרים חסומים</p>}
            </div>
          </div>

          {/* Installed Apps */}
          <div className="mb-4">
            <label className="text-slate-400 text-sm mb-2 block">
              אפליקציות חסומות
              {settings.blocked_apps.length > 0 && (
                <span className="mr-2 bg-red-600 text-white text-xs px-2 py-0.5 rounded-full">{settings.blocked_apps.length} חסומות</span>
              )}
            </label>

            {filteredApps.length === 0 && (selectedDevice.installed_apps || []).length === 0 ? (
              <p className="text-slate-600 text-sm text-center py-4">
                האפליקציות יופיעו כאן אחרי שהמכשיר יתחבר לאינטרנט (עד 15 דקות)
              </p>
            ) : (
              <>
                <input value={appSearch} onChange={e => setAppSearch(e.target.value)}
                  placeholder="חפש אפליקציה..."
                  className="w-full bg-slate-800 rounded-xl px-3 py-2 text-white text-sm outline-none mb-2" />
                <div className="flex flex-col gap-1 max-h-64 overflow-y-auto">
                  {filteredApps.map(app => {
                    const isBlocked = settings.blocked_apps.includes(app.package)
                    return (
                      <div key={app.package}
                        onClick={() => toggleBlockApp(app.package)}
                        className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition ${isBlocked ? 'bg-red-950 border border-red-700' : 'bg-slate-800 hover:bg-slate-700'}`}>
                        <span className="text-sm">{app.name}</span>
                        <span className={`text-xs font-medium ${isBlocked ? 'text-red-400' : 'text-slate-500'}`}>
                          {isBlocked ? '🚫 חסום' : 'פעיל'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>

          <button onClick={saveSettings}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition">
            💾 שמור הגדרות
          </button>
        </div>
      )}
    </main>
  )
}
