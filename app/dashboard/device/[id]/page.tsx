'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'

type App = { package: string; name: string }
type BlockSettings = {
  blocked_domains: string[]
  blocked_apps: string[]
  block_level: string
}

const APP_CATEGORIES: Record<string, string[]> = {
  'סושיאל': ['facebook', 'instagram', 'twitter', 'tiktok', 'snapchat', 'telegram', 'whatsapp', 'discord'],
  'בידור': ['youtube', 'netflix', 'spotify', 'twitch', 'disney', 'hbo', 'prime', 'studio'],
  'גיימינג': ['game', 'gaming', 'chess', 'puzzle', 'clash', 'roblox'],
  'קניות': ['amazon', 'ebay', 'aliexpress', 'shop', 'store'],
  'דפדפנים': ['chrome', 'firefox', 'safari', 'browser', 'opera', 'brave'],
  'אחר': [],
}

function getCategory(app: App): string {
  const text = (app.name + app.package).toLowerCase()
  for (const [cat, keywords] of Object.entries(APP_CATEGORIES)) {
    if (cat === 'אחר') continue
    if (keywords.some(k => text.includes(k))) return cat
  }
  return 'אחר'
}

export default function DevicePage() {
  const params = useParams()
  const router = useRouter()
  const deviceId = params.id as string

  const [device, setDevice] = useState<any>(null)
  const [settingsId, setSettingsId] = useState<string | null>(null)
  const [settings, setSettings] = useState<BlockSettings>({
    blocked_domains: [],
    blocked_apps: [],
    block_level: 'medium'
  })
  const [activeTab, setActiveTab] = useState<'apps' | 'sites' | 'settings'>('apps')
  const [appSearch, setAppSearch] = useState('')
  const [newDomain, setNewDomain] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeCategory, setActiveCategory] = useState('הכל')

  const loadData = useCallback(async () => {
    const { data: dev } = await supabase
      .from('devices')
      .select('*')
      .eq('id', deviceId)
      .single()

    if (!dev) { router.push('/dashboard'); return }
    setDevice(dev)

    const { data: s } = await supabase
      .from('block_settings')
      .select('*')
      .eq('device_id', deviceId)
      .single()

    if (s) {
      setSettingsId(s.id)
      setSettings({
        blocked_domains: s.blocked_domains || [],
        blocked_apps: s.blocked_apps || [],
        block_level: s.block_level || 'medium'
      })
    }
    setLoading(false)
  }, [deviceId, router])

  useEffect(() => { loadData() }, [loadData])

  async function save() {
    setSaving(true)
    try {
      if (settingsId) {
        // עדכון רשומה קיימת
        const { error } = await supabase
          .from('block_settings')
          .update({
            blocked_domains: settings.blocked_domains,
            blocked_apps: settings.blocked_apps,
            block_level: settings.block_level,
            updated_at: new Date().toISOString()
          })
          .eq('id', settingsId)

        if (error) throw error
      } else {
        // יצירת רשומה חדשה
        const { data, error } = await supabase
          .from('block_settings')
          .insert({
            device_id: deviceId,
            blocked_domains: settings.blocked_domains,
            blocked_apps: settings.blocked_apps,
            block_level: settings.block_level,
          })
          .select()
          .single()

        if (error) throw error
        if (data) setSettingsId(data.id)
      }

      alert('✅ הגדרות נשמרו בהצלחה!')
    } catch (e: any) {
      alert('❌ שגיאה בשמירה: ' + e.message)
    }
    setSaving(false)
  }

  function toggleApp(pkg: string) {
    setSettings(prev => ({
      ...prev,
      blocked_apps: prev.blocked_apps.includes(pkg)
        ? prev.blocked_apps.filter(a => a !== pkg)
        : [...prev.blocked_apps, pkg]
    }))
  }

  function addDomain() {
    if (!newDomain.trim()) return
    const domain = newDomain.trim().toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/\/.*/, '')
    if (settings.blocked_domains.includes(domain)) return
    setSettings(prev => ({ ...prev, blocked_domains: [...prev.blocked_domains, domain] }))
    setNewDomain('')
  }

  function removeDomain(domain: string) {
    setSettings(prev => ({
      ...prev,
      blocked_domains: prev.blocked_domains.filter(d => d !== domain)
    }))
  }

  function isOnline(lastSeen: string | null): boolean {
    if (!lastSeen) return false
    return Date.now() - new Date(lastSeen).getTime() < 20 * 60 * 1000
  }

  const apps: App[] = device?.installed_apps || []
  const categories = ['הכל', ...Object.keys(APP_CATEGORIES)]

  const filteredApps = apps.filter(app => {
    const matchSearch = app.name?.toLowerCase().includes(appSearch.toLowerCase())
    const matchCat = activeCategory === 'הכל' || getCategory(app) === activeCategory
    return matchSearch && matchCat
  })

  const blockedCount = settings.blocked_apps.length

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-slate-400">טוען...</p>
    </div>
  )

  return (
    <main className="min-h-screen max-w-2xl mx-auto p-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 pt-4">
        <button onClick={() => router.push('/dashboard')}
          className="text-slate-400 hover:text-white text-2xl">←</button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{device?.name}</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <div className={`w-2 h-2 rounded-full ${isOnline(device?.last_seen) ? 'bg-green-500' : 'bg-slate-600'}`} />
            <span className="text-slate-400 text-sm">
              {isOnline(device?.last_seen) ? 'מחובר' : 'מנותק'}
            </span>
            <span className="text-slate-600 text-sm">•</span>
            <span className="text-yellow-400 text-sm font-mono">{device?.activation_code}</span>
          </div>
        </div>
        {blockedCount > 0 && (
          <span className="bg-red-600 text-white text-xs px-2 py-1 rounded-full">
            {blockedCount} חסומות
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-900 rounded-xl p-1 mb-4 gap-1">
        {[
          { key: 'apps', label: '📱 אפליקציות' },
          { key: 'sites', label: '🌐 אתרים' },
          { key: 'settings', label: '⚙️ הגדרות' },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === tab.key ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Apps Tab */}
      {activeTab === 'apps' && (
        <div className="bg-slate-900 rounded-2xl p-4">
          {apps.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-400 text-lg mb-2">אין אפליקציות עדיין</p>
              <p className="text-slate-600 text-sm">האפליקציות יופיעו תוך 15 דקות מחיבור המכשיר</p>
            </div>
          ) : (
            <>
              <input value={appSearch} onChange={e => setAppSearch(e.target.value)}
                placeholder="🔍 חפש אפליקציה..."
                className="w-full bg-slate-800 rounded-xl px-4 py-2.5 text-white text-sm outline-none mb-3" />

              <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
                {categories.map(cat => (
                  <button key={cat} onClick={() => setActiveCategory(cat)}
                    className={`px-3 py-1 rounded-full text-xs whitespace-nowrap transition border ${
                      activeCategory === cat
                        ? 'bg-blue-600 border-blue-500 text-white'
                        : 'border-slate-700 text-slate-400 hover:border-slate-500'
                    }`}>
                    {cat}
                  </button>
                ))}
              </div>

              <p className="text-slate-600 text-xs mb-2">{filteredApps.length} אפליקציות</p>

              <div className="flex flex-col gap-1.5 max-h-[500px] overflow-y-auto">
                {filteredApps.map(app => {
                  const isBlocked = settings.blocked_apps.includes(app.package)
                  return (
                    <div key={app.package} onClick={() => toggleApp(app.package)}
                      className={`flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer transition ${
                        isBlocked
                          ? 'bg-red-950 border border-red-800'
                          : 'bg-slate-800 hover:bg-slate-700'
                      }`}>
                      <div>
                        <p className="text-sm font-medium">{app.name}</p>
                        <p className="text-slate-600 text-xs">{getCategory(app)}</p>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                        isBlocked ? 'bg-red-600 text-white' : 'bg-slate-700 text-slate-300'
                      }`}>
                        {isBlocked ? '🚫 חסום' : 'פעיל'}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* Sites Tab */}
      {activeTab === 'sites' && (
        <div className="bg-slate-900 rounded-2xl p-4">
          <div className="flex gap-2 mb-4">
            <input value={newDomain} onChange={e => setNewDomain(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addDomain()}
              placeholder="הכנס כתובת אתר לחסימה..."
              className="flex-1 bg-slate-800 rounded-xl px-4 py-2.5 text-white text-sm outline-none" />
            <button onClick={addDomain}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-sm font-medium">
              חסום
            </button>
          </div>

          <div className="flex flex-col gap-2">
            {settings.blocked_domains.map(domain => (
              <div key={domain}
                className="flex items-center justify-between bg-slate-800 rounded-xl px-4 py-3">
                <span className="text-sm font-mono text-red-300">🚫 {domain}</span>
                <button onClick={() => removeDomain(domain)}
                  className="text-slate-500 hover:text-red-400 text-xl leading-none">×</button>
              </div>
            ))}
            {settings.blocked_domains.length === 0 && (
              <p className="text-slate-600 text-center py-6">אין אתרים חסומים</p>
            )}
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="bg-slate-900 rounded-2xl p-4">
          <label className="text-slate-400 text-sm mb-3 block">רמת חסימת DNS</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: 'light', label: '🟡 קלה', desc: 'תוכן בוגר בלבד' },
              { value: 'medium', label: '🟠 בינונית', desc: 'בוגר + הימורים' },
              { value: 'strict', label: '🔴 מחמירה', desc: 'הכל + רשתות חברתיות' }
            ].map(level => (
              <button key={level.value}
                onClick={() => setSettings(prev => ({ ...prev, block_level: level.value }))}
                className={`py-3 px-2 rounded-xl text-sm transition border flex flex-col items-center gap-1 ${
                  settings.block_level === level.value
                    ? 'border-blue-500 bg-blue-950'
                    : 'border-slate-700 text-slate-400'
                }`}>
                <span className="font-medium">{level.label}</span>
                <span className="text-xs text-slate-500 text-center">{level.desc}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Save Button */}
      <button onClick={save} disabled={saving}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-4 rounded-2xl transition mt-4 text-lg">
        {saving ? 'שומר...' : '💾 שמור הגדרות'}
      </button>
    </main>
  )
}
