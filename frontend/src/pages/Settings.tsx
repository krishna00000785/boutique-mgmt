import { useEffect, useState, type FormEvent } from 'react'
import { RefreshCw, Save } from 'lucide-react'
import { api } from '../services/api'
import { paymentMethods, readPreference, type MeasurementUnit, type PaymentMethod } from '../services/managementService'

const inputClass = 'mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#B88736] focus:outline-none focus:ring-2 focus:ring-[#B88736]/20'

export default function Settings() {
  const [unit, setUnit] = useState<MeasurementUnit>(() => readPreference('measurementUnit', 'INCH') === 'CM' ? 'CM' : 'INCH')
  const [method, setMethod] = useState<PaymentMethod>(() => {
    const value = readPreference('paymentMethod', 'CASH')
    return paymentMethods.includes(value as PaymentMethod) ? value as PaymentMethod : 'CASH'
  })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [connection, setConnection] = useState('Checking...')
  const [checking, setChecking] = useState(true)
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    let active = true
    api.get<{ status: string; database: string }>('/health').then(({ data }) => {
      if (active) setConnection(data.status === 'UP' && data.database === 'CONNECTED' ? 'API and database connected' : 'Connection unavailable')
    }).catch(() => { if (active) setConnection('API or database unavailable') })
      .finally(() => { if (active) setChecking(false) })
    return () => { active = false }
  }, [refresh])

  function save(event: FormEvent) {
    event.preventDefault(); setMessage(''); setError('')
    try {
      localStorage.setItem('boutique.measurementUnit', unit)
      localStorage.setItem('boutique.paymentMethod', method)
      setMessage('Browser preferences saved.')
    } catch { setError('Unable to save browser preferences. Browser storage may be disabled.') }
  }

  return (
    <div className="w-full max-w-3xl space-y-5 sm:space-y-6">
      <h2 className="text-2xl font-semibold text-[#4B1020] sm:text-3xl">Settings</h2>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {message && <p role="status" className="text-sm text-green-700">{message}</p>}
      <form onSubmit={save} className="space-y-5 border-y border-[#B88736]/20 py-4 sm:py-5">
        <h3 className="text-lg font-semibold text-[#4B1020] sm:text-xl">Browser Preferences</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="text-sm">Default measurement unit<select value={unit} onChange={(event) => setUnit(event.target.value as MeasurementUnit)} className={inputClass}><option value="INCH">Inches</option><option value="CM">Centimetres</option></select></label>
          <label className="text-sm">Default payment method<select value={method} onChange={(event) => setMethod(event.target.value as PaymentMethod)} className={inputClass}>{paymentMethods.map((value) => <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>)}</select></label>
        </div>
        <button className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#760D2D] px-4 py-2 text-sm text-white transition-colors hover:bg-[#5F0A24] sm:w-auto"><Save size={17} />Save Preferences</button>
      </form>
      <section className="space-y-3 border-b border-[#B88736]/20 pb-5">
        <div className="flex items-center justify-between gap-3"><h3 className="text-lg font-semibold text-[#4B1020] sm:text-xl">Connection</h3><button type="button" title="Check connection" aria-label="Check connection" disabled={checking} onClick={() => { setChecking(true); setConnection('Checking...'); setRefresh((value) => value + 1) }} className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg border border-gray-300 p-2 transition-colors hover:bg-gray-50 disabled:opacity-50"><RefreshCw size={18} className={checking ? 'animate-spin' : ''} /></button></div>
        <p role="status" className="break-words text-sm text-gray-700">{connection}</p>
      </section>
    </div>
  )
}