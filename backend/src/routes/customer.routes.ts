import { Router } from 'express'
import { z } from 'zod'
import { Prisma } from '../generated/prisma/client.js'

import { prisma } from '../lib/prisma.js'
import { logger } from '../lib/logger.js'

const router = Router()

const customerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(5).max(20),
  email: z.string().trim().email().optional().or(z.literal('')),
  address: z.string().trim().max(500).optional(),
  notes: z.string().trim().max(1000).optional(),
})

function validateId(id: string) {
  return id.length > 0 && id.length <= 100
}

function handleError(
  error: unknown,
  res: import('express').Response,
) {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  ) {
    return res.status(409).json({
      message: 'A customer with this phone number already exists',
    })
  }

  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2025'
  ) {
    return res.status(404).json({
      message: 'Customer not found',
    })
  }

  console.error(error)

  return res.status(500).json({
    message: 'Unable to process the customer request',
  })
}

// GET /api/customers?search=...
router.get('/', async (req, res) => {
  try {
    logger.info(
      'Retrieving Customers',
    );
    const search =
      typeof req.query.search === 'string'
        ? req.query.search.trim()
        : ''

    const customers = await prisma.customer.findMany({
      where: search
        ? {
            OR: [
              {
                name: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                phone: {
                  contains: search,
                },
              },
            ],
          }
        : undefined,
      orderBy: {
        createdAt: 'desc',
      },
      take: req.query.includeAll === 'true' ? undefined : 100,
    })

    logger.info(
      { count: customers.length },
      'Customers retrieved successfully',
    );
  
    return res.json(customers)
  } catch (error) {
    logger.error(
      { err: error },
      'Failed to retrieve customers',
    );

    return handleError(error, res)
  }
})

// GET /api/customers/:id
router.get('/:id', async (req, res) => {
  try {
    logger.info(
      `Retrieving Customer ${req.params.id}`,
    );

    if (!validateId(req.params.id)) {
      return res.status(400).json({
        message: 'Invalid customer ID',
      })
    }

    const customer = await prisma.customer.findUnique({
      where: {
        id: req.params.id,
      },
      include: {
        orders: {
          orderBy: {
            orderDate: 'desc',
          },
        },
      },
    })

    if (!customer) {
      return res.status(404).json({
        message: 'Customer not found',
      })
    }

    logger.info(
      `Customer ${req.params.id} retrieved successfully`,
    );

    return res.json(customer)
  } catch (error) {
    logger.error(
      { err: error },
      `Failed to retrieve Customer ${req.params.id}`,
    );
    return handleError(error, res)
  }
})

// POST /api/customers
router.post('/', async (req, res) => {
    logger.info(
      'Creating a new Customer',
    );
  const parsed = customerSchema.safeParse(req.body)

  if (!parsed.success) {
    return res.status(400).json({
      message: 'Invalid customer details',
      errors: parsed.error.flatten(),
    })
  }

  try {
    const data = parsed.data

    const customer = await prisma.customer.create({
      data: {
        name: data.name,
        phone: data.phone,
        email: data.email || null,
        address: data.address,
        notes: data.notes,
      },
    })

    logger.info(
      `Customer ${customer.id} created successfully`,
    );
    return res.status(201).json(customer)
  } catch (error) {
    logger.error(
      { err: error },
      'Failed to create Customer',
    );
    return handleError(error, res)
  }
})

// PUT /api/customers/:id
router.put('/:id', async (req, res) => {
  if (!validateId(req.params.id)) {
    return res.status(400).json({
      message: 'Invalid customer ID',
    })
  }

  const parsed = customerSchema.safeParse(req.body)

  if (!parsed.success) {
    return res.status(400).json({
      message: 'Invalid customer details',
      errors: parsed.error.flatten(),
    })
  }

  try {
    const data = parsed.data

    const customer = await prisma.customer.update({
      where: {
        id: req.params.id,
      },
      data: {
        name: data.name,
        phone: data.phone,
        email: data.email || null,
        address: data.address,
        notes: data.notes,
      },
    })

    logger.info(
      `Customer ${req.params.id} updated successfully`,
    );
    return res.json(customer)
  } catch (error) {
    logger.error(
      { err: error },
      `Failed to update Customer ${req.params.id}`,
    );
    return handleError(error, res)
  }
})

// DELETE /api/customers/:id
router.delete('/:id', async (req, res) => {
  if (!validateId(req.params.id)) {
    return res.status(400).json({
      message: 'Invalid customer ID',
    })
  }

  try {
    await prisma.customer.delete({
      where: {
        id: req.params.id,
      },
    })

    logger.info(
      `Customer ${req.params.id} deleted successfully`,
    );
    return res.status(204).send()
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2003'
    ) {
      return res.status(409).json({
        message:
          'This customer has related records and cannot be deleted',
      })
    }

    logger.error(
      { err: error },
      `Failed to delete Customer ${req.params.id}`,
    );
    return handleError(error, res)
  }
})

export default router