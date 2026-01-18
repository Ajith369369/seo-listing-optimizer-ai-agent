/**
 * Keyword Chip Component
 * Displays a keyword as a clickable chip that can be added/removed from the title
 */
interface KeywordChipProps {
  keyword: string;
  onRemove?: () => void;
  onClick?: () => void;
  variant?: 'default' | 'selected';
}

export function KeywordChip({
  keyword,
  onRemove,
  onClick,
  variant = 'default',
}: KeywordChipProps) {
  const baseStyles =
    'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer';
  
  const variantStyles = {
    default:
      'bg-saas-blue-100 text-saas-blue-700 hover:bg-saas-blue-200 border border-saas-blue-300',
    selected:
      'bg-saas-blue-600 text-white hover:bg-saas-blue-700 border border-saas-blue-700',
  };

  return (
    <span
      className={`${baseStyles} ${variantStyles[variant]}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      {keyword}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-1 hover:bg-black/10 rounded-full p-0.5 transition-colors w-4 h-4 flex items-center justify-center"
          aria-label={`Remove ${keyword}`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-3 h-3"
          >
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      )}
    </span>
  );
}
