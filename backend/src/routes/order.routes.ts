import { Router } from 'express'
import { z } from 'zod'
import { Prisma } from '../generated/prisma/client.js'

import { prisma } from '../lib/prisma.js'
import crypto from 'crypto'
import { logger } from '../lib/logger.js'

const router = Router()

const orderSchema = z.object({
  customerId: z.string().min(1),
  expectedDeliveryDate: z.string().datetime().optional(),
  advanceAmount: z.number().finite().min(0).max(10000000).default(0),
  paymentMethod: z.enum(['CASH', 'UPI', 'BANK_TRANSFER', 'OTHER']).default('CASH'),
  notes: z.string().trim().max(1000).optional(),

  items: z.array(
    z.object({
      garmentType: z.string().trim().min(2).max(100),
      quantity: z.number().int().min(1).max(100),
      unitPrice: z.number().finite().min(0).max(10000000),
      stitchingNotes: z.string().trim().max(1000).optional(),
    }),
  ).min(1).max(50),
})

const allowedStatuses = [
  'RECEIVED',
  'CUTTING',
  'STITCHING',
  'FINISHING',
  'READY',
  'DELIVERED',
  'CANCELLED',
] as const

function serializeOrder(order: Prisma.OrderGetPayload<{
  include: { customer: true; items: true; payments: true }
}>) {
  const totalPaise = Math.round(Number(order.totalAmount) * 100)
  const paidPaise = order.payments.reduce(
    (sum, payment) => sum + Math.round(Number(payment.amount) * 100),
    0,
  )

  return {
    ...order,
    totalAmount: totalPaise / 100,
    advanceAmount: paidPaise / 100,
    balanceAmount: (totalPaise - paidPaise) / 100,
    deliveryDate: order.expectedDeliveryDate,
    items: order.items.map((item) => ({
      ...item,
      unitPrice: Number(item.unitPrice),
      subtotal: Math.round(Number(item.unitPrice) * 100) * item.quantity / 100,
    })),
    payments: order.payments.map((payment) => ({
      ...payment,
      amount: Number(payment.amount),
    })),
  }
}

// GET /api/orders
router.get('/', async (req, res) => {
  try {
    logger.info(
      `Retrieving Orders with status: ${req.query.status}`,
    );
    const status =
      typeof req.query.status === 'string'
        ? req.query.status
        : undefined

    if (
      status &&
      !allowedStatuses.includes(
        status as (typeof allowedStatuses)[number],
      )
    ) {
      logger.warn(`Invalid order status: ${status}`)
      return res.status(400).json({
        message: 'Invalid order status',
      })
    }

    const orders = await prisma.order.findMany({
      where: {
        status: status as (typeof allowedStatuses)[number] | undefined,
        customerId: typeof req.query.customerId === 'string' ? req.query.customerId : undefined,
      },

      include: {
        customer: true,
        items: true,
        payments: true,
      },

      orderBy: {
        orderDate: 'desc',
      },

      take: req.query.includeAll === 'true' ? undefined : 100,
    })

    logger.info(`Retrieved ${orders.length} orders`)
    logger.info(`Retrieved ${JSON.stringify(orders)} orders`)
    return res.json(orders.map(serializeOrder))
  } catch (error) {
    logger.error(
      { err: error },
      'Failed to retrieve orders',
    );

    return res.status(500).json({
      message: 'Unable to retrieve orders',
    })
  }
})

router.get('/dashboard', async (_req, res) => {
  try {
    const dashboard = await prisma.$transaction(async (tx) => {
      const counts = await tx.order.groupBy({
        by: ['status'],
        _count: { _all: true },
      })

      const unpaidOrders = await tx.order.findMany({
        where: { status: { not: 'CANCELLED' } },
        select: {
          totalAmount: true,
          payments: { select: { amount: true } },
        },
      })

      const recentOrders = await tx.order.findMany({
        include: { customer: true, items: true, payments: true },
        orderBy: [{ orderDate: 'desc' }, { id: 'desc' }],
        take: 5,
      })

      const pendingPaise = unpaidOrders.reduce((sum, order) => {
        const paidPaise = order.payments.reduce(
          (paid, payment) => paid + Math.round(Number(payment.amount) * 100),
          0,
        )
        return sum + Math.max(0, Math.round(Number(order.totalAmount) * 100) - paidPaise)
      }, 0)

      return {
        totalOrders: counts.reduce((sum, group) => sum + group._count._all, 0),
        inProgress: counts.reduce(
          (sum, group) => ['CUTTING', 'STITCHING', 'FINISHING'].includes(group.status)
            ? sum + group._count._all
            : sum,
          0,
        ),
        readyForDelivery: counts.find((group) => group.status === 'READY')?._count._all ?? 0,
        pendingPayments: pendingPaise / 100,
        recentOrders: recentOrders.map(serializeOrder),
      }
    })

    return res.json(dashboard)
  } catch (error) {
    logger.error({ err: error }, 'Failed to retrieve dashboard')
    return res.status(500).json({ message: 'Unable to retrieve dashboard' })
  }
})

// GET /api/orders/:id
router.get('/:id', async (req, res) => {
  try {
    logger.info(
      `Retrieving Order with ID: ${req.params.id}`,
    );
    const order = await prisma.order.findUnique({
      where: {
        id: req.params.id,
      },

      include: {
        customer: true,
        items: true,
        measurements: true,
        payments: true,
      },
    })

    if (!order) {
      return res.status(404).json({
        message: 'Order not found',
      })
    }

    return res.json(serializeOrder(order))
  } catch (error) {
    logger.error(
      { err: error },
      `Failed to retrieve order with ID: ${req.params.id}`,
    );

    return res.status(500).json({
      message: 'Unable to retrieve the order',
    })
  }
})

// POST /api/orders
router.post('/', async (req, res) => {
    logger.info(
      `Creating Order for Customer ID: ${req.body.customerId}`,
    );
  const parsed = orderSchema.safeParse(req.body)

  if (!parsed.success) {
    return res.status(400).json({
      message: 'Invalid order details',
      errors: parsed.error.flatten(),
    })
  }

  const input = parsed.data

  try {
    const order = await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findUnique({
        where: {
          id: input.customerId,
        },
      })

      if (!customer) {
        logger.warn(`Customer not found with ID: ${input.customerId}`)
        throw new Error('CUSTOMER_NOT_FOUND')
      }

      // Calculate in integer paise to avoid floating-point
      // arithmetic when adding prices.
      const totalPaise = input.items.reduce(
        (sum, item) =>
          sum + Math.round(item.unitPrice * 100) * item.quantity,
        0,
      )

      const advancePaise = Math.round(input.advanceAmount * 100)

      if (advancePaise > totalPaise) {
        throw new Error('ADVANCE_EXCEEDS_TOTAL')
      }

      const totalAmount = new Prisma.Decimal(
        (totalPaise / 100).toFixed(2),
      )
      logger.info(`Calculated total amount for order: ${totalAmount.toString()}`)
      const orderNumber =
        `SKDS-${Date.now()}-${crypto.randomUUID().slice(0, 6)}`

      return tx.order.create({
        data: {
          orderNumber,
          customerId: input.customerId,
          totalAmount,

          expectedDeliveryDate:
            input.expectedDeliveryDate
              ? new Date(input.expectedDeliveryDate)
              : null,

          notes: input.notes,

          payments: advancePaise > 0
            ? {
                create: {
                  amount: new Prisma.Decimal((advancePaise / 100).toFixed(2)),
                  paymentMethod: input.paymentMethod,
                },
              }
            : undefined,

          items: {
            create: input.items.map((item) => ({
              garmentType: item.garmentType,
              quantity: item.quantity,
              unitPrice: new Prisma.Decimal(
                item.unitPrice.toFixed(2),
              ),
              stitchingNotes: item.stitchingNotes,
            })),
          },
        },

        include: {
          customer: true,
          items: true,
          measurements: true,
          payments: true,
        },
      })
    })

    return res.status(201).json(serializeOrder(order))
  } catch (error) {
    logger.error(
      { err: error },
      `Error creating order for Customer ID: ${req.body.customerId}`,
    )

    if (error instanceof Error && error.message === 'ADVANCE_EXCEEDS_TOTAL') {
      return res.status(400).json({
        message: 'Advance payment exceeds the order total',
      })
    }

    if (
      error instanceof Error &&
      error.message === 'CUSTOMER_NOT_FOUND'
    ) {
      return res.status(404).json({
        message: 'Customer not found',
      })
    }

    logger.error(
      { err: error },
      `Unexpected error creating order for Customer ID: ${req.body.customerId}`,
    )

    return res.status(500).json({
      message: 'Unable to create order',
    })
  }
})

// PATCH /api/orders/:id/status
router.patch('/:id/status', async (req, res) => {
  const schema = z.object({
    status: z.enum(allowedStatuses),
  })

  const parsed = schema.safeParse(req.body)

  if (!parsed.success) {
    return res.status(400).json({
      message: 'Invalid order status',
      errors: parsed.error.flatten(),
    })
  }

  try {
    const order = await prisma.order.update({
      where: {
        id: req.params.id,
      },

      data: {
        status: parsed.data.status,
      },

      include: {
        customer: true,
        items: true,
        payments: true,
      },
    })

    return res.json(serializeOrder(order))
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      return res.status(404).json({
        message: 'Order not found',
      })
    }

    logger.error(
      { err: error },
      `Error updating order status for order ID: ${req.params.id}`,
    )

    return res.status(500).json({
      message: 'Unable to update order status',
    })
  }
})

export default router