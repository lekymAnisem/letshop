import { createContext, useState, useContext, useCallback, useEffect } from 'react';
import { cartAPI } from '../services/api';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchCart = useCallback(async () => {
    if (!user) {
      setItems([]);
      setTotal(0);
      return;
    }
    setLoading(true);
    try {
      const res = await cartAPI.get();
      setItems(res.data.data.items);
      setTotal(res.data.data.total);
    } catch (err) {
      console.error('Failed to fetch cart:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const addToCart = useCallback(async (productId, quantity = 1) => {
    if (!user) throw new Error('Please login to add items to cart');
    const res = await cartAPI.add({ productId, quantity });
    await fetchCart();
    return res.data;
  }, [user, fetchCart]);

  const updateQuantity = useCallback(async (itemId, quantity) => {
    const res = await cartAPI.update(itemId, { quantity });
    await fetchCart();
    return res.data;
  }, [fetchCart]);

  const removeItem = useCallback(async (itemId) => {
    await cartAPI.remove(itemId);
    await fetchCart();
  }, [fetchCart]);

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider value={{ items, total, loading, itemCount, addToCart, updateQuantity, removeItem, fetchCart }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
