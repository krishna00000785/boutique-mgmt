import { useEffect, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Save, X, RefreshCw } from 'lucide-react'
import { orderService } from '../services/orderService'
import { currency, paymentMethods, paymentService, readPreference, requestError, type Payment, type PaymentMethod } from '../services/managementService'
import type { Order } from '../types/order'

const inputClass = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#B88736] focus:outline-none focus:ring-2 focus:ring-[#B88736]/20'

export default function Payments() {
  const [params, setParams] = useSearchParams()
  const orderFilter = params.get('orderId') ?? ''
  const [payments, setPayments] = useState<Payment[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [refresh, setRefresh] = useState(0)
  const [showForm, setShowForm] = useState(false)
  const [orderId, setOrderId] = useState(orderFilter)
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<PaymentMethod>('CASH')
  const [notes, setNotes] = useState('')
  const [search, setSearch] = useState('')
  const [methodFilter, setMethodFilter] = useState('')

  useEffect(() => {
    let active = true
    Promise.all([paymentService.getAll(orderFilter), orderService.getAll({ includeAll: true })]).then(([records, orderList]) => {
      if (active) { setPayments(records); setOrders(orderList) }
    }).catch((err: unknown) => { if (active) setError(requestError(err, 'Unable to load payments.')) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [orderFilter, refresh])

  function reload() { setLoading(true); setError(''); setRefresh((value) => value + 1) }
  function openForm() {
    const preference = readPreference('paymentMethod', 'CASH')
    setMethod(paymentMethods.includes(preference as PaymentMethod) ? preference as PaymentMethod : 'CASH')
    setOrderId(orderFilter); setAmount(''); setNotes(''); setError(''); setSuccess(''); setShowForm(true)
  }
  const selectedOrder = orders.find((order) => order.id === orderId)
  const visible = payments.filter((payment) => (!methodFilter || payment.paymentMethod === methodFilter) && `${payment.order.orderNumber} ${payment.order.customer.name} ${payment.order.customer.phone}`.toLowerCase().includes(search.toLowerCase().trim()))

  async function save(event: FormEvent) {
    event.preventDefault(); setError(''); setSuccess('')
    if (!selectedOrder || selectedOrder.status === 'CANCELLED' || !Number.isFinite(Number(amount)) || Number(amount) <= 0 || Math.round(Number(amount) * 100) > Math.round(selectedOrder.balanceAmount * 100)) {
      setError('Choose an active order and an amount within its outstanding balance.'); return
    }
    setSaving(true)
    try {
      await paymentService.create({ orderId, amount: Number(amount), paymentMethod: method, notes })
      setShowForm(false); setSuccess('Payment recorded.'); reload()
    } catch (err) { setError(requestError(err, 'Unable to record payment.')) }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-3xl font-semibold text-[#4B1020]">Payments</h2><div className="flex gap-2"><button disabled={loading || saving} onClick={reload} aria-label="Refresh payments" title="Refresh payments" className="rounded-lg border border-gray-300 p-2.5 disabled:opacity-50"><RefreshCw size={18} /></button><button disabled={loading || saving} onClick={openForm} className="flex items-center gap-2 rounded-lg bg-[#760D2D] px-4 py-2 text-sm text-white disabled:opacity-50"><Plus size={18} />Record Payment</button></div></div>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {success && <p role="status" className="text-sm text-green-700">{success}</p>}
      <div className="grid gap-4 border-y border-[#B88736]/20 py-4 sm:grid-cols-3">
        <label className="space-y-1 text-sm">Search<input aria-label="Search payments" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Order, customer or phone" className={inputClass} /></label>
        <label className="space-y-1 text-sm">Order<select value={orderFilter} onChange={(event) => { setLoading(true); setError(''); setParams(event.target.value ? { orderId: event.target.value } : {}) }} className={inputClass}><option value="">All orders</option>{orders.map((order) => <option key={order.id} value={order.id}>{order.orderNumber} - {order.customer.name}</option>)}</select></label>
        <label className="space-y-1 text-sm">Payment method<select aria-label="Filter payment method" value={methodFilter} onChange={(event) => setMethodFilter(event.target.value)} className={inputClass}><option value="">All methods</option>{paymentMethods.map((value) => <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>)}</select></label>
      </div>
      {showForm && (
        <form onSubmit={save} className="space-y-4 border-b border-[#B88736]/20 pb-6">
          <div className="flex items-center justify-between"><h3 className="text-xl font-semibold text-[#4B1020]">New Payment</h3><button type="button" disabled={saving} onClick={() => setShowForm(false)} title="Close" aria-label="Close payment form" className="p-2"><X size={18} /></button></div>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="space-y-1 text-sm">Order<select required value={orderId} onChange={(event) => setOrderId(event.target.value)} className={inputClass}><option value="">Select order</option>{orders.filter((order) => order.status !== 'CANCELLED' && order.balanceAmount > 0).map((order) => <option key={order.id} value={order.id}>{order.orderNumber} - {order.customer.name}</option>)}</select></label>
            <label className="space-y-1 text-sm">Amount (INR)<input required type="number" step="0.01" min="0.01" max={selectedOrder?.balanceAmount ?? undefined} value={amount} onChange={(event) => setAmount(event.target.value)} className={inputClass} /></label>
            <label className="space-y-1 text-sm">Method<select value={method} onChange={(event) => setMethod(event.target.value as PaymentMethod)} className={inputClass}>{paymentMethods.map((value) => <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>)}</select></label>
          </div>
          {selectedOrder && <dl className="grid gap-3 text-sm sm:grid-cols-3"><div><dt className="text-gray-500">Order total</dt><dd className="font-semibold">{currency(selectedOrder.totalAmount)}</dd></div><div><dt className="text-gray-500">Received</dt><dd className="font-semibold">{currency(selectedOrder.advanceAmount)}</dd></div><div><dt className="text-gray-500">Outstanding</dt><dd className="font-semibold text-[#760D2D]">{currency(selectedOrder.balanceAmount)}</dd></div></dl>}
          <label className="block space-y-1 text-sm">Notes<textarea maxLength={500} value={notes} onChange={(event) => setNotes(event.target.value)} className={inputClass} /></label>
          <button disabled={saving} className="flex items-center gap-2 rounded-lg bg-[#760D2D] px-4 py-2 text-sm text-white disabled:opacity-50"><Save size={17} />{saving ? 'Saving...' : 'Save Payment'}</button>
        </form>
      )}
      <div className="flex flex-wrap justify-between gap-3 text-sm"><p>{visible.length} payment(s)</p><p className="font-semibold text-[#4B1020]">Received: {currency(visible.reduce((sum, payment) => sum + Math.round(payment.amount * 100), 0) / 100)}</p></div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b border-gray-200 text-gray-500"><tr>{['Date', 'Order', 'Customer', 'Method', 'Amount', 'Notes'].map((heading) => <th key={heading} className="px-3 py-3 font-medium">{heading}</th>)}</tr></thead>
          <tbody>{loading ? <tr><td colSpan={6} className="py-8 text-center">Loading payments...</td></tr> : visible.length === 0 ? <tr><td colSpan={6} className="py-8 text-center text-gray-500">No payments found.</td></tr> : visible.map((payment) => <tr key={payment.id} className="border-b border-gray-100"><td className="whitespace-nowrap px-3 py-4">{new Date(payment.paymentDate).toLocaleString('en-IN')}</td><td className="px-3 py-4 text-[#760D2D]">{payment.order.orderNumber}</td><td className="px-3 py-4">{payment.order.customer.name}</td><td className="px-3 py-4">{payment.paymentMethod.replaceAll('_', ' ')}</td><td className="whitespace-nowrap px-3 py-4 font-medium">{currency(payment.amount)}</td><td className="max-w-xs break-words px-3 py-4">{payment.notes || '-'}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  )
}