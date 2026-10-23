import { useEffect, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Pencil, Trash2, Save, X, RefreshCw } from 'lucide-react'
import { customerService } from '../services/customerService'
import { orderService } from '../services/orderService'
import { measurementService, readPreference, requestError, type Measurement, type MeasurementUnit } from '../services/managementService'
import type { Customer } from '../types/customer'
import type { Order } from '../types/order'

const inputClass = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-[#B88736] focus:outline-none focus:ring-2 focus:ring-[#B88736]/20'
const defaultDimensions = () => ['Length', 'Chest', 'Waist', 'Shoulder', 'Sleeve length', 'Armhole'].map((name) => ({ name, value: '' }))

export default function Measurements() {
  const [params, setParams] = useSearchParams()
  const customerFilter = params.get('customerId') ?? ''
  const orderFilter = params.get('orderId') ?? ''
  const [measurements, setMeasurements] = useState<Measurement[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [refresh, setRefresh] = useState(0)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string>()
  const [customerId, setCustomerId] = useState('')
  const [orderId, setOrderId] = useState('')
  const [garmentType, setGarmentType] = useState('Blouse')
  const [unit, setUnit] = useState<MeasurementUnit>('INCH')
  const [dimensions, setDimensions] = useState(defaultDimensions)
  const [notes, setNotes] = useState('')

  useEffect(() => {
    let active = true
    Promise.all([
      measurementService.getAll(customerFilter, orderFilter),
      customerService.getAll('', true),
      orderService.getAll({ includeAll: true }),
    ]).then(([records, customerList, orderList]) => {
      if (active) { setMeasurements(records); setCustomers(customerList); setOrders(orderList) }
    }).catch((err: unknown) => {
      if (active) setError(requestError(err, 'Unable to load measurements.'))
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [customerFilter, orderFilter, refresh])

  function reload() { setLoading(true); setError(''); setRefresh((value) => value + 1) }

  function openForm(record?: Measurement) {
    setEditingId(record?.id)
    setCustomerId(record?.customerId ?? customerFilter)
    setOrderId(record?.orderId ?? orderFilter)
    setGarmentType(record?.garmentType ?? 'Blouse')
    setUnit(record?.measurementData?.unit ?? (readPreference('measurementUnit', 'INCH') === 'CM' ? 'CM' : 'INCH'))
    setDimensions(record ? Object.entries(record.measurementData?.values ?? {}).map(([name, value]) => ({ name, value: String(value) })) : defaultDimensions())
    setNotes(record?.notes ?? '')
    setError(''); setSuccess(''); setShowForm(true)
  }

  function changeUnit(next: MeasurementUnit) {
    if (next === unit) return
    const factor = next === 'CM' ? 2.54 : 1 / 2.54
    setDimensions((current) => current.map((dimension) => ({
      ...dimension,
      value: dimension.value ? String(Math.round(Number(dimension.value) * factor * 100) / 100) : '',
    })))
    setUnit(next)
  }

  async function save(event: FormEvent) {
    event.preventDefault(); setError(''); setSuccess('')
    const filled = dimensions.filter((dimension) => dimension.value.trim() !== '')
    const names = filled.map((dimension) => dimension.name.trim().toLowerCase())
    if (!filled.length || new Set(names).size !== names.length || filled.some((dimension) => !dimension.name.trim() || !Number.isFinite(Number(dimension.value)) || Number(dimension.value) <= 0)) {
      setError('Enter at least one positive measurement with a unique name.'); return
    }
    setSaving(true)
    try {
      await measurementService.save({ customerId, orderId: orderId || null, garmentType, measurementData: {
        unit, values: Object.fromEntries(filled.map((dimension) => [dimension.name.trim(), Number(dimension.value)])),
      }, notes }, editingId)
      setShowForm(false); setSuccess('Measurements saved.'); reload()
    } catch (err) { setError(requestError(err, 'Unable to save measurements.')) }
    finally { setSaving(false) }
  }

  async function remove(record: Measurement) {
    if (!window.confirm(`Delete ${record.garmentType} measurements for ${record.customer.name}?`)) return
    setSaving(true); setError(''); setSuccess('')
    try { await measurementService.delete(record.id); reload() }
    catch (err) { setError(requestError(err, 'Unable to delete measurements.')) }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-3xl font-semibold text-[#4B1020]">Measurements</h2>
        <div className="flex gap-2">
          <button onClick={reload} disabled={loading || saving} aria-label="Refresh measurements" title="Refresh measurements" className="rounded-lg border border-gray-300 p-2.5 disabled:opacity-50"><RefreshCw size={18} /></button>
          <button onClick={() => openForm()} disabled={loading || saving} className="flex items-center gap-2 rounded-lg bg-[#760D2D] px-4 py-2 text-sm text-white disabled:opacity-50"><Plus size={18} />Add Measurements</button>
        </div>
      </div>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {success && <p role="status" className="text-sm text-green-700">{success}</p>}
      <div className="flex flex-wrap items-end gap-3 border-y border-[#B88736]/20 py-4">
        <label className="w-full max-w-sm space-y-1 text-sm">Customer
          <select aria-label="Filter measurements by customer" value={customerFilter} onChange={(event) => { setLoading(true); setError(''); setParams(event.target.value ? { customerId: event.target.value } : {}) }} className={inputClass}>
            <option value="">All customers</option>
            {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name} - {customer.phone}</option>)}
          </select>
        </label>
        {orderFilter && <button onClick={() => { setLoading(true); setParams(customerFilter ? { customerId: customerFilter } : {}) }} className="flex items-center gap-2 text-sm text-[#760D2D]">{orders.find((order) => order.id === orderFilter)?.orderNumber ?? 'Selected order'}<X size={16} /></button>}
      </div>
      {showForm && (
        <form onSubmit={save} className="space-y-4 border-b border-[#B88736]/20 pb-6">
          <div className="flex items-center justify-between"><h3 className="text-xl font-semibold text-[#4B1020]">{editingId ? 'Edit Measurements' : 'New Measurements'}</h3><button type="button" onClick={() => setShowForm(false)} disabled={saving} aria-label="Close measurement form" title="Close" className="p-2"><X size={18} /></button></div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="space-y-1 text-sm">Customer<select required value={customerId} onChange={(event) => { setCustomerId(event.target.value); setOrderId('') }} className={inputClass}><option value="">Select customer</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name} - {customer.phone}</option>)}</select></label>
            <label className="space-y-1 text-sm">Order (optional)<select value={orderId} onChange={(event) => setOrderId(event.target.value)} className={inputClass}><option value="">Customer profile</option>{orders.filter((order) => order.customerId === customerId).map((order) => <option key={order.id} value={order.id}>{order.orderNumber}</option>)}</select></label>
            <label className="space-y-1 text-sm">Garment<input required minLength={2} maxLength={100} value={garmentType} onChange={(event) => setGarmentType(event.target.value)} className={inputClass} /></label>
            <label className="space-y-1 text-sm">Unit<select value={unit} onChange={(event) => changeUnit(event.target.value as MeasurementUnit)} className={inputClass}><option value="INCH">Inches</option><option value="CM">Centimetres</option></select></label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {dimensions.map((dimension, index) => (
              <div key={index} className="flex min-w-0 items-end gap-2">
                <label className="min-w-0 flex-1 space-y-1 text-sm">Dimension<input aria-label={`Dimension ${index + 1}`} value={dimension.name} maxLength={60} onChange={(event) => setDimensions((current) => current.map((item, position) => position === index ? { ...item, name: event.target.value } : item))} className={inputClass} /></label>
                <label className="w-24 shrink-0 space-y-1 text-sm">{unit === 'INCH' ? 'Inches' : 'cm'}<input aria-label={`${dimension.name || 'Dimension'} value`} type="number" step="0.01" min="0.01" max="500" value={dimension.value} onChange={(event) => setDimensions((current) => current.map((item, position) => position === index ? { ...item, value: event.target.value } : item))} className={inputClass} /></label>
                <button type="button" title="Remove dimension" aria-label={`Remove dimension ${index + 1}`} onClick={() => setDimensions((current) => current.filter((_, position) => position !== index))} className="p-2.5 text-red-700"><Trash2 size={16} /></button>
              </div>
            ))}
          </div>
          <button type="button" disabled={dimensions.length >= 40} onClick={() => setDimensions((current) => [...current, { name: '', value: '' }])} className="flex items-center gap-2 text-sm text-[#760D2D]"><Plus size={16} />Add Dimension</button>
          <label className="block space-y-1 text-sm">Notes<textarea maxLength={1000} value={notes} onChange={(event) => setNotes(event.target.value)} className={inputClass} /></label>
          <button disabled={saving} className="flex items-center gap-2 rounded-lg bg-[#760D2D] px-4 py-2 text-sm text-white disabled:opacity-50"><Save size={17} />{saving ? 'Saving...' : 'Save Measurements'}</button>
        </form>
      )}
      {loading ? <p role="status">Loading measurements...</p> : measurements.length === 0 ? <p className="py-8 text-center text-gray-500">No measurements found.</p> : (
        <div className="grid gap-4 lg:grid-cols-2">
          {measurements.map((record) => (
            <article key={record.id} className="min-w-0 rounded-lg border border-[#B88736]/20 bg-white p-4">
              <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="break-words font-semibold text-[#4B1020]">{record.customer.name} - {record.garmentType}</h3><p className="mt-1 break-all text-xs text-gray-500">{record.order?.orderNumber ?? 'Customer profile'} | {new Date(record.updatedAt).toLocaleDateString('en-IN')} | {record.measurementData?.unit === 'CM' ? 'cm' : 'inches'}</p></div><div className="flex shrink-0"><button disabled={saving} title="Edit measurements" aria-label={`Edit measurements for ${record.customer.name}`} onClick={() => openForm(record)} className="p-2 text-[#760D2D]"><Pencil size={17} /></button><button disabled={saving} title="Delete measurements" aria-label={`Delete measurements for ${record.customer.name}`} onClick={() => void remove(record)} className="p-2 text-red-700"><Trash2 size={17} /></button></div></div>
              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">{Object.entries(record.measurementData?.values ?? {}).map(([name, value]) => <div key={name} className="flex min-w-0 justify-between gap-2 border-b border-gray-100 py-1"><dt className="break-words text-gray-600">{name}</dt><dd className="font-medium">{value}</dd></div>)}</dl>
              {record.notes && <p className="mt-3 whitespace-pre-wrap break-words text-sm text-gray-600">{record.notes}</p>}
            </article>
          ))}
        </div>
      )}
    </div>
  )
}