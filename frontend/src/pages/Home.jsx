import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { productAPI } from '../services/api';
import ProductCard from '../components/ProductCard';
import LoadingSpinner from '../components/LoadingSpinner';

const CATEGORIES = [
  { name: 'Electronics', icon: 'M9 3v2m6-2v2M9 3h6M5 7h14v12H5V7z' },
  { name: 'Fashion', icon: 'M7 7h10v10H7V7z M7 3h10v4H7V3z M7 17h10v4H7v-4z' },
  { name: 'Home & Living', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { name: 'Beauty', icon: 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  { name: 'Sports', icon: 'M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  { name: 'Books', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
];

export default function Home() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [activeCategory, setActiveCategory] = useState(searchParams.get('category') || '');

  const fetchProducts = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      const search = searchParams.get('search');
      const category = searchParams.get('category');
      const page = searchParams.get('page') || 1;

      if (search) params.search = search;
      if (category) params.category = category;
      params.page = page;
      params.limit = 20;

      const res = await productAPI.getAll(params);
      setProducts(res.data.data.products);
      setPagination(res.data.data.pagination);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [searchParams]);

  const handleCategoryClick = (category) => {
    if (activeCategory === category) {
      setActiveCategory('');
      setSearchParams({});
    } else {
      setActiveCategory(category);
      setSearchParams({ category });
    }
  };

  const searchQuery = searchParams.get('search');

  return (
    <div className="min-h-screen bg-gray-50">
      <section className="bg-gradient-to-r from-primary-500 to-primary-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
          <div className="md:w-2/3">
            <h1 className="text-3xl md:text-5xl font-extrabold mb-4 leading-tight">
              Discover Amazing Products
            </h1>
            <p className="text-lg md:text-xl text-primary-100 mb-8">
              Shop the best deals on thousands of products from trusted sellers.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="/?category=Electronics"
                className="inline-block bg-white text-primary-600 px-6 py-3 rounded-lg font-semibold hover:bg-primary-50 transition-colors"
              >
                Shop Electronics
              </a>
              <a
                href="/?category=Fashion"
                className="inline-block bg-primary-400 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-300 transition-colors"
              >
                Shop Fashion
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Categories</h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.name}
                onClick={() => handleCategoryClick(cat.name)}
                className={`flex flex-col items-center p-3 rounded-lg transition-colors ${
                  activeCategory === cat.name
                    ? 'bg-primary-50 text-primary-600 ring-2 ring-primary-500'
                    : 'bg-gray-50 text-gray-600 hover:bg-primary-50 hover:text-primary-600'
                }`}
              >
                <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={cat.icon} />
                </svg>
                <span className="text-xs font-medium">{cat.name}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-800">
            {searchQuery
              ? `Results for "${searchQuery}"`
              : activeCategory
                ? activeCategory
                : 'All Products'}
          </h2>
          {pagination.total > 0 && (
            <span className="text-sm text-gray-500">{pagination.total} products</span>
          )}
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-500 mb-4">{error}</p>
            <button onClick={fetchProducts} className="text-primary-500 hover:underline">
              Try again
            </button>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p className="text-gray-500 text-lg">No products found</p>
            <p className="text-gray-400 text-sm mt-1">Try a different search or category</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {pagination.pages > 1 && (
              <div className="flex justify-center items-center space-x-2 mt-8">
                <button
                  disabled={pagination.page <= 1}
                  onClick={() => setSearchParams({ page: pagination.page - 1, ...(activeCategory && { category: activeCategory }) })}
                  className="px-3 py-2 rounded border text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Previous
                </button>
                {Array.from({ length: pagination.pages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === pagination.pages || Math.abs(p - pagination.page) <= 2)
                  .map((p, idx, arr) => (
                    <span key={p}>
                      {idx > 0 && arr[idx - 1] !== p - 1 && <span className="px-1 text-gray-400">...</span>}
                      <button
                        onClick={() => setSearchParams({ page: p, ...(activeCategory && { category: activeCategory }) })}
                        className={`px-3 py-2 rounded text-sm ${
                          pagination.page === p
                            ? 'bg-primary-500 text-white'
                            : 'border hover:bg-gray-50'
                        }`}
                      >
                        {p}
                      </button>
                    </span>
                  ))}
                <button
                  disabled={pagination.page >= pagination.pages}
                  onClick={() => setSearchParams({ page: pagination.page + 1, ...(activeCategory && { category: activeCategory }) })}
                  className="px-3 py-2 rounded border text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
