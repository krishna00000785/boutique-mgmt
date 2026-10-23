import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Plus,
  Search,
  Users,
  Pencil,
  Trash2,
  X,
  Ruler,
} from 'lucide-react'

import { customerService } from '../services/customerService'
import type {
  Customer,
  CreateCustomerRequest,
} from '../types/customer'

const emptyForm: CreateCustomerRequest = {
  name: '',
  phone: '',
  email: '',
  address: '',
  notes: '',
}

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingCustomer, setEditingCustomer] =
    useState<Customer | null>(null)

  const [form, setForm] =
    useState<CreateCustomerRequest>(emptyForm)

  async function loadCustomers(searchTerm = '') {
    setLoading(true)
    setError('')

    try {
      const result = await customerService.getAll(searchTerm)
      setCustomers(result)
    } catch {
      setError(
        'Unable to load customers. Check whether the backend is running.',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadCustomers(search)
    }, 300)

    return () => window.clearTimeout(timer)
  }, [search])

  function openCreateForm() {
    setEditingCustomer(null)
    setForm(emptyForm)
    setError('')
    setShowForm(true)
  }

  function openEditForm(customer: Customer) {
    setEditingCustomer(customer)

    setForm({
      name: customer.name,
      phone: customer.phone,
      email: customer.email ?? '',
      address: customer.address ?? '',
      notes: customer.notes ?? '',
    })

    setError('')
    setShowForm(true)
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    setSaving(true)
    setError('')

    try {
      if (editingCustomer) {
        await customerService.update(
          editingCustomer.id,
          form,
        )
      } else {
        await customerService.create(form)
      }

      setShowForm(false)
      setEditingCustomer(null)
      setForm(emptyForm)

      await loadCustomers(search)
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'response' in error
      ) {
        const response = (
          error as {
            response?: {
              data?: {
                message?: string
              }
            }
          }
        ).response

        setError(
          response?.data?.message ??
            'Unable to save customer.',
        )
      } else {
        setError('Unable to save customer.')
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(customer: Customer) {
    const confirmed = window.confirm(
      `Delete customer ${customer.name}?`,
    )

    if (!confirmed) return

    setError('')

    try {
      await customerService.delete(customer.id)
      await loadCustomers(search)
    } catch {
      setError(
        'Unable to delete customer. The customer may have existing orders or measurements.',
      )
    }
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium tracking-widest text-[#B88736]">
            CUSTOMER MANAGEMENT
          </p>

          <h2 className="mt-2 text-3xl font-semibold text-[#4B1020]">
            Customers
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            Manage customer details and contact information.
          </p>
        </div>

        <button
          onClick={openCreateForm}
          className="flex items-center gap-2 rounded-lg bg-[#760D2D] px-4 py-3 text-sm font-medium text-white hover:bg-[#4B1020]"
        >
          <Plus size={18} />
          Add Customer
        </button>
      </section>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      <section className="rounded-xl border border-[#B88736]/20 bg-white p-5 shadow-sm">
        <div className="relative max-w-md">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by customer name or phone..."
            className="w-full rounded-lg border border-gray-200 py-3 pl-10 pr-4 text-sm outline-none focus:border-[#B88736]"
          />
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[650px] text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500">
                <th className="px-3 py-3 font-medium">Customer</th>
                <th className="px-3 py-3 font-medium">Phone</th>
                <th className="px-3 py-3 font-medium">Email</th>
                <th className="px-3 py-3 font-medium">Address</th>
                <th className="px-3 py-3 text-right font-medium">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-12 text-center text-gray-500"
                  >
                    Loading customers...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-12 text-center"
                  >
                    <Users
                      size={32}
                      className="mx-auto text-[#B88736]"
                    />

                    <p className="mt-3 font-medium text-[#4B1020]">
                      No customers found
                    </p>

                    <p className="mt-1 text-sm text-gray-500">
                      Add your first customer to get started.
                    </p>
                  </td>
                </tr>
              ) : (
                customers.map((customer) => (
                  <tr
                    key={customer.id}
                    className="border-b border-gray-100 hover:bg-[#FAF5EB]/60"
                  >
                    <td className="px-3 py-4 font-medium text-[#4B1020]">
                      {customer.name}
                    </td>

                    <td className="px-3 py-4">
                      {customer.phone}
                    </td>

                    <td className="px-3 py-4">
                      {customer.email || '—'}
                    </td>

                    <td className="px-3 py-4">
                      {customer.address || '—'}
                    </td>

                    <td className="px-3 py-4">
                      <div className="flex justify-end gap-2">
                        <Link
                          to={`/measurements?customerId=${encodeURIComponent(customer.id)}`}
                          aria-label={`Measurements for ${customer.name}`}
                          title="Customer measurements"
                          className="rounded-lg p-2 text-[#760D2D] hover:bg-[#FAF5EB]"
                        >
                          <Ruler size={17} />
                        </Link>
                        <button
                          onClick={() => openEditForm(customer)}
                          aria-label={`Edit ${customer.name}`}
                          className="rounded-lg p-2 text-[#760D2D] hover:bg-[#FAF5EB]"
                        >
                          <Pencil size={17} />
                        </button>

                        <button
                          onClick={() => void handleDelete(customer)}
                          aria-label={`Delete ${customer.name}`}
                          className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-xs text-gray-400">
          Showing up to 100 customers.
        </p>
      </section>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="customer-form-title"
            className="my-auto w-full max-w-lg rounded-2xl border border-[#B88736]/30 bg-white p-6 shadow-xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium tracking-widest text-[#B88736]">
                  SREE KALA DESIGNER STUDIO
                </p>

                <h3
                  id="customer-form-title"
                  className="mt-2 text-2xl font-semibold text-[#4B1020]"
                >
                  {editingCustomer
                    ? 'Edit Customer'
                    : 'Add Customer'}
                </h3>
              </div>

              <button
                onClick={() => setShowForm(false)}
                aria-label="Close form"
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="mt-6 space-y-4"
            >
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Customer Name *
                </label>

                <input
                  required
                  minLength={2}
                  maxLength={100}
                  value={form.name}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      name: event.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-gray-200 px-3 py-3 outline-none focus:border-[#B88736]"
                  placeholder="Enter customer name"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Phone Number *
                </label>

                <input
                  required
                  minLength={5}
                  maxLength={20}
                  value={form.phone}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      phone: event.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-gray-200 px-3 py-3 outline-none focus:border-[#B88736]"
                  placeholder="Enter phone number"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Email
                </label>

                <input
                  type="email"
                  value={form.email ?? ''}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      email: event.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-gray-200 px-3 py-3 outline-none focus:border-[#B88736]"
                  placeholder="Optional"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Address
                </label>

                <textarea
                  rows={2}
                  maxLength={500}
                  value={form.address ?? ''}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      address: event.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-gray-200 px-3 py-3 outline-none focus:border-[#B88736]"
                  placeholder="Customer address"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Notes
                </label>

                <textarea
                  rows={2}
                  maxLength={1000}
                  value={form.notes ?? ''}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      notes: event.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-gray-200 px-3 py-3 outline-none focus:border-[#B88736]"
                  placeholder="Optional customer notes"
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-lg border border-gray-200 px-4 py-3 text-sm"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-[#760D2D] px-5 py-3 text-sm font-medium text-white disabled:opacity-60"
                >
                  {saving
                    ? 'Saving...'
                    : editingCustomer
                      ? 'Update Customer'
                      : 'Save Customer'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  )
}