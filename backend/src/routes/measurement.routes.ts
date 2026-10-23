import { Router } from 'express'
import { z } from 'zod'
import { Prisma } from '../generated/prisma/client.js'
import { prisma } from '../lib/prisma.js'
import { logger } from '../lib/logger.js'

const router = Router()
const measurementSchema = z.object({
  customerId: z.string().min(1),
  orderId: z.string().min(1).nullable().optional(),
  garmentType: z.string().trim().min(2).max(100),
  measurementData: z.object({
    unit: z.enum(['INCH', 'CM']),
    values: z.record(z.string().trim().min(1).max(60), z.number().finite().positive().max(500))
      .refine((values) => Object.keys(values).length > 0 && Object.keys(values).length <= 40),
  }),
  notes: z.string().trim().max(1000).optional(),
})
const relations = { customer: true, order: true } as const

router.get('/', async (req, res) => {
  const parsed = z.object({
    customerId: z.string().min(1).optional(),
    orderId: z.string().min(1).optional(),
  }).safeParse(req.query)
  if (!parsed.success) return res.status(400).json({ message: 'Invalid measurement filters' })
  try {
    const measurements = await prisma.measurement.findMany({
      where: parsed.data,
      include: relations,
      orderBy: { updatedAt: 'desc' },
    })
    return res.json(measurements)
  } catch (error) {
    logger.error({ err: error }, 'Failed to retrieve measurements')
    return res.status(500).json({ message: 'Unable to retrieve measurements' })
  }
})

for (const method of ['post', 'put'] as const) {
  router[method](method === 'post' ? '/' : '/:id', async (req, res) => {
    const parsed = measurementSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ message: 'Invalid measurements', errors: parsed.error.flatten() })
    }
    const input = parsed.data
    try {
      const measurement = await prisma.$transaction(async (tx) => {
        const customer = await tx.customer.findUnique({ where: { id: input.customerId } })
        if (!customer) throw new Error('CUSTOMER_NOT_FOUND')
        if (input.orderId) {
          const order = await tx.order.findUnique({ where: { id: input.orderId } })
          if (!order || order.customerId !== input.customerId) throw new Error('ORDER_CUSTOMER_MISMATCH')
        }
        const data = { ...input, orderId: input.orderId ?? null }
        return method === 'post'
          ? tx.measurement.create({ data, include: relations })
          : tx.measurement.update({ where: { id: (req.params as { id: string }).id }, data, include: relations })
      })
      return res.status(method === 'post' ? 201 : 200).json(measurement)
    } catch (error) {
      if (error instanceof Error && error.message === 'CUSTOMER_NOT_FOUND') {
        return res.status(404).json({ message: 'Customer not found' })
      }
      if (error instanceof Error && error.message === 'ORDER_CUSTOMER_MISMATCH') {
        return res.status(400).json({ message: 'The order must belong to the selected customer' })
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return res.status(404).json({ message: 'Measurement not found' })
      }
      logger.error({ err: error }, 'Failed to save measurements')
      return res.status(500).json({ message: 'Unable to save measurements' })
    }
  })
}

router.delete('/:id', async (req, res) => {
  try {
    await prisma.measurement.delete({ where: { id: req.params.id } })
    return res.status(204).send()
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return res.status(404).json({ message: 'Measurement not found' })
    }
    logger.error({ err: error }, 'Failed to delete measurements')
    return res.status(500).json({ message: 'Unable to delete measurements' })
  }
})

export default router