export default function LoadingSpinner({ size = 'md', text = 'Loading...' }) {
  const sizes = {
    sm: 'h-6 w-6',
    md: 'h-10 w-10',
    lg: 'h-16 w-16',
  };

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className={`${sizes[size]} animate-spin rounded-full border-4 border-gray-200 border-t-primary-500`} />
      {text && <p className="mt-3 text-sm text-gray-500">{text}</p>}
    </div>
  );
}
