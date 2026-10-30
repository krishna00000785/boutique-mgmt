import express from 'express'
import cors from 'cors'
import type { Request, Response, NextFunction } from 'express'
import { requestLogger } from './middleware/requestLogger.js'

import customerRoutes from './routes/customer.routes.js'
import orderRoutes from './routes/order.routes.js'
import paymentRoutes from './routes/payment.routes.js'
import measurementRoutes from './routes/measurement.routes.js'
import reportRoutes from './routes/report.routes.js'
import { prisma } from './lib/prisma.js'

const app = express()

app.disable('x-powered-by')

const allowedOrigins = [
  'http://localhost:5173',
  process.env.FRONTEND_URL,
].filter((origin): origin is string => Boolean(origin));

app.use(
  cors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

app.use(requestLogger)
app.use(express.json({ limit: '100kb' }))

app.get('/api/health', async (_req, res, next) => {
  try {
    await prisma.$queryRaw`SELECT 1`

    res.json({
      status: 'UP',
      database: 'CONNECTED',
      application: "Sree Kala Designer's Boutique API",
    })
  } catch (error) {
    next(error)
  }
})

app.use('/api/customers', customerRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/payments', paymentRoutes)
app.use('/api/measurements', measurementRoutes)
app.use('/api/reports', reportRoutes)

app.use((_req: Request, res: Response) => {
  res.status(404).json({
    message: 'API endpoint not found',
  })
})

app.use(
  (
    error: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction,
  ) => {
    console.error('API error:', error)

    res.status(500).json({
      message: 'An unexpected server error occurred',
    })
  },
)

export default app