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

export default function RecentOrders({ orders, loading, error }: RecentOrdersProps) {
	return (
		<div className="mt-6 overflow-x-auto" aria-busy={loading}>
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
					{loading || error || orders.length === 0 ? (
						<tr>
							<td colSpan={5} className="px-3 py-8 text-center text-gray-500">
								{loading ? 'Loading orders...' : error ? 'Orders unavailable.' : 'No orders yet.'}
							</td>
						</tr>
					) : orders.map((order) => (
						<tr key={order.id} className="border-b border-gray-100">
							<td className="px-3 py-4 font-medium text-[#760D2D]">{order.orderNumber}</td>
							<td className="px-3 py-4">{order.customer.name}</td>
							<td className="px-3 py-4">
								{order.items.map((item) => `${item.garmentType} (${item.quantity})`).join(', ')}
							</td>
							<td className="whitespace-nowrap px-3 py-4">
								{order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString('en-IN', {
									day: '2-digit',
									month: 'short',
									year: 'numeric',
								}) : 'Not scheduled'}
							</td>
							<td className="px-3 py-4">
								<span className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium ${statusStyles[order.status]}`}>
									{statusLabels[order.status]}
								</span>
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	)
}
