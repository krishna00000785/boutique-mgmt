import type { Order, OrderStatus } from '../../types/order'

const statusLabels: Record<OrderStatus, string> = {
  RECEIVED: 'Received',
  CUTTING: 'Cutting',
  STITCHING: 'Stitching',
  FINISHING: 'Finishing',
  READY: 'Ready',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
}

const statusStyles: Record<OrderStatus, string> = {
  RECEIVED: 'bg-blue-50 text-blue-700',
  CUTTING: 'bg-purple-50 text-purple-700',
  STITCHING: 'bg-amber-50 text-amber-800',
  FINISHING: 'bg-orange-50 text-orange-700',
  READY: 'bg-green-50 text-green-700',
  DELIVERED: 'bg-gray-100 text-gray-700',
  CANCELLED: 'bg-red-50 text-red-700',
}

interface RecentOrdersProps {
  orders: Order[]
  loading: boolean
  error: string
}

function formatDeliveryDate(date: string | Date | null | undefined) {
  if (!date) return 'Not scheduled'

  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function EmptyState({
  loading,
  error,
}: {
  loading: boolean
  error: string
}) {
  const message = loading
    ? 'Loading orders...'
    : error
      ? 'Orders unavailable.'
      : 'No orders yet.'

  return (
    <div className="px-3 py-8 text-center text-sm text-gray-500">
      {message}
    </div>
  )
}

export default function RecentOrders({
  orders,
  loading,
  error,
}: RecentOrdersProps) {
  const showEmptyState = loading || Boolean(error) || orders.length === 0

  return (
    <div className="mt-5 min-w-0" aria-busy={loading}>
      {showEmptyState ? (
        <EmptyState loading={loading} error={error} />
      ) : (
        <>
          {/* Mobile order cards */}
          <div className="space-y-3 md:hidden">
            {orders.map((order) => (
              <article
                key={order.id}
                className="rounded-lg border border-gray-100 bg-white p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500">
                      Order ID
                    </p>

                    <p className="mt-1 break-words font-semibold text-[#760D2D]">
                      {order.orderNumber}
                    </p>
                  </div>

                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                      statusStyles[order.status]
                    }`}
                  >
                    {statusLabels[order.status]}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-4">
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500">
                      Customer
                    </p>

                    <p className="mt-1 break-words text-sm font-medium text-gray-800">
                      {order.customer.name}
                    </p>
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs text-gray-500">
                      Delivery
                    </p>

                    <p className="mt-1 text-sm text-gray-800">
                      {formatDeliveryDate(order.deliveryDate)}
                    </p>
                  </div>

                  <div className="col-span-2 min-w-0">
                    <p className="text-xs text-gray-500">
                      Garment
                    </p>

                    <p className="mt-1 break-words text-sm text-gray-800">
                      {order.items
                        .map(
                          (item) =>
                            `${item.garmentType} (${item.quantity})`,
                        )
                        .join(', ')}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {/* Desktop and tablet table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[650px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500">
                  <th className="px-3 py-3 font-medium">Order ID</th>
                  <th className="px-3 py-3 font-medium">Customer</th>
                  <th className="px-3 py-3 font-medium">Garment</th>
                  <th className="px-3 py-3 font-medium">Delivery</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                </tr>
              </thead>

              <tbody>
                {orders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-b border-gray-100 last:border-0"
                  >
                    <td className="px-3 py-4 font-medium text-[#760D2D]">
                      {order.orderNumber}
                    </td>

                    <td className="px-3 py-4">
                      {order.customer.name}
                    </td>

                    <td className="px-3 py-4">
                      {order.items
                        .map(
                          (item) =>
                            `${item.garmentType} (${item.quantity})`,
                        )
                        .join(', ')}
                    </td>

                    <td className="whitespace-nowrap px-3 py-4">
                      {formatDeliveryDate(order.deliveryDate)}
                    </td>

                    <td className="px-3 py-4">
                      <span
                        className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium ${
                          statusStyles[order.status]
                        }`}
                      >
                        {statusLabels[order.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}