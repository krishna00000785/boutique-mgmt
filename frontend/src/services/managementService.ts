import { isAxiosError } from 'axios'
import { api } from './api'
import type { Customer } from '../types/customer'
import type { Order, OrderStatus } from '../types/order'

export const paymentMethods = ['CASH', 'UPI', 'BANK_TRANSFER', 'OTHER'] as const
export type PaymentMethod = (typeof paymentMethods)[number]
export type MeasurementUnit = 'INCH' | 'CM'

export interface MeasurementInput {
  customerId: string
  orderId: string | null
  garmentType: string
  measurementData: { unit: MeasurementUnit; values: Record<string, number> }
  notes: string
}

export interface Measurement extends MeasurementInput {
  id: string
  customer: Customer
  order: { id: string; orderNumber: string } | null
  updatedAt: string
}

export interface Payment {
  id: string
  orderId: string
  amount: number
  paymentMethod: PaymentMethod
  paymentDate: string
  notes: string | null
  order: { id: string; orderNumber: string; customer: Customer }
}

export interface ReportFilters {
  kind: 'orders' | 'payments'
  from: string
  to: string
  customerId?: string
  status?: OrderStatus
  garmentType?: string
  paymentMethod?: PaymentMethod
  balance?: 'all' | 'outstanding' | 'paid'
}

export interface ReportResult {
  kind: 'orders' | 'payments'
  summary: { count: number; totalAmount: number; paidAmount: number; balanceAmount: number }
  orders: Order[]
  payments: Payment[]
}

export function requestError(error: unknown, fallback: string) {
  return isAxiosError<{ message?: string }>(error) ? error.response?.data?.message ?? fallback : fallback
}

export const measurementService = {
  async getAll(customerId?: string, orderId?: string): Promise<Measurement[]> {
    return (await api.get('/measurements', { params: { customerId: customerId || undefined, orderId: orderId || undefined } })).data
  },
  async save(input: MeasurementInput, id?: string): Promise<Measurement> {
    return (id ? await api.put(`/measurements/${id}`, input) : await api.post('/measurements', input)).data
  },
  async delete(id: string): Promise<void> {
    await api.delete(`/measurements/${id}`)
  },
}

export const paymentService = {
  async getAll(orderId?: string): Promise<Payment[]> {
    return (await api.get('/payments', { params: { orderId: orderId || undefined } })).data
  },
  async create(input: { orderId: string; amount: number; paymentMethod: PaymentMethod; notes: string }): Promise<Payment> {
    return (await api.post('/payments', input)).data
  },
}

export const reportService = {
  async generate(filters: ReportFilters): Promise<ReportResult> {
    return (await api.get('/reports', { params: filters })).data
  },
}

export const currency = (amount: number) => new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', maximumFractionDigits: 2,
}).format(amount)

export function readPreference(key: string, fallback: string) {
  try { return localStorage.getItem(`boutique.${key}`) ?? fallback } catch { return fallback }
}