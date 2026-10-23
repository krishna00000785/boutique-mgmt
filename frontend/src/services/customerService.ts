import { api } from './api'
import type {
  Customer,
  CreateCustomerRequest,
} from '../types/customer'

export const customerService = {
  async getAll(search = '', includeAll = false): Promise<Customer[]> {
    const response = await api.get<Customer[]>('/customers', {
      params: { search: search || undefined, includeAll: includeAll || undefined },
    })

    return response.data
  },

  async getById(id: string): Promise<Customer> {
    const response = await api.get<Customer>(
      `/customers/${id}`,
    )

    return response.data
  },

  async create(
    data: CreateCustomerRequest,
  ): Promise<Customer> {
    const response = await api.post<Customer>(
      '/customers',
      data,
    )

    return response.data
  },

  async update(
    id: string,
    data: CreateCustomerRequest,
  ): Promise<Customer> {
    const response = await api.put<Customer>(
      `/customers/${id}`,
      data,
    )

    return response.data
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/customers/${id}`)
  },
}