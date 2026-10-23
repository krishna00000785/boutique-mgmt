import { Router } from 'express'
import { z } from 'zod'
import { Prisma } from '../generated/prisma/client.js'

import { prisma } from '../lib/prisma.js'

const router = Router()

const paymentSchema = z.object({
  orderId: z.string().min(1),
  amount: z.number().finite().positive().max(10000000).multipleOf(0.01),
  paymentMethod: z.enum([
    'CASH',
    'UPI',
    'BANK_TRANSFER',
    'OTHER',
  ]),
  notes: z.string().trim().max(500).optional(),
})

// GET /api/payments
router.get('/', async (req, res) => {
  const parsed = z.object({ orderId: z.string().min(1).optional() }).safeParse(req.query)
  if (!parsed.success) return res.status(400).json({ message: 'Invalid payment filters' })
  try {
    const payments = await prisma.payment.findMany({
      where: parsed.data,
      include: {
        order: {
          include: {
            customer: true,
          },
        },
      },

      orderBy: {
        paymentDate: 'desc',
      },

    })

    return res.json(payments.map((payment) => ({ ...payment, amount: Number(payment.amount) })))
  } catch (error) {
    console.error(error)

    return res.status(500).json({
      message: 'Unable to retrieve payments',
    })
  }
})

// POST /api/payments
router.post('/', async (req, res) => {
  const parsed = paymentSchema.safeParse(req.body)

  if (!parsed.success) {
    return res.status(400).json({
      message: 'Invalid payment details',
      errors: parsed.error.flatten(),
    })
  }

  const input = parsed.data

  try {
    const payment = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: {
          id: input.orderId,
        },

        include: {
          payments: true,
        },
      })

      if (!order) {
        throw new Error('ORDER_NOT_FOUND')
      }

      if (order.status === 'CANCELLED') {
        throw new Error('ORDER_CANCELLED')
      }

      const paidPaise = order.payments.reduce(
        (sum, item) =>
          sum + Math.round(Number(item.amount) * 100),
        0,
      )

      const totalPaise = Math.round(
        Number(order.totalAmount) * 100,
      )

      const amountPaise = Math.round(input.amount * 100)

      const balancePaise = totalPaise - paidPaise

      if (amountPaise > balancePaise) {
        throw new Error('PAYMENT_EXCEEDS_BALANCE')
      }

      return tx.payment.create({
        data: {
          orderId: input.orderId,

          amount: new Prisma.Decimal(
            (amountPaise / 100).toFixed(2),
          ),

          paymentMethod: input.paymentMethod,
          notes: input.notes,
        },

        include: {
          order: {
            include: {
              customer: true,
            },
          },
        },
      })
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })

    return res.status(201).json({ ...payment, amount: Number(payment.amount) })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
      return res.status(409).json({ message: 'The order balance changed. Refresh and try again.' })
    }
    if (error instanceof Error) {
      const messages: Record<string, string> = {
        ORDER_NOT_FOUND: 'Order not found',
        ORDER_CANCELLED: 'Cannot record payment for a cancelled order',
        PAYMENT_EXCEEDS_BALANCE:
          'Payment exceeds the outstanding balance',
      }

      if (messages[error.message]) {
        return res.status(
          error.message === 'ORDER_NOT_FOUND' ? 404 : 400,
        ).json({
          message: messages[error.message],
        })
      }
    }

    console.error(error)

    return res.status(500).json({
      message: 'Unable to record payment',
    })
  }
})

export default router