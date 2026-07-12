import { useState, useEffect } from 'react';
import { orderAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

const STATUS_STEPS = ['pending', 'packing', 'shipped', 'delivered'];

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-700',
  packing: 'bg-blue-100 text-blue-700',
  shipped: 'bg-purple-100 text-purple-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

const statusLabels = {
  pending: 'Pending',
  packing: 'Packing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [updatingId, setUpdatingId] = useState(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await orderAPI.getAllOrders({ status: statusFilter, page, limit: 20 });
      setOrders(res.data.data.orders);
      setTotalPages(res.data.data.pages);
    } catch (err) {
      setError('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, [statusFilter, page]);

  const handleStatusUpdate = async (orderId, newStatus) => {
    setUpdatingId(orderId);
    try {
      const res = await orderAPI.updateStatus(orderId, { status: newStatus });
      setSuccess(`Order #${orderId.slice(0, 8)} updated to ${statusLabels[newStatus]}`);
      fetchOrders();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  };

  const getNextStatuses = (currentStatus) => {
    const idx = STATUS_STEPS.indexOf(currentStatus);
    if (currentStatus === 'delivered' || currentStatus === 'cancelled') return [];
    if (idx === -1) return [];
    return STATUS_STEPS.slice(idx + 1);
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency', currency: 'USD',
    }).format(price);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <div>
      {success && (
        <div className="bg-green-50 text-green-600 px-4 py-3 rounded-lg text-sm mb-6">{success}</div>
      )}
      {error && (
        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm mb-6">{error}</div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <h2 className="text-lg font-semibold text-gray-800">
          Orders ({orders.length})
        </h2>
        <div className="flex flex-wrap gap-2">
          {['all', 'pending', 'packing', 'shipped', 'delivered', 'cancelled'].map((status) => (
            <button
              key={status}
              onClick={() => { setStatusFilter(status); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === status
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {status === 'all' ? 'All' : statusLabels[status]}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <p className="text-gray-500">No orders found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <p className="text-xs text-gray-400 font-mono">Order #{order.id.slice(0, 8)}</p>
                    <span className={`text-xs font-semibold uppercase px-2 py-0.5 rounded-full ${statusColors[order.status] || 'bg-gray-100 text-gray-600'}`}>
                      {statusLabels[order.status] || order.status}
                    </span>
                    <span className="text-xs text-gray-400">{formatDate(order.createdAt)}</span>
                  </div>

                  <div className="text-sm text-gray-600 mb-3">
                    <span className="font-medium text-gray-800">{order.user?.name}</span>
                    {' '}({order.user?.email})
                  </div>

                  <div className="border-t border-gray-100 pt-3 space-y-2 mb-3">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <span className="text-gray-800 font-medium truncate max-w-[200px]">{item.name}</span>
                        <span className="text-gray-400">x{item.quantity}</span>
                        <span className="text-gray-600 ml-auto">{formatPrice(item.price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>

                  {order.shippingAddress && (
                    <div className="text-xs text-gray-500 mb-1">
                      <span className="font-medium text-gray-600">Ship to: </span>
                      {order.shippingAddress.address}, {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}, {order.shippingAddress.country}
                    </div>
                  )}

                  <div className="text-xs text-gray-500">
                    <span className="font-medium text-gray-600">Payment: </span>
                    <span className="capitalize">{order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Card'}</span>
                    {order.paymentStatus === 'paid' && <span className="text-green-600 ml-1">(Paid)</span>}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <p className="text-xl font-bold text-primary-500">{formatPrice(order.total)}</p>
                  <div className="flex flex-col gap-1.5 mt-2">
                    {getNextStatuses(order.status).map((nextStatus) => (
                      <button
                        key={nextStatus}
                        onClick={() => handleStatusUpdate(order.id, nextStatus)}
                        disabled={updatingId === order.id}
                        className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                          nextStatus === 'shipped' ? 'bg-purple-500 text-white hover:bg-purple-600' :
                          nextStatus === 'delivered' ? 'bg-green-500 text-white hover:bg-green-600' :
                          nextStatus === 'packing' ? 'bg-blue-500 text-white hover:bg-blue-600' :
                          'bg-gray-500 text-white hover:bg-gray-600'
                        } disabled:opacity-50`}
                      >
                        {updatingId === order.id ? '...' : `Mark ${statusLabels[nextStatus]}`}
                      </button>
                    ))}
                    {order.status === 'pending' && (
                      <button
                        onClick={() => {
                          if (window.confirm('Cancel this order?')) {
                            handleStatusUpdate(order.id, 'cancelled');
                          }
                        }}
                        disabled={updatingId === order.id}
                        className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-red-100 text-red-600 hover:bg-red-200 transition-colors disabled:opacity-50"
                      >
                        {updatingId === order.id ? '...' : 'Cancel Order'}
                      </button>
                    )}
                    {(order.status === 'delivered' || order.status === 'cancelled') && (
                      <span className="text-xs text-gray-400 italic">Final state</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
