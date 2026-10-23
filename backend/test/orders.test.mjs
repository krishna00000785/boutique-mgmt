import assert from 'node:assert/strict'
import { once } from 'node:events'
import { test } from 'node:test'
import express from 'express'

process.env.DATABASE_URL = 'postgresql://unused:unused@localhost:1/unused'
process.env.NODE_ENV = 'production'
process.env.LOG_LEVEL = 'silent'

const { prisma } = await import('../src/lib/prisma.ts')
const { Prisma } = await import('../src/generated/prisma/client.ts')
const { default: orderRouter } = await import('../src/routes/order.routes.ts')
const { default: measurementRouter } = await import('../src/routes/measurement.routes.ts')
const { default: paymentRouter } = await import('../src/routes/payment.routes.ts')
const { default: reportRouter } = await import('../src/routes/report.routes.ts')

test('order creation and payment balances', async (context) => {
  let savedOrder
  let createCount = 0
  const customer = { id: 'customer-1', name: 'Tester', phone: '1234567890' }
  const transaction = {
    customer: {
      findUnique: async () => customer,
    },
    order: {
      create: async ({ data }) => {
        createCount += 1
        savedOrder = {
          ...data,
          id: 'order-1',
          customer,
          status: 'RECEIVED',
          items: data.items.create,
          payments: data.payments ? [data.payments.create] : [],
        }
        return savedOrder
      },
    },
  }

  const originalTransaction = prisma.$transaction
  const originalFindMany = prisma.order.findMany
  const originalFindUnique = prisma.order.findUnique
  const originalUpdate = prisma.order.update
  context.after(() => {
    prisma.$transaction = originalTransaction
    prisma.order.findMany = originalFindMany
    prisma.order.findUnique = originalFindUnique
    prisma.order.update = originalUpdate
  })

  prisma.$transaction = async (callback) => callback(transaction)
  prisma.order.findMany = async () => [savedOrder]
  prisma.order.findUnique = async () => savedOrder
  prisma.order.update = async ({ data, include }) => {
    assert.equal(include.payments, true)
    assert.equal(include.items, true)
    assert.equal(include.customer, true)
    savedOrder = { ...savedOrder, ...data }
    return savedOrder
  }

  const app = express()
  app.use(express.json())
  app.use('/orders', orderRouter)
  const server = app.listen(0, '127.0.0.1')
  context.after(async () => {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
    await prisma.$disconnect()
  })
  await once(server, 'listening')
  const baseUrl = `http://127.0.0.1:${server.address().port}/orders`

  const payload = {
    customerId: customer.id,
    expectedDeliveryDate: '2026-10-30T00:00:00.000Z',
    items: [{ garmentType: 'Blouse', quantity: 2, unitPrice: 1000 }],
    advanceAmount: 500,
    paymentMethod: 'UPI',
  }

  async function createOrder(changes = {}) {
    return fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, ...changes }),
    })
  }

  await context.test('persists advance and method with the order and returns numeric balances', async () => {
    const response = await createOrder()
    assert.equal(response.status, 201)
    const order = await response.json()
    assert.equal(order.totalAmount, 2000)
    assert.equal(order.advanceAmount, 500)
    assert.equal(order.balanceAmount, 1500)
    assert.equal(order.payments[0].amount, 500)
    assert.equal(order.payments[0].paymentMethod, 'UPI')
    assert.equal(order.deliveryDate, payload.expectedDeliveryDate)
    assert.equal(order.items[0].subtotal, 2000)
    assert.equal(savedOrder.payments[0].amount.toFixed(2), '500.00')
  })

  await context.test('list, detail and status responses include subsequent payments', async () => {
    savedOrder.payments.push({ amount: '250.00', paymentMethod: 'CASH' })
    const list = await (await fetch(baseUrl)).json()
    const detail = await (await fetch(`${baseUrl}/order-1`)).json()
    const updated = await (await fetch(`${baseUrl}/order-1/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'READY' }),
    })).json()
    for (const order of [list[0], detail, updated]) {
      assert.equal(order.advanceAmount, 750)
      assert.equal(order.balanceAmount, 1250)
      assert.equal(Number.isFinite(order.balanceAmount), true)
    }
    assert.equal(updated.status, 'READY')
  })

  await context.test('zero or omitted advance creates no payment and retains the full balance', async () => {
    for (const advanceAmount of [0, undefined]) {
      const response = await createOrder({ advanceAmount })
      assert.equal(response.status, 201)
      const order = await response.json()
      assert.deepEqual(order.payments, [])
      assert.equal(order.advanceAmount, 0)
      assert.equal(order.balanceAmount, 2000)
    }
  })

  await context.test('full advance returns zero balance', async () => {
    const response = await createOrder({ advanceAmount: 2000, paymentMethod: 'BANK_TRANSFER' })
    assert.equal(response.status, 201)
    const order = await response.json()
    assert.equal(order.balanceAmount, 0)
    assert.equal(order.payments[0].paymentMethod, 'BANK_TRANSFER')
  })

  await context.test('delivery date may be omitted', async () => {
    const response = await createOrder({ expectedDeliveryDate: undefined, advanceAmount: 0 })
    assert.equal(response.status, 201)
    assert.equal((await response.json()).deliveryDate, null)
  })

  await context.test('decimal amounts use integer paise', async () => {
    const response = await createOrder({
      items: [{ garmentType: 'Blouse', quantity: 3, unitPrice: 10.1 }],
      advanceAmount: 10.2,
    })
    assert.equal(response.status, 201)
    const order = await response.json()
    assert.equal(order.totalAmount, 30.3)
    assert.equal(order.advanceAmount, 10.2)
    assert.equal(order.balanceAmount, 20.1)
  })

  await context.test('invalid advances or payment methods cannot create an order', async () => {
    const previousCount = createCount
    for (const changes of [
      { advanceAmount: -1 },
      { advanceAmount: 2000.01 },
      { advanceAmount: '500' },
      { paymentMethod: 'INVALID' },
    ]) {
      const response = await createOrder(changes)
      assert.equal(response.status, 400)
    }
    assert.equal(createCount, previousCount)
  })

  let dashboardOrders = []
  transaction.order.groupBy = async ({ by }) => {
    assert.deepEqual(by, ['status'])
    const counts = new Map()
    for (const order of dashboardOrders) {
      counts.set(order.status, (counts.get(order.status) ?? 0) + 1)
    }
    return [...counts].map(([status, count]) => ({ status, _count: { _all: count } }))
  }
  transaction.order.findMany = async (query) => {
    if (query.select) {
      assert.equal(query.take, undefined)
      assert.deepEqual(query.where, { status: { not: 'CANCELLED' } })
      return dashboardOrders.filter((order) => order.status !== 'CANCELLED')
    }
    assert.equal(query.take, 5)
    assert.deepEqual(query.orderBy, [{ orderDate: 'desc' }, { id: 'desc' }])
    return dashboardOrders.slice(0, query.take)
  }

  await context.test('dashboard totals include more than 100 orders but only five recent rows', async () => {
    dashboardOrders = Array.from({ length: 105 }, (_, index) => ({
      id: `order-${index}`,
      orderNumber: `SKDS-${index}`,
      customer,
      status: ['CUTTING', 'STITCHING', 'FINISHING', 'CANCELLED', 'DELIVERED'][index] ?? 'READY',
      totalAmount: '2000.00',
      expectedDeliveryDate: null,
      items: [{ garmentType: 'Blouse', quantity: 2, unitPrice: '1000.00' }],
      payments: [{ amount: '500.00', paymentMethod: 'UPI' }],
    }))
    const response = await fetch(`${baseUrl}/dashboard`)
    assert.equal(response.status, 200)
    const dashboard = await response.json()
    assert.equal(dashboard.totalOrders, 105)
    assert.equal(dashboard.inProgress, 3)
    assert.equal(dashboard.readyForDelivery, 100)
    assert.equal(dashboard.pendingPayments, 156000)
    assert.equal(dashboard.recentOrders.length, 5)
    assert.equal(dashboard.recentOrders[0].balanceAmount, 1500)
    assert.equal(dashboard.recentOrders[0].customer.name, customer.name)
    assert.equal(dashboard.recentOrders[0].deliveryDate, null)
  })

  await context.test('dashboard uses paise and never lets an overpaid order offset another balance', async () => {
    const template = dashboardOrders[0]
    dashboardOrders = [
      { ...template, totalAmount: '30.30', payments: [{ amount: '10.20' }] },
      { ...template, totalAmount: '10.00', payments: [{ amount: '20.00' }] },
      { ...template, totalAmount: '10.00', payments: [{ amount: '10.00' }] },
      { ...template, status: 'CANCELLED', totalAmount: '100.00', payments: [] },
    ]
    const response = await fetch(`${baseUrl}/dashboard`)
    assert.equal(response.status, 200)
    const dashboard = await response.json()
    assert.equal(dashboard.pendingPayments, 20.1)
  })

  await context.test('dashboard returns zero totals and an empty list for an empty database', async () => {
    dashboardOrders = []
    const response = await fetch(`${baseUrl}/dashboard`)
    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), {
      totalOrders: 0,
      inProgress: 0,
      readyForDelivery: 0,
      pendingPayments: 0,
      recentOrders: [],
    })
  })

  await context.test('dashboard returns an error when the database is unavailable', async () => {
    transaction.order.groupBy = async () => { throw new Error('Database unavailable') }
    const response = await fetch(`${baseUrl}/dashboard`)
    assert.equal(response.status, 500)
    assert.deepEqual(await response.json(), { message: 'Unable to retrieve dashboard' })
  })
})

test('measurement, payment and reporting workflows', async (context) => {
  const customer = { id: 'customer-1', name: 'Tester', phone: '1234567890' }
  const order = {
    id: 'order-1', orderNumber: 'SKDS-1', customerId: customer.id, customer,
    status: 'READY', totalAmount: '1000.00', expectedDeliveryDate: null,
    orderDate: new Date('2026-10-01T00:00:00.000Z'),
    items: [{ garmentType: 'Blouse', quantity: 1, unitPrice: '1000.00' }],
    payments: [{ amount: '300.00' }],
  }
  let storedMeasurement
  let measurementCreates = 0
  let lastOrderQuery
  let lastPaymentQuery
  let transactionOptions
  const payment = {
    id: 'payment-1', orderId: order.id, order,
    amount: '300.00', paymentMethod: 'UPI', paymentDate: new Date('2026-10-19T00:00:00.000Z'), notes: null,
  }
  const transaction = {
    customer: { findUnique: async ({ where }) => where.id === customer.id ? customer : null },
    order: { findUnique: async ({ where }) => where.id === order.id ? order : null },
    measurement: {
      create: async ({ data }) => {
        measurementCreates += 1
        storedMeasurement = { ...data, id: 'measurement-1', customer, order, updatedAt: new Date() }
        return storedMeasurement
      },
      update: async ({ data }) => {
        storedMeasurement = { ...storedMeasurement, ...data }
        return storedMeasurement
      },
    },
    payment: { create: async ({ data }) => ({ ...payment, ...data }) },
  }
  const originals = {
    transaction: prisma.$transaction,
    measurementFind: prisma.measurement.findMany,
    measurementDelete: prisma.measurement.delete,
    orderFind: prisma.order.findMany,
    paymentFind: prisma.payment.findMany,
  }
  prisma.$transaction = async (callback, options) => { transactionOptions = options; return callback(transaction) }
  prisma.measurement.findMany = async ({ where }) => {
    assert.deepEqual(where, { customerId: customer.id, orderId: order.id })
    return storedMeasurement ? [storedMeasurement] : []
  }
  prisma.measurement.delete = async () => { storedMeasurement = undefined }
  prisma.order.findMany = async (query) => {
    lastOrderQuery = query
    const dates = [new Date('2026-09-30T23:59:59.999Z'), order.orderDate, new Date('2026-11-01T00:00:00.000Z')]
    return dates.filter((date) => date >= query.where.orderDate.gte && date < query.where.orderDate.lt)
      .map((orderDate) => ({ ...order, orderDate }))
  }
  prisma.payment.findMany = async (query) => {
    lastPaymentQuery = query
    return [payment]
  }
  context.after(() => {
    prisma.$transaction = originals.transaction
    prisma.measurement.findMany = originals.measurementFind
    prisma.measurement.delete = originals.measurementDelete
    prisma.order.findMany = originals.orderFind
    prisma.payment.findMany = originals.paymentFind
  })
  const app = express()
  app.use(express.json())
  app.use('/measurements', measurementRouter)
  app.use('/payments', paymentRouter)
  app.use('/reports', reportRouter)
  const server = app.listen(0, '127.0.0.1')
  context.after(async () => {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
    await prisma.$disconnect()
  })
  await once(server, 'listening')
  const baseUrl = `http://127.0.0.1:${server.address().port}`
  const input = {
    customerId: customer.id, orderId: order.id, garmentType: 'Blouse',
    measurementData: { unit: 'INCH', values: { Chest: 36, Waist: 30 } }, notes: 'Test fitting',
  }
  const send = (path, body, method = 'POST') => fetch(`${baseUrl}${path}`, {
    method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })
  const reportUrl = (extra = {}) => `${baseUrl}/reports?${new URLSearchParams({
    kind: 'orders', from: '2026-10-01T00:00:00.000Z', to: '2026-11-01T00:00:00.000Z', ...extra,
  })}`

  await context.test('measurements are persisted with their customer, order and unit', async () => {
    const response = await send('/measurements', input)
    assert.equal(response.status, 201)
    assert.deepEqual(storedMeasurement.measurementData, input.measurementData)
    assert.equal(storedMeasurement.customerId, customer.id)
    assert.equal(storedMeasurement.orderId, order.id)
    const list = await (await fetch(`${baseUrl}/measurements?customerId=${customer.id}&orderId=${order.id}`)).json()
    assert.equal(list.length, 1)
  })
  await context.test('customer-profile measurements may omit the order and can be edited and deleted', async () => {
    const response = await send('/measurements/measurement-1', { ...input, orderId: null, measurementData: { unit: 'CM', values: { Chest: 91.44 } } }, 'PUT')
    assert.equal(response.status, 200)
    assert.equal(storedMeasurement.orderId, null)
    assert.equal(storedMeasurement.measurementData.unit, 'CM')
    const deleted = await fetch(`${baseUrl}/measurements/measurement-1`, { method: 'DELETE' })
    assert.equal(deleted.status, 204)
    assert.equal(storedMeasurement, undefined)
  })
  await context.test('invalid values, missing customers and unrelated orders cannot create measurements', async () => {
    const before = measurementCreates
    assert.equal((await send('/measurements', { ...input, measurementData: { unit: 'INCH', values: {} } })).status, 400)
    assert.equal((await send('/measurements', { ...input, measurementData: { unit: 'INCH', values: { Chest: -1 } } })).status, 400)
    assert.equal((await send('/measurements', { ...input, customerId: 'missing' })).status, 404)
    assert.equal((await send('/measurements', { ...input, orderId: 'another-customer-order' })).status, 400)
    assert.equal(measurementCreates, before)
  })
  await context.test('monthly reports use inclusive start and exclusive end with correct numeric totals', async () => {
    const response = await fetch(reportUrl({ customerId: customer.id, status: 'READY', garmentType: 'Blouse' }))
    assert.equal(response.status, 200)
    const report = await response.json()
    assert.deepEqual(report.summary, { count: 1, totalAmount: 1000, paidAmount: 300, balanceAmount: 700 })
    assert.equal(report.orders[0].items[0].unitPrice, 1000)
    assert.equal(lastOrderQuery.take, undefined)
    assert.equal(lastOrderQuery.where.customerId, customer.id)
    assert.equal(lastOrderQuery.where.status, 'READY')
    assert.equal(lastOrderQuery.where.items.some.garmentType.contains, 'Blouse')
  })
  await context.test('order reports filter fully paid versus outstanding balances', async () => {
    assert.equal((await (await fetch(reportUrl({ balance: 'paid' }))).json()).summary.count, 0)
    assert.equal((await (await fetch(reportUrl({ balance: 'outstanding' }))).json()).summary.count, 1)
  })
  await context.test('weekly payment reports filter payment dates and method, not order date', async () => {
    const response = await fetch(reportUrl({ kind: 'payments', from: '2026-10-19T00:00:00.000Z', to: '2026-10-26T00:00:00.000Z', paymentMethod: 'UPI', customerId: customer.id }))
    assert.equal(response.status, 200)
    const report = await response.json()
    assert.equal(report.kind, 'payments')
    assert.equal(report.summary.totalAmount, 300)
    assert.equal(report.payments[0].amount, 300)
    assert.equal(lastPaymentQuery.where.paymentMethod, 'UPI')
    assert.equal(lastPaymentQuery.where.order.customerId, customer.id)
    assert.equal(lastPaymentQuery.where.paymentDate.gte.toISOString(), '2026-10-19T00:00:00.000Z')
    assert.equal(lastPaymentQuery.where.paymentDate.lt.toISOString(), '2026-10-26T00:00:00.000Z')
  })
  await context.test('invalid report date ranges and filter values are rejected', async () => {
    for (const extra of [{ from: 'bad' }, { to: '2026-09-01T00:00:00.000Z' }, { to: '2028-01-01T00:00:00.000Z' }, { status: 'INVALID' }, { paymentMethod: 'INVALID' }]) {
      assert.equal((await fetch(reportUrl(extra))).status, 400)
    }
  })
  await context.test('payments persist as decimal amounts with serializable balance checks', async () => {
    const response = await send('/payments', { orderId: order.id, amount: 200.25, paymentMethod: 'CASH' })
    assert.equal(response.status, 201)
    assert.equal((await response.json()).amount, 200.25)
    assert.equal(transactionOptions.isolationLevel, 'Serializable')
  })
  await context.test('overpayments, fractional paise and cancelled orders cannot receive payments', async () => {
    assert.equal((await send('/payments', { orderId: order.id, amount: 700.01, paymentMethod: 'UPI' })).status, 400)
    assert.equal((await send('/payments', { orderId: order.id, amount: 0.001, paymentMethod: 'UPI' })).status, 400)
    order.status = 'CANCELLED'
    assert.equal((await send('/payments', { orderId: order.id, amount: 1, paymentMethod: 'UPI' })).status, 400)
    order.status = 'READY'
  })
})

test('API validation, missing-record and database-error branches', async (context) => {
  const customer = { id: 'customer-1', name: 'Tester', phone: '1234567890' }
  const order = { id: 'order-1', customerId: customer.id, status: 'READY', totalAmount: '100.00', payments: [] }
  let transactionHandler = async (callback) => callback({
    customer: { findUnique: async () => customer },
    order: { findUnique: async () => order },
    measurement: {
      create: async () => ({}),
      update: async () => ({}),
    },
    payment: { create: async () => ({ id: 'payment-1', amount: '1.00' }) },
  })
  let orderListHandler = async () => []
  let orderDetailHandler = async () => order
  let orderUpdateHandler = async () => order
  let measurementListHandler = async () => []
  let measurementDeleteHandler = async () => undefined
  let paymentListHandler = async () => []
  const originals = {
    transaction: prisma.$transaction,
    orderList: prisma.order.findMany,
    orderDetail: prisma.order.findUnique,
    orderUpdate: prisma.order.update,
    measurementList: prisma.measurement.findMany,
    measurementDelete: prisma.measurement.delete,
    paymentList: prisma.payment.findMany,
  }
  prisma.$transaction = (callback, options) => transactionHandler(callback, options)
  prisma.order.findMany = (...args) => orderListHandler(...args)
  prisma.order.findUnique = (...args) => orderDetailHandler(...args)
  prisma.order.update = (...args) => orderUpdateHandler(...args)
  prisma.measurement.findMany = (...args) => measurementListHandler(...args)
  prisma.measurement.delete = (...args) => measurementDeleteHandler(...args)
  prisma.payment.findMany = (...args) => paymentListHandler(...args)
  context.after(() => {
    prisma.$transaction = originals.transaction
    prisma.order.findMany = originals.orderList
    prisma.order.findUnique = originals.orderDetail
    prisma.order.update = originals.orderUpdate
    prisma.measurement.findMany = originals.measurementList
    prisma.measurement.delete = originals.measurementDelete
    prisma.payment.findMany = originals.paymentList
  })
  const app = express()
  app.use(express.json())
  app.use('/orders', orderRouter)
  app.use('/measurements', measurementRouter)
  app.use('/payments', paymentRouter)
  app.use('/reports', reportRouter)
  const server = app.listen(0, '127.0.0.1')
  context.after(async () => {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
    await prisma.$disconnect()
  })
  await once(server, 'listening')
  const baseUrl = `http://127.0.0.1:${server.address().port}`
  const errorFor = (code) => new Prisma.PrismaClientKnownRequestError('Database record not found', { code, clientVersion: 'test' })
  const request = (path, body, method = 'POST') => fetch(`${baseUrl}${path}`, {
    method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })
  const validOrder = { customerId: customer.id, items: [{ garmentType: 'Blouse', quantity: 1, unitPrice: 100 }] }
  const validMeasurement = { customerId: customer.id, garmentType: 'Blouse', measurementData: { unit: 'CM', values: { Chest: 90 } } }

  await context.test('order list validates status and handles success and database errors', async () => {
    assert.equal((await fetch(`${baseUrl}/orders?status=WRONG`)).status, 400)
    orderListHandler = async () => []
    assert.deepEqual(await (await fetch(`${baseUrl}/orders?status=READY`)).json(), [])
    orderListHandler = async (query) => {
      assert.deepEqual(query.where, { status: undefined, customerId: customer.id })
      assert.equal(query.take, undefined)
      return []
    }
    assert.deepEqual(await (await fetch(`${baseUrl}/orders?customerId=${customer.id}&includeAll=true`)).json(), [])
    orderListHandler = async () => { throw new Error('db') }
    assert.equal((await fetch(`${baseUrl}/orders`)).status, 500)
    orderListHandler = async () => []
  })
  await context.test('order detail distinguishes missing records and database errors', async () => {
    orderDetailHandler = async () => null
    assert.equal((await fetch(`${baseUrl}/orders/missing`)).status, 404)
    orderDetailHandler = async () => { throw new Error('db') }
    assert.equal((await fetch(`${baseUrl}/orders/order-1`)).status, 500)
    orderDetailHandler = async () => order
  })
  await context.test('order creation rejects bad input, missing customers, excessive advances and storage errors', async () => {
    assert.equal((await request('/orders', {})).status, 400)
    transactionHandler = async (callback) => callback({ customer: { findUnique: async () => null } })
    assert.equal((await request('/orders', validOrder)).status, 404)
    transactionHandler = async (callback) => callback({ customer: { findUnique: async () => customer } })
    assert.equal((await request('/orders', { ...validOrder, advanceAmount: 100.01 })).status, 400)
    transactionHandler = async () => { throw new Error('db') }
    assert.equal((await request('/orders', validOrder)).status, 500)
    transactionHandler = async () => { throw 'db' }
    assert.equal((await request('/orders', validOrder)).status, 500)
    transactionHandler = async (callback) => callback({ customer: { findUnique: async () => customer }, order: { findUnique: async () => order }, measurement: { create: async () => ({}), update: async () => ({}) }, payment: { create: async () => ({}) } })
  })
  await context.test('order status rejects invalid, missing and database-failure updates', async () => {
    assert.equal((await request('/orders/order-1/status', { status: 'WRONG' }, 'PATCH')).status, 400)
    orderUpdateHandler = async () => { throw errorFor('P2025') }
    assert.equal((await request('/orders/missing/status', { status: 'READY' }, 'PATCH')).status, 404)
    orderUpdateHandler = async () => { throw new Error('db') }
    assert.equal((await request('/orders/order-1/status', { status: 'READY' }, 'PATCH')).status, 500)
    orderUpdateHandler = async () => order
  })
  await context.test('measurement list validates filters and handles database errors', async () => {
    assert.equal((await fetch(`${baseUrl}/measurements?customerId=`)).status, 400)
    measurementListHandler = async () => []
    assert.deepEqual(await (await fetch(`${baseUrl}/measurements`)).json(), [])
    measurementListHandler = async () => { throw new Error('db') }
    assert.equal((await fetch(`${baseUrl}/measurements`)).status, 500)
    measurementListHandler = async () => []
  })
  await context.test('measurement save handles missing records, Prisma not-found and storage failures', async () => {
    assert.equal((await request('/measurements', {})).status, 400)
    transactionHandler = async (callback) => callback({ customer: { findUnique: async () => null } })
    assert.equal((await request('/measurements', validMeasurement)).status, 404)
    transactionHandler = async (callback) => callback({ customer: { findUnique: async () => customer }, order: { findUnique: async () => null } })
    assert.equal((await request('/measurements', { ...validMeasurement, orderId: 'missing' })).status, 400)
    transactionHandler = async () => { throw errorFor('P2025') }
    assert.equal((await request('/measurements/measurement-1', validMeasurement, 'PUT')).status, 404)
    transactionHandler = async () => { throw new Error('db') }
    assert.equal((await request('/measurements', validMeasurement)).status, 500)
    transactionHandler = async (callback) => callback({ customer: { findUnique: async () => customer }, order: { findUnique: async () => order }, measurement: { create: async () => ({}), update: async () => ({}) } })
  })
  await context.test('measurement delete distinguishes missing records and storage failures', async () => {
    measurementDeleteHandler = async () => { throw errorFor('P2025') }
    assert.equal((await fetch(`${baseUrl}/measurements/missing`, { method: 'DELETE' })).status, 404)
    measurementDeleteHandler = async () => { throw new Error('db') }
    assert.equal((await fetch(`${baseUrl}/measurements/id`, { method: 'DELETE' })).status, 500)
    measurementDeleteHandler = async () => undefined
  })
  await context.test('payment list validates filters and handles success and database errors', async () => {
    assert.equal((await fetch(`${baseUrl}/payments?orderId=`)).status, 400)
    paymentListHandler = async () => [{ amount: '12.50' }]
    assert.equal((await (await fetch(`${baseUrl}/payments`)).json())[0].amount, 12.5)
    paymentListHandler = async () => { throw new Error('db') }
    assert.equal((await fetch(`${baseUrl}/payments`)).status, 500)
    paymentListHandler = async () => []
  })
  await context.test('payment creation rejects invalid requests, missing orders, cancelled orders and conflicts', async () => {
    assert.equal((await request('/payments', {})).status, 400)
    transactionHandler = async (callback) => callback({ order: { findUnique: async () => null } })
    assert.equal((await request('/payments', { orderId: 'missing', amount: 1, paymentMethod: 'CASH' })).status, 404)
    transactionHandler = async (callback) => callback({ order: { findUnique: async () => ({ ...order, status: 'CANCELLED' }) } })
    assert.equal((await request('/payments', { orderId: order.id, amount: 1, paymentMethod: 'CASH' })).status, 400)
    transactionHandler = async () => { throw errorFor('P2034') }
    assert.equal((await request('/payments', { orderId: order.id, amount: 1, paymentMethod: 'CASH' })).status, 409)
    transactionHandler = async () => { throw new Error('db') }
    assert.equal((await request('/payments', { orderId: order.id, amount: 1, paymentMethod: 'CASH' })).status, 500)
    transactionHandler = async (callback) => callback({ customer: { findUnique: async () => customer }, order: { findUnique: async () => order }, measurement: { create: async () => ({}), update: async () => ({}) }, payment: { create: async () => ({ id: 'payment-1', amount: '1.00' }) } })
  })
  await context.test('report queries return empty payment data and handle both query failures', async () => {
    paymentListHandler = async () => []
    const paymentReport = `${baseUrl}/reports?kind=payments&from=2026-10-01T00:00:00.000Z&to=2026-10-02T00:00:00.000Z`
    assert.deepEqual((await (await fetch(paymentReport)).json()).summary, { count: 0, totalAmount: 0, paidAmount: 0, balanceAmount: 0 })
    paymentListHandler = async () => { throw new Error('db') }
    assert.equal((await fetch(paymentReport)).status, 500)
    orderListHandler = async () => { throw new Error('db') }
    assert.equal((await fetch(`${baseUrl}/reports?kind=orders&from=2026-10-01T00:00:00.000Z&to=2026-10-02T00:00:00.000Z`)).status, 500)
    orderListHandler = async () => []
    paymentListHandler = async () => []
  })
})