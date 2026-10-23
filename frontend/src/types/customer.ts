export interface Customer {
  id: string
  name: string
  phone: string
  email: string | null
  address: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateCustomerRequest {
  name: string
  phone: string
  email?: string
  address?: string
  notes?: string
}