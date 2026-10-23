import { useEffect, useState, type FormEvent } from 'react'
import { Download, ChartNoAxesCombined } from 'lucide-react'
import { customerService } from '../services/customerService'
import { currency, paymentMethods, reportService, requestError, type PaymentMethod, type ReportFilters, type ReportResult } from '../services/managementService'
import type { Customer } from '../types/customer'
import type { OrderStatus } from '../types/order'

const inputClass = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#B88736] focus:outline-none focus:ring-2 focus:ring-[#B88736]/20'
const statuses: OrderStatus[] = ['RECEIVED', 'CUTTING', 'STITCHING', 'FINISHING', 'READY', 'DELIVERED', 'CANCELLED']
const localDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const today = localDate(new Date())

function monthRange(month: string) {
  const [year, monthNumber] = month.split('-').map(Number)
  return { from: new Date(year, monthNumber - 1, 1).toISOString(), to: new Date(year, monthNumber, 1).toISOString() }
}

export default function Reports() {
  const [form, setForm] = useState({ kind: 'orders' as 'orders' | 'payments', period: 'month', month: today.slice(0, 7), week: today, from: today, to: today, customerId: '', status: '', garmentType: '', paymentMethod: '', balance: 'all' })
  const [request, setRequest] = useState<ReportFilters>({ kind: 'orders', ...monthRange(today.slice(0, 7)), balance: 'all' })
  const [result, setResult] = useState<ReportResult | null>(null)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [customerError, setCustomerError] = useState('')

  useEffect(() => {
    let active = true
    customerService.getAll('', true).then((data) => { if (active) setCustomers(data) })
      .catch(() => { if (active) setCustomerError('Customer filters are unavailable. Refresh to retry.') })
    return () => { active = false }
  }, [])

  useEffect(() => {
    let active = true
    reportService.generate(request).then((data) => { if (active) setResult(data) })
      .catch((err: unknown) => { if (active) setError(requestError(err, 'Unable to generate report.')) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [request])

  function update(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function generate(event: FormEvent) {
    event.preventDefault(); setError('')
    try {
      let range = monthRange(form.month)
      if (form.period === 'week') {
        const start = new Date(`${form.week}T00:00:00`)
        start.setDate(start.getDate() - (start.getDay() + 6) % 7)
        const end = new Date(start)
        end.setDate(end.getDate() + 7)
        range = { from: start.toISOString(), to: end.toISOString() }
      } else if (form.period === 'custom') {
        const start = new Date(`${form.from}T00:00:00`)
        const end = new Date(`${form.to}T00:00:00`)
        end.setDate(end.getDate() + 1)
        range = { from: start.toISOString(), to: end.toISOString() }
      }
      if (range.from >= range.to || (Date.parse(range.to) - Date.parse(range.from)) / 86400000 > 366) {
        setError('Choose a valid date range of up to one year.'); return
      }
      setResult(null); setLoading(true)
      setRequest({ kind: form.kind, ...range, customerId: form.customerId || undefined, status: form.status as OrderStatus || undefined, garmentType: form.garmentType.trim() || undefined, paymentMethod: form.kind === 'payments' ? form.paymentMethod as PaymentMethod || undefined : undefined, balance: form.kind === 'orders' ? form.balance as ReportFilters['balance'] : 'all' })
    } catch { setError('Choose valid dates for the report.') }
  }

  function exportCsv() {
    if (!result) return
    const rows: (string | number)[][] = result.kind === 'orders'
      ? [['Order', 'Customer', 'Phone', 'Order date', 'Delivery', 'Garments', 'Status', 'Total INR', 'Paid INR', 'Balance INR'], ...result.orders.map((order) => [order.orderNumber, order.customer.name, order.customer.phone, order.orderDate, order.deliveryDate ?? '', order.items.map((item) => `${item.garmentType} (${item.quantity})`).join('; '), order.status, order.totalAmount, order.advanceAmount, order.balanceAmount])]
      : [['Payment date', 'Order', 'Customer', 'Phone', 'Method', 'Amount INR', 'Notes'], ...result.payments.map((payment) => [payment.paymentDate, payment.order.orderNumber, payment.order.customer.name, payment.order.customer.phone, payment.paymentMethod, payment.amount, payment.notes ?? ''])]
    const csv = rows.map((row) => row.map((cell) => {
      const text = String(cell)
      const safe = typeof cell === 'string' && /^[\s]*[=+@-]/.test(text) ? `'${text}` : text
      return `"${safe.replaceAll('"', '""')}"`
    }).join(',')).join('\r\n')
    const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8;' }))
    const anchor = document.createElement('a')
    anchor.href = url; anchor.download = `${result.kind}-${localDate(new Date(request.from))}.csv`; anchor.click()
    URL.revokeObjectURL(url)
  }

  const rangeEnd = new Date(request.to)
  rangeEnd.setMilliseconds(rangeEnd.getMilliseconds() - 1)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-3xl font-semibold text-[#4B1020]">Reports</h2><button onClick={exportCsv} disabled={!result || loading || !!error} className="flex items-center gap-2 rounded-lg border border-[#B88736]/40 px-4 py-2 text-sm text-[#760D2D] disabled:opacity-50"><Download size={18} />Export CSV</button></div>
      <form onSubmit={generate} className="space-y-4 border-y border-[#B88736]/20 py-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="space-y-1 text-sm">Report<select value={form.kind} onChange={(event) => update('kind', event.target.value)} className={inputClass}><option value="orders">Orders</option><option value="payments">Payments</option></select></label>
          <label className="space-y-1 text-sm">Period<select value={form.period} onChange={(event) => update('period', event.target.value)} className={inputClass}><option value="month">Monthly</option><option value="week">Weekly (Mon-Sun)</option><option value="custom">Custom range</option></select></label>
          {form.period === 'month' && <label className="space-y-1 text-sm">Month<input required type="month" value={form.month} onChange={(event) => update('month', event.target.value)} className={inputClass} /></label>}
          {form.period === 'week' && <label className="space-y-1 text-sm">Week containing<input required type="date" value={form.week} onChange={(event) => update('week', event.target.value)} className={inputClass} /></label>}
          {form.period === 'custom' && <><label className="space-y-1 text-sm">From<input required type="date" value={form.from} onChange={(event) => update('from', event.target.value)} className={inputClass} /></label><label className="space-y-1 text-sm">Through<input required type="date" min={form.from} value={form.to} onChange={(event) => update('to', event.target.value)} className={inputClass} /></label></>}
          <label className="space-y-1 text-sm">Customer<select value={form.customerId} onChange={(event) => update('customerId', event.target.value)} className={inputClass}><option value="">All customers</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name} - {customer.phone}</option>)}</select></label>
          <label className="space-y-1 text-sm">Order status<select value={form.status} onChange={(event) => update('status', event.target.value)} className={inputClass}><option value="">All statuses</option>{statuses.map((status) => <option key={status} value={status}>{status.charAt(0) + status.slice(1).toLowerCase()}</option>)}</select></label>
          <label className="space-y-1 text-sm">Garment<input maxLength={100} value={form.garmentType} onChange={(event) => update('garmentType', event.target.value)} className={inputClass} /></label>
          {form.kind === 'orders' ? <label className="space-y-1 text-sm">Balance<select value={form.balance} onChange={(event) => update('balance', event.target.value)} className={inputClass}><option value="all">All orders</option><option value="outstanding">Outstanding</option><option value="paid">Fully paid</option></select></label> : <label className="space-y-1 text-sm">Payment method<select value={form.paymentMethod} onChange={(event) => update('paymentMethod', event.target.value)} className={inputClass}><option value="">All methods</option>{paymentMethods.map((method) => <option key={method} value={method}>{method.replaceAll('_', ' ')}</option>)}</select></label>}
        </div>
        <button disabled={loading} className="flex items-center gap-2 rounded-lg bg-[#760D2D] px-4 py-2 text-sm text-white disabled:opacity-50"><ChartNoAxesCombined size={18} />{loading ? 'Generating...' : 'Generate Report'}</button>
      </form>
      {customerError && <p role="alert" className="text-sm text-amber-800">{customerError}</p>}
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {loading ? <p role="status">Generating report...</p> : result && !error && <>
        <div><h3 className="text-xl font-semibold text-[#4B1020]">{result.kind === 'orders' ? 'Order Report' : 'Payment Report'}</h3><p className="mt-1 text-sm text-gray-500">{new Date(request.from).toLocaleDateString('en-IN')} - {rangeEnd.toLocaleDateString('en-IN')}</p></div>
        <dl className="grid gap-4 border-b border-[#B88736]/20 pb-5 sm:grid-cols-2 lg:grid-cols-4">
          <div><dt className="text-sm text-gray-500">{result.kind === 'orders' ? 'Orders' : 'Payments'}</dt><dd className="mt-1 break-words text-2xl font-semibold">{result.summary.count}</dd></div>
          <div><dt className="text-sm text-gray-500">{result.kind === 'orders' ? 'Order value' : 'Received'}</dt><dd className="mt-1 break-words text-2xl font-semibold">{currency(result.summary.totalAmount)}</dd></div>
          {result.kind === 'orders' && <><div><dt className="text-sm text-gray-500">Paid to date</dt><dd className="mt-1 break-words text-2xl font-semibold">{currency(result.summary.paidAmount)}</dd></div><div><dt className="text-sm text-gray-500">Outstanding</dt><dd className="mt-1 break-words text-2xl font-semibold text-[#760D2D]">{currency(result.summary.balanceAmount)}</dd></div></>}
        </dl>
        <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="border-b border-gray-200 text-gray-500"><tr>{(result.kind === 'orders' ? ['Order', 'Customer', 'Date', 'Garments', 'Status', 'Total', 'Paid', 'Balance'] : ['Date', 'Order', 'Customer', 'Method', 'Amount', 'Notes']).map((heading) => <th key={heading} className="px-3 py-3 font-medium">{heading}</th>)}</tr></thead><tbody>
          {result.summary.count === 0 ? <tr><td colSpan={result.kind === 'orders' ? 8 : 6} className="py-8 text-center text-gray-500">No records match this report.</td></tr> : result.kind === 'orders' ? result.orders.map((order) => <tr key={order.id} className="border-b border-gray-100"><td className="px-3 py-4 text-[#760D2D]">{order.orderNumber}</td><td className="px-3 py-4">{order.customer.name}</td><td className="whitespace-nowrap px-3 py-4">{new Date(order.orderDate).toLocaleDateString('en-IN')}</td><td className="px-3 py-4">{order.items.map((item) => `${item.garmentType} (${item.quantity})`).join(', ')}</td><td className="px-3 py-4">{order.status}</td><td className="whitespace-nowrap px-3 py-4">{currency(order.totalAmount)}</td><td className="whitespace-nowrap px-3 py-4">{currency(order.advanceAmount)}</td><td className="whitespace-nowrap px-3 py-4">{currency(order.balanceAmount)}</td></tr>) : result.payments.map((payment) => <tr key={payment.id} className="border-b border-gray-100"><td className="whitespace-nowrap px-3 py-4">{new Date(payment.paymentDate).toLocaleDateString('en-IN')}</td><td className="px-3 py-4 text-[#760D2D]">{payment.order.orderNumber}</td><td className="px-3 py-4">{payment.order.customer.name}</td><td className="px-3 py-4">{payment.paymentMethod.replaceAll('_', ' ')}</td><td className="whitespace-nowrap px-3 py-4">{currency(payment.amount)}</td><td className="max-w-xs break-words px-3 py-4">{payment.notes || '-'}</td></tr>)}
        </tbody></table></div>
      </>}
    </div>
  )
}