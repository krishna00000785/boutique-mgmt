import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { logger } from '../lib/logger.js'

const router = Router()
const reportSchema = z.object({
  kind: z.enum(['orders', 'payments']),
  from: z.string().datetime(),
  to: z.string().datetime(),
  customerId: z.string().min(1).optional(),
  status: z.enum(['RECEIVED', 'CUTTING', 'STITCHING', 'FINISHING', 'READY', 'DELIVERED', 'CANCELLED']).optional(),
  garmentType: z.string().trim().min(1).max(100).optional(),
  paymentMethod: z.enum(['CASH', 'UPI', 'BANK_TRANSFER', 'OTHER']).optional(),
  balance: z.enum(['all', 'outstanding', 'paid']).default('all'),
}).refine((input) => {
  const days = (Date.parse(input.to) - Date.parse(input.from)) / 86400000
  return days > 0 && days <= 366
}, { message: 'Choose a date range between one day and one year' })

router.get('/', async (req, res) => {
  const parsed = reportSchema.safeParse(req.query)
  if (!parsed.success) return res.status(400).json({ message: 'Invalid report filters', errors: parsed.error.flatten() })
  const input = parsed.data
  const period = { gte: new Date(input.from), lt: new Date(input.to) }
  const orderWhere = {
    customerId: input.customerId,
    status: input.status,
    items: input.garmentType ? {
      some: { garmentType: { contains: input.garmentType, mode: 'insensitive' as const } },
    } : undefined,
  }
  try {
    if (input.kind === 'payments') {
      const payments = await prisma.payment.findMany({
        where: { paymentDate: period, paymentMethod: input.paymentMethod, order: orderWhere },
        include: { order: { include: { customer: true } } },
        orderBy: [{ paymentDate: 'desc' }, { id: 'desc' }],
      })
      const totalPaise = payments.reduce((sum, payment) => sum + Math.round(Number(payment.amount) * 100), 0)
      return res.json({
        kind: 'payments',
        summary: { count: payments.length, totalAmount: totalPaise / 100, paidAmount: totalPaise / 100, balanceAmount: 0 },
        orders: [],
        payments: payments.map((payment) => ({ ...payment, amount: Number(payment.amount) })),
      })
    }

    const results = await prisma.order.findMany({
      where: { ...orderWhere, orderDate: period },
      include: { customer: true, items: true, payments: true },
      orderBy: [{ orderDate: 'desc' }, { id: 'desc' }],
    })
    const orders = results.map((order) => {
      const totalPaise = Math.round(Number(order.totalAmount) * 100)
      const paidPaise = order.payments.reduce((sum, payment) => sum + Math.round(Number(payment.amount) * 100), 0)
      return {
        ...order,
        totalAmount: totalPaise / 100,
        advanceAmount: paidPaise / 100,
        balanceAmount: (totalPaise - paidPaise) / 100,
        deliveryDate: order.expectedDeliveryDate,
        items: order.items.map((item) => ({ ...item, unitPrice: Number(item.unitPrice), subtotal: Math.round(Number(item.unitPrice) * 100) * item.quantity / 100 })),
        payments: order.payments.map((payment) => ({ ...payment, amount: Number(payment.amount) })),
      }
    }).filter((order) => input.balance === 'all' || (input.balance === 'outstanding' ? order.balanceAmount > 0 : order.balanceAmount <= 0))
    const totals = orders.reduce((sum, order) => ({
      total: sum.total + Math.round(order.totalAmount * 100),
      paid: sum.paid + Math.round(order.advanceAmount * 100),
      balance: sum.balance + Math.round(order.balanceAmount * 100),
    }), { total: 0, paid: 0, balance: 0 })
    return res.json({
      kind: 'orders',
      summary: { count: orders.length, totalAmount: totals.total / 100, paidAmount: totals.paid / 100, balanceAmount: totals.balance / 100 },
      orders,
      payments: [],
    })
  } catch (error) {
    logger.error({ err: error }, 'Failed to generate report')
    return res.status(500).json({ message: 'Unable to generate report' })
  }
})

export default router