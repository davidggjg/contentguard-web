import Link from 'next/link'

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-8 text-center">
      <div className="max-w-md w-full">
        <div className="text-6xl mb-6">🛡️</div>
        <h1 className="text-4xl font-bold mb-4 text-white">ContentGuard</h1>
        <p className="text-slate-400 text-lg mb-10">
          הגנה על התוכן שלך – בכל מכשיר, בכל מקום
        </p>

        <div className="flex flex-col gap-4">
          <Link
            href="/register"
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-xl text-lg transition"
          >
            הרשמה חינמית
          </Link>
          <Link
            href="/login"
            className="border border-slate-600 hover:border-slate-400 text-slate-300 font-bold py-4 px-8 rounded-xl text-lg transition"
          >
            כניסה
          </Link>
        </div>

        <div className="mt-12 grid grid-cols-3 gap-4 text-center">
          <div className="bg-slate-900 rounded-xl p-4">
            <div className="text-2xl mb-2">📱</div>
            <p className="text-slate-400 text-sm">כל המכשירים</p>
          </div>
          <div className="bg-slate-900 rounded-xl p-4">
            <div className="text-2xl mb-2">🔒</div>
            <p className="text-slate-400 text-sm">הגנה מוחלטת</p>
          </div>
          <div className="bg-slate-900 rounded-xl p-4">
            <div className="text-2xl mb-2">⚙️</div>
            <p className="text-slate-400 text-sm">שליטה מלאה</p>
          </div>
        </div>
      </div>
    </main>
  )
}
