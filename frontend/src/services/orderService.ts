import { api } from './api'
import type { Order, OrderStatus } from '../types/order'

export interface OrderFilters {
  search?: string
  status?: OrderStatus | ''
  customerId?: string
  includeAll?: boolean
}

export interface DashboardSummary {
  totalOrders: number
  inProgress: number
  readyForDelivery: number
  pendingPayments: number
  recentOrders: Order[]
}

export interface CreateOrderItemRequest {
  garmentType: string
  quantity: number
  unitPrice: number
}

export interface CreateOrderRequest {
  customerId: string
  expectedDeliveryDate: string
  items: CreateOrderItemRequest[]
  advanceAmount: number
  paymentMethod: 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'OTHER'
  notes?: string
}

export const orderService = {
  async getDashboard(): Promise<DashboardSummary> {
    const response = await api.get<DashboardSummary>('/orders/dashboard')
    return response.data
  },

  async getAll(filters: OrderFilters = {}): Promise<Order[]> {
    const response = await api.get('/orders', {
      params: {
        search: filters.search || undefined,
        status: filters.status || undefined,
        customerId: filters.customerId || undefined,
        includeAll: filters.includeAll || undefined,
      },
    })

    // Adjust this if your backend returns { data: [...] }.
    return response.data
  },

  async getById(id: string): Promise<Order> {
    const response = await api.get(`/orders/${id}`)
    return response.data
  },

  async create(payload: CreateOrderRequest): Promise<Order> {
    const response = await api.post('/orders', payload)
    return response.data
  },

  async updateStatus(
    id: string,
    status: OrderStatus,
  ): Promise<Order> {
    const response = await api.patch(`/orders/${id}/status`, {
      status,
    })

    return response.data
  },
}