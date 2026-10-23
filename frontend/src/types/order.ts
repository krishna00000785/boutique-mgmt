export type OrderStatus =
  | 'RECEIVED'
  | 'CUTTING'
  | 'STITCHING'
  | 'FINISHING'
  | 'READY'
  | 'DELIVERED'
  | 'CANCELLED'

export interface OrderCustomer {
  id: string
  name: string
  phone: string
}

export interface OrderItem {
  id: string
  garmentType: string
  quantity: number
  unitPrice: number
  subtotal: number
}

export interface Order {
  id: string
  orderNumber: string
  customerId: string
  customer: OrderCustomer
  items: OrderItem[]
  totalAmount: number
  advanceAmount: number
  balanceAmount: number
  status: OrderStatus
  orderDate: string
  deliveryDate: string | null
  notes?: string | null
  createdAt: string
  updatedAt: string
}
