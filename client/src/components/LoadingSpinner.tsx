/**
 * Loading Spinner Component
 * High-quality loading indicator for AI processing
 */
export function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-4">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-saas-blue-200 border-t-saas-blue-600 rounded-full animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 bg-saas-blue-600 rounded-full opacity-20"></div>
        </div>
      </div>
      <div className="text-center">
        <p className="text-lg font-semibold text-saas-blue-700">
          AI is analyzing your listing...
        </p>
        <p className="text-sm text-gray-600 mt-1">
          This may take a few seconds
        </p>
      </div>
    </div>
  );
}

/**
 * Skeleton Loader for title comparison
 */
export function TitleSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
      <div className="h-4 bg-gray-200 rounded w-full"></div>
      <div className="h-4 bg-gray-200 rounded w-5/6"></div>
    </div>
  );
}
