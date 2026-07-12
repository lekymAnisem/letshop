import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { itemCount } = useCart();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/?search=${encodeURIComponent(searchTerm.trim())}`);
      setSearchTerm('');
    }
  };

  return (
    <nav className="bg-primary-500 shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center space-x-2">
            <span className="text-2xl font-extrabold text-white">LetShop</span>
          </Link>

          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-lg mx-8">
            <div className="relative w-full">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search products..."
                className="w-full px-4 py-2 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-primary-300 text-sm"
              />
              <button
                type="submit"
                className="absolute right-0 top-0 h-full px-4 bg-white rounded-r-lg hover:bg-gray-100"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </div>
          </form>

          <div className="flex items-center space-x-4">
            {user ? (
              <div className="hidden md:flex items-center space-x-4">
                <span className="text-white text-sm font-medium">{user.name}</span>
                {!user.isAdmin && (
                  <>
                    <button onClick={() => navigate('/orders')} className="text-white text-sm hover:text-primary-100">
                      My Orders
                    </button>
                    <button onClick={() => navigate('/cart')} className="relative text-white hover:text-primary-100">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
                      </svg>
                      {itemCount > 0 && (
                        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                          {itemCount > 99 ? '99+' : itemCount}
                        </span>
                      )}
                    </button>
                  </>
                )}
                <button
                  onClick={() => { logout(); navigate('/'); }}
                  className="text-white text-sm hover:text-primary-100"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="hidden md:flex items-center space-x-3">
                <Link to="/login" className="text-white text-sm font-medium hover:text-primary-100">Login</Link>
                <Link to="/register" className="bg-white text-primary-500 px-4 py-1.5 rounded-lg text-sm font-semibold hover:bg-primary-50">
                  Sign Up
                </Link>
              </div>
            )}

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-white"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden bg-primary-600 px-4 pb-4">
          <form onSubmit={handleSearch} className="mb-3">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search products..."
              className="w-full px-4 py-2 rounded-lg focus:outline-none text-sm"
            />
          </form>
          {user ? (
            <div className="space-y-2">
              <span className="block text-white text-sm">{user.name}</span>
              {!user.isAdmin && (
                <>
                  <button onClick={() => { navigate('/orders'); setMobileMenuOpen(false); }} className="block text-white text-sm">
                    My Orders
                  </button>
                  <button onClick={() => { navigate('/cart'); setMobileMenuOpen(false); }} className="block text-white text-sm">
                    Cart ({itemCount})
                  </button>
                </>
              )}
              <button onClick={() => { logout(); navigate('/'); setMobileMenuOpen(false); }} className="block text-white text-sm">
                Logout
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="block text-white text-sm">Login</Link>
              <Link to="/register" onClick={() => setMobileMenuOpen(false)} className="block text-white text-sm font-semibold">Sign Up</Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
