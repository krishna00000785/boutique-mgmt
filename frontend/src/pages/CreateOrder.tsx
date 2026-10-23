import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Plus,
  Trash2,
  ShoppingBag,
  UserRound,
  CalendarDays,
  IndianRupee,
  Scissors,
} from 'lucide-react'

import { customerService } from '../services/customerService'
import { orderService } from '../services/orderService'
import { readPreference } from '../services/managementService'
import type { Customer } from '../types/customer'

const garmentTypes = [
  'Blouse',
  'Designer Blouse',
  'Maggam Blouse',
  'Dress',
  'Kurti',
  'Lehenga',
  'Custom Stitching',
]

const paymentMethods = ['CASH', 'UPI', 'BANK_TRANSFER', 'OTHER'] as const

type PaymentMethod = (typeof paymentMethods)[number]

interface GarmentRow {
  garmentType: string
  quantity: number
  unitPrice: number
}

const emptyGarment = (): GarmentRow => ({
  garmentType: 'Blouse',
  quantity: 1,
  unitPrice: 0,
})

const inputClass =
  'mt-1.5 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#B88736] focus:ring-2 focus:ring-[#B88736]/20'

const labelClass = 'text-sm font-medium text-gray-700'

const currency = (amount: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount)

function getLocalDate() {
  const now = new Date()
  const offset = now.getTimezoneOffset() * 60_000
  return new Date(now.getTime() - offset).toISOString().slice(0, 10)
}

export default function CreateOrder() {
  const navigate = useNavigate()

  const [customers, setCustomers] = useState<Customer[]>([])
  const [customerId, setCustomerId] = useState('')
  const [orderDate] = useState(getLocalDate())
  const [deliveryDate, setDeliveryDate] = useState('')
  const [garments, setGarments] = useState<GarmentRow[]>([
    emptyGarment(),
  ])
  const [advanceAmount, setAdvanceAmount] = useState('0')
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>(() => {
      const preference = readPreference('paymentMethod', 'CASH')
      return paymentMethods.includes(preference as PaymentMethod) ? preference as PaymentMethod : 'CASH'
    })
  const [notes, setNotes] = useState('')

  const [loadingCustomers, setLoadingCustomers] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function loadCustomers() {
      try {
        setLoadingCustomers(true)

        const result = await customerService.getAll()

        if (active) {
          setCustomers(result)
        }
      } catch (err) {
        console.error('Failed to load customers:', err)

        if (active) {
          setError(
            'Unable to load customers. Please check the backend connection.',
          )
        }
      } finally {
        if (active) {
          setLoadingCustomers(false)
        }
      }
    }

    void loadCustomers()

    return () => {
      active = false
    }
  }, [])

  const totalAmount = useMemo(
    () =>
      garments.reduce(
        (total, garment) =>
          total + garment.quantity * garment.unitPrice,
        0,
      ),
    [garments],
  )

  const advance = Number(advanceAmount)
  const balanceAmount = totalAmount - advance

  const selectedCustomer = customers.find(
    (customer) => customer.id === customerId,
  )

  function updateGarment(
    index: number,
    changes: Partial<GarmentRow>,
  ) {
    setGarments((current) =>
      current.map((garment, i) =>
        i === index ? { ...garment, ...changes } : garment,
      ),
    )
  }

  function addGarment() {
    setGarments((current) => [...current, emptyGarment()])
  }

  function removeGarment(index: number) {
    setGarments((current) =>
      current.filter((_, i) => i !== index),
    )
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    if (!customerId) {
      setError('Please select a customer.')
      return
    }

    if (!deliveryDate) {
      setError('Please select a delivery date.')
      return
    }

    if (deliveryDate < orderDate) {
      setError('Delivery date cannot be before the order date.')
      return
    }

    if (garments.length === 0) {
      setError('Add at least one garment.')
      return
    }

    const invalidGarment = garments.some(
      (garment) =>
        !garment.garmentType.trim() ||
        !Number.isInteger(garment.quantity) ||
        garment.quantity < 1 ||
        !Number.isFinite(garment.unitPrice) ||
        garment.unitPrice < 0,
    )

    if (invalidGarment) {
      setError(
        'Check the garment details, quantities, and prices.',
      )
      return
    }

    if (totalAmount <= 0) {
      setError('The order total must be greater than zero.')
      return
    }

    if (
      !Number.isFinite(advance) ||
      advance < 0 ||
      advance > totalAmount
    ) {
      setError(
        'Advance payment must be between zero and the total amount.',
      )
      return
    }

    try {
      setSubmitting(true)

      await orderService.create({
        customerId,
        expectedDeliveryDate: new Date(`${deliveryDate}T00:00:00`).toISOString(),
        items: garments.map((garment) => ({
          garmentType: garment.garmentType,
          quantity: garment.quantity,
          unitPrice: garment.unitPrice,
        })),
        advanceAmount: advance,
        paymentMethod,
        notes: notes.trim(),
      })

      navigate('/orders', {
        replace: true,
        state: { successMessage: 'Order created successfully.' },
      })
    } catch (err) {
      console.error('Failed to create order:', err)
      setError(
        'Unable to create the order. Check the API request and try again.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-10">
      {/* Page heading */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/orders')}
          aria-label="Back to orders"
          className="rounded-lg border border-gray-200 bg-white p-2.5 text-gray-600 hover:bg-gray-50"
        >
          <ArrowLeft size={19} />
        </button>

        <div>
          <p className="text-xs font-medium tracking-wider text-[#B88736]">
            ORDER MANAGEMENT
          </p>

          <h1 className="mt-1 text-2xl font-semibold text-[#4B1020] sm:text-3xl">
            Create New Order
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Record a new stitching order for your boutique.
          </p>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer information */}
        <section className="rounded-xl border border-[#B88736]/20 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-4">
            <div className="rounded-lg bg-[#FAF5EB] p-2 text-[#760D2D]">
              <UserRound size={20} />
            </div>

            <div>
              <h2 className="font-semibold text-[#4B1020]">
                Customer Details
              </h2>
              <p className="text-xs text-gray-500">
                Select the customer placing this order.
              </p>
            </div>
          </div>

          <div className="p-5">
            <label htmlFor="customerId" className={labelClass}>
              Customer <span className="text-red-500">*</span>
            </label>

            <select
              id="customerId"
              required
              value={customerId}
              disabled={loadingCustomers}
              onChange={(event) => setCustomerId(event.target.value)}
              className={inputClass}
            >
              <option value="">
                {loadingCustomers
                  ? 'Loading customers...'
                  : 'Select a customer'}
              </option>

              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name} — {customer.phone}
                </option>
              ))}
            </select>

            {!loadingCustomers && customers.length === 0 && (
              <p className="mt-2 text-sm text-amber-700">
                No customers available. Add a customer before creating
                an order.
                {' '}
                <button
                  type="button"
                  onClick={() => navigate('/customers')}
                  className="font-semibold underline"
                >
                  Go to Customers
                </button>
              </p>
            )}

            {selectedCustomer && (
              <div className="mt-4 rounded-lg bg-[#FAF5EB] p-4">
                <p className="font-medium text-[#4B1020]">
                  {selectedCustomer.name}
                </p>
                <p className="mt-1 text-sm text-gray-600">
                  {selectedCustomer.phone}
                </p>
                {selectedCustomer.email && (
                  <p className="mt-1 text-sm text-gray-600">
                    {selectedCustomer.email}
                  </p>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Garment details */}
        <section className="rounded-xl border border-[#B88736]/20 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-[#FAF5EB] p-2 text-[#760D2D]">
                <Scissors size={20} />
              </div>

              <div>
                <h2 className="font-semibold text-[#4B1020]">
                  Garment Details
                </h2>
                <p className="text-xs text-gray-500">
                  Add one or more garments to this order.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={addGarment}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#B88736]/40 px-3 py-2 text-sm font-medium text-[#760D2D] hover:bg-[#FAF5EB]"
            >
              <Plus size={16} />
              <span className="hidden sm:inline">Add Garment</span>
              <span className="sm:hidden">Add</span>
            </button>
          </div>

          <div className="space-y-4 p-5">
            {garments.map((garment, index) => (
              <div
                key={index}
                className="rounded-lg border border-gray-200 p-4"
              >
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-700">
                    Garment {index + 1}
                  </h3>

                  {garments.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeGarment(index)}
                      aria-label={`Remove garment ${index + 1}`}
                      className="rounded-md p-2 text-red-500 hover:bg-red-50"
                    >
                      <Trash2 size={17} />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label
                      htmlFor={`garment-${index}`}
                      className={labelClass}
                    >
                      Garment Type
                    </label>

                    <select
                      id={`garment-${index}`}
                      value={garment.garmentType}
                      onChange={(event) =>
                        updateGarment(index, {
                          garmentType: event.target.value,
                        })
                      }
                      className={inputClass}
                    >
                      {garmentTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor={`quantity-${index}`}
                      className={labelClass}
                    >
                      Quantity
                    </label>

                    <input
                      id={`quantity-${index}`}
                      type="number"
                      min="1"
                      step="1"
                      required
                      value={garment.quantity}
                      onChange={(event) =>
                        updateGarment(index, {
                          quantity: Number(event.target.value),
                        })
                      }
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor={`price-${index}`}
                      className={labelClass}
                    >
                      Unit Price (₹)
                    </label>

                    <input
                      id={`price-${index}`}
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={garment.unitPrice}
                      onChange={(event) =>
                        updateGarment(index, {
                          unitPrice: Number(event.target.value),
                        })
                      }
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="mt-4 flex justify-end border-t border-gray-100 pt-3">
                  <p className="text-sm text-gray-500">
                    Subtotal:{' '}
                    <span className="font-semibold text-[#4B1020]">
                      {currency(garment.quantity * garment.unitPrice)}
                    </span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Delivery information */}
        <section className="rounded-xl border border-[#B88736]/20 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-4">
            <div className="rounded-lg bg-[#FAF5EB] p-2 text-[#760D2D]">
              <CalendarDays size={20} />
            </div>

            <div>
              <h2 className="font-semibold text-[#4B1020]">
                Delivery Details
              </h2>
              <p className="text-xs text-gray-500">
                Set the expected delivery date and instructions.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2">
            <div>
              <label htmlFor="orderDate" className={labelClass}>
                Order Date
              </label>

              <input
                id="orderDate"
                type="date"
                value={orderDate}
                readOnly
                className={`${inputClass} bg-gray-50`}
              />
            </div>

            <div>
              <label htmlFor="deliveryDate" className={labelClass}>
                Expected Delivery Date{' '}
                <span className="text-red-500">*</span>
              </label>

              <input
                id="deliveryDate"
                type="date"
                required
                min={orderDate}
                value={deliveryDate}
                onChange={(event) =>
                  setDeliveryDate(event.target.value)
                }
                className={inputClass}
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="notes" className={labelClass}>
                Stitching Instructions / Notes
              </label>

              <textarea
                id="notes"
                rows={3}
                maxLength={2000}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="For example: blouse lining, sleeve design, neck pattern..."
                className={inputClass}
              />

              <p className="mt-1 text-right text-xs text-gray-400">
                {notes.length}/2000 characters
              </p>
            </div>
          </div>
        </section>

        {/* Payment */}
        <section className="rounded-xl border border-[#B88736]/20 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-4">
            <div className="rounded-lg bg-[#FAF5EB] p-2 text-[#760D2D]">
              <IndianRupee size={20} />
            </div>

            <div>
              <h2 className="font-semibold text-[#4B1020]">
                Payment Summary
              </h2>
              <p className="text-xs text-gray-500">
                Review the total and record the advance.
              </p>
            </div>
          </div>

          <div className="space-y-4 p-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <span className="text-sm text-gray-600">
                Total Order Amount
              </span>
              <span className="text-xl font-semibold text-[#4B1020]">
                {currency(totalAmount)}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="advance" className={labelClass}>
                  Advance Amount (₹)
                </label>

                <input
                  id="advance"
                  type="number"
                  min="0"
                  max={totalAmount}
                  step="0.01"
                  required
                  value={advanceAmount}
                  onChange={(event) =>
                    setAdvanceAmount(event.target.value)
                  }
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="paymentMethod" className={labelClass}>
                  Payment Method
                </label>

                <select
                  id="paymentMethod"
                  value={paymentMethod}
                  onChange={(event) =>
                    setPaymentMethod(event.target.value as PaymentMethod)
                  }
                  className={inputClass}
                >
                  <option value="CASH">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-[#FAF5EB] p-4">
              <div>
                <p className="text-sm font-medium text-[#4B1020]">
                  Balance Due
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Remaining amount after advance
                </p>
              </div>

              <span
                className={`text-xl font-semibold ${
                  balanceAmount < 0 ? 'text-red-600' : 'text-[#760D2D]'
                }`}
              >
                {currency(balanceAmount)}
              </span>
            </div>
          </div>
        </section>

        {/* Actions */}
        <div className="flex flex-col-reverse justify-end gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => navigate('/orders')}
            disabled={submitting}
            className="rounded-lg border border-gray-200 bg-white px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={
              submitting ||
              loadingCustomers ||
              customers.length === 0 ||
              totalAmount <= 0 ||
              advance < 0 ||
              advance > totalAmount
            }
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#760D2D] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#4B1020] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ShoppingBag size={18} />
            {submitting ? 'Creating Order...' : 'Create Order'}
          </button>
        </div>
      </form>
    </div>
  )
}