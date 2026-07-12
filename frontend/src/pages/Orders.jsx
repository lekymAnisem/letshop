import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { orderAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

const STATUS_STEPS = ['pending', 'packing', 'shipped', 'delivered'];

const statusConfig = {
  pending: { label: 'Pending', color: 'bg-yellow-400', textColor: 'text-yellow-600', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
  packing: { label: 'Packing', color: 'bg-blue-400', textColor: 'text-blue-600', icon: 'M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4' },
  shipped: { label: 'Shipped', color: 'bg-purple-400', textColor: 'text-purple-600', icon: 'M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2-1 2 1 2-1 2 1 2-1 2 1V6z' },
  delivered: { label: 'Delivered', color: 'bg-green-400', textColor: 'text-green-600', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
  cancelled: { label: 'Cancelled', color: 'bg-red-400', textColor: 'text-red-600', icon: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z' },
};

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await orderAPI.getOrders();
        setOrders(res.data.data);
      } catch (err) {
        console.error('Failed to load orders');
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

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

  const getStatusStep = (status) => {
    const idx = STATUS_STEPS.indexOf(status);
    return idx === -1 ? -1 : idx;
  };

  const OrderTimeline = ({ order }) => {
    const currentStep = getStatusStep(order.status);
    const isCancelled = order.status === 'cancelled';

    return (
      <div className="mb-4">
        <div className="flex items-center justify-between">
          {STATUS_STEPS.map((step, idx) => (
            <div key={step} className="flex-1 relative">
              <div className="flex items-center">
                <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                  isCancelled
                    ? 'bg-gray-200'
                    : idx <= currentStep
                      ? statusConfig[step].color + ' text-white'
                      : 'bg-gray-200 text-gray-400'
                }`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {idx < currentStep && !isCancelled ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={statusConfig[step].icon} />
                    )}
                  </svg>
                </div>
                {idx < STATUS_STEPS.length - 1 && (
                  <div className={`flex-1 h-1 -ml-1 -mr-1 ${
                    isCancelled ? 'bg-gray-200' : idx < currentStep ? 'bg-green-400' : 'bg-gray-200'
                  }`} />
                )}
              </div>
              <p className={`text-xs mt-1 font-medium ${isCancelled ? 'text-gray-400' : idx <= currentStep ? statusConfig[step].textColor : 'text-gray-400'}`}>
                {statusConfig[step].label}
              </p>
            </div>
          ))}
        </div>
        {isCancelled && (
          <p className="text-xs text-red-500 mt-2 font-medium">This order was cancelled</p>
        )}
      </div>
    );
  };

  if (loading) return <LoadingSpinner text="Loading orders..." />;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">My Orders</h1>
          <Link to="/" className="text-sm text-primary-500 hover:text-primary-600 font-medium">
            Continue Shopping
          </Link>
        </div>

        {orders.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <svg className="w-20 h-20 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            <h2 className="text-xl font-semibold text-gray-600 mb-2">No orders yet</h2>
            <p className="text-gray-400 mb-6">Start shopping to see your orders here</p>
            <Link to="/" className="inline-block bg-primary-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-600 transition-colors">
              Browse Products
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-xs text-gray-400 font-mono">Order #{order.id.slice(0, 8)}</p>
                      <p className="text-xs text-gray-400">{formatDate(order.createdAt)}</p>
                    </div>
                    <span className={`text-xs font-semibold uppercase px-2 py-0.5 rounded-full ${
                      order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                      order.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                      order.status === 'shipped' ? 'bg-purple-100 text-purple-700' :
                      order.status === 'packing' ? 'bg-blue-100 text-blue-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {statusConfig[order.status]?.label || order.status}
                    </span>
                  </div>
                  <p className="text-lg font-bold text-primary-500">{formatPrice(order.total)}</p>
                </div>

                <OrderTimeline order={order} />

                <div className="border-t border-gray-100 pt-4 space-y-3">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gray-50 rounded-lg overflow-hidden flex-shrink-0">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">No img</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
                        <p className="text-xs text-gray-400">x{item.quantity}</p>
                      </div>
                      <p className="text-sm font-medium text-gray-800">{formatPrice(item.price * item.quantity)}</p>
                    </div>
                  ))}
                </div>

                {order.shippingAddress && (
                  <div className="border-t border-gray-100 pt-3 mt-3">
                    <p className="text-xs text-gray-500 font-medium mb-1">Shipping to:</p>
                    <p className="text-xs text-gray-600">{order.shippingAddress.address}, {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}, {order.shippingAddress.country}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Payment: <span className="capitalize">{order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Card'}</span>
                      {order.paymentStatus === 'paid' && <span className="text-green-600 ml-1">(Paid)</span>}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
