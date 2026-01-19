/**
 * SEO Optimizer Component
 * Main component for the SEO Listing Optimizer AI Agent
 * Implements HITL pattern with discriminated union state management
 */
import { useCallback, useState } from 'react';
import { optimizeTitle } from '../services/api';
import { ErrorState, SEOState } from '../types/seo';
import { generateUUID } from '../utils/uuid';
import { KeywordChip } from './KeywordChip';
import { LoadingSpinner, TitleSkeleton } from './LoadingSpinner';

const INITIAL_STATE: SEOState = {
  id: generateUUID(),
  originalTitle: '',
  taskType: 'seo_optimization',
  status: 'idle',
};

export function SEOOptimizer() {
  const [state, setState] = useState<SEOState>(INITIAL_STATE);
  const [inputTitle, setInputTitle] = useState('');

  /**
   * Handles the optimize button click
   * Only triggers AI optimization on explicit user action to protect RPM quota
   */
  const handleOptimize = useCallback(async () => {
    if (!inputTitle.trim()) {
      alert('Please enter a product title');
      return;
    }

    // Transition to loading state
    setState({
      id: generateUUID(),
      originalTitle: inputTitle.trim(),
      taskType: 'seo_optimization',
      status: 'loading',
    });

    try {
      const result = await optimizeTitle(inputTitle.trim());
      
      // Transition to review required state
      setState({
        id: generateUUID(),
        originalTitle: inputTitle.trim(),
        taskType: 'seo_optimization',
        status: 'review_required',
        optimizedTitle: result.optimizedTitle,
        keywords: result.keywords,
        reasoning: result.reasoning,
        editableTitle: result.optimizedTitle,
        provider: result.metadata?.provider,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      let errorType: ErrorState['errorType'] = 'api_error';
      let message = 'An error occurred while optimizing your title.';

      if (errorMessage === 'TIMEOUT') {
        errorType = 'timeout';
        message = 'The AI took too long to respond. Please try again or use manual entry.';
      } else if (errorMessage === 'RATE_LIMIT') {
        errorType = 'rate_limit';
        message = 'The Agent is busy analyzing other listings. Please wait 60 seconds.';
      } else if (errorMessage === 'BACKEND_UNREACHABLE' || errorMessage.startsWith('NETWORK_ERROR')) {
        errorType = 'network_error';
        message = 'Backend not reachable. Start the server: in the server folder run "uvicorn main:app --reload"';
      } else if (errorMessage.startsWith('API_ERROR')) {
        errorType = 'api_error';
        message = errorMessage.replace('API_ERROR: ', '');
      }

      setState({
        id: generateUUID(),
        originalTitle: inputTitle.trim(),
        taskType: 'seo_optimization',
        status: 'error',
        errorType,
        errorMessage: message,
        retryCount: 0,
      });
    }
  }, [inputTitle]);

  /**
   * Handles retry after error
   */
  const handleRetry = useCallback(() => {
    if (state.status === 'error') {
      setState({
        ...state,
        status: 'loading',
      });
      optimizeTitle(state.originalTitle)
        .then((result) => {
          setState({
            id: generateUUID(),
            originalTitle: state.originalTitle,
            taskType: 'seo_optimization',
            status: 'review_required',
            optimizedTitle: result.optimizedTitle,
            keywords: result.keywords,
            reasoning: result.reasoning,
            editableTitle: result.optimizedTitle,
            provider: result.metadata?.provider,
          });
        })
        .catch((error) => {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          let errorType: ErrorState['errorType'] = 'api_error';
          let message = 'An error occurred while optimizing your title.';

          if (errorMessage === 'TIMEOUT') {
            errorType = 'timeout';
            message = 'The AI took too long to respond. Please try again or use manual entry.';
          } else if (errorMessage === 'RATE_LIMIT') {
            errorType = 'rate_limit';
            message = 'The Agent is busy analyzing other listings. Please wait 60 seconds.';
          } else if (errorMessage === 'BACKEND_UNREACHABLE' || errorMessage.startsWith('NETWORK_ERROR')) {
            errorType = 'network_error';
            message = 'Backend not reachable. Start the server: in the server folder run "uvicorn main:app --reload"';
          }

          setState({
            ...state,
            status: 'error',
            errorType,
            errorMessage: message,
            retryCount: state.retryCount + 1,
          });
        });
    }
  }, [state]);

  /**
   * Handles manual entry fallback
   */
  const handleManualEntry = useCallback(() => {
    if (state.status === 'error' || state.status === 'loading') {
      setState({
        id: generateUUID(),
        originalTitle: state.originalTitle,
        taskType: 'seo_optimization',
        status: 'manual_entry',
        manualTitle: state.originalTitle,
        manualKeywords: [],
      });
    }
  }, [state]);

  /**
   * Handles keyword chip click - adds keyword to editable title
   */
  const handleKeywordClick = useCallback(
    (keyword: string) => {
      if (state.status === 'review_required') {
        const currentTitle = state.editableTitle;
        // Add keyword if not already present
        if (!currentTitle.toLowerCase().includes(keyword.toLowerCase())) {
          setState({
            ...state,
            editableTitle: `${currentTitle} ${keyword}`,
          });
        }
      }
    },
    [state]
  );

  /**
   * Handles keyword removal from title
   */
  const handleKeywordRemove = useCallback(
    (keyword: string) => {
      if (state.status === 'review_required') {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        setState({
          ...state,
          editableTitle: state.editableTitle.replace(regex, '').replace(/\s+/g, ' ').trim(),
        });
      }
    },
    [state]
  );

  /**
   * Handles title approval
   */
  const handleApprove = useCallback(() => {
    if (state.status === 'review_required') {
      setState({
        id: generateUUID(),
        originalTitle: state.originalTitle,
        taskType: 'seo_optimization',
        status: 'approved',
        optimizedTitle: state.editableTitle,
        keywords: state.keywords,
        approvedAt: new Date(),
      });
    }
  }, [state]);

  /**
   * Handles reset to start new optimization
   */
  const handleReset = useCallback(() => {
    setState(INITIAL_STATE);
    setInputTitle('');
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-saas-blue-900 mb-2">
            SEO Listing Optimizer
          </h1>
          <p className="text-gray-600">
            Transform your product titles into high-converting, search-optimized assets
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-lg shadow-xl p-8">
          {/* Input Section - Only show when idle or after reset */}
          {(state.status === 'idle' || state.status === 'approved') && (
            <div className="mb-8">
              <label
                htmlFor="product-title"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Product Title
              </label>
              <div className="flex gap-4">
                <input
                  id="product-title"
                  type="text"
                  value={inputTitle}
                  onChange={(e) => setInputTitle(e.target.value)}
                  placeholder="Enter your product title here..."
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-saas-blue-500 focus:border-transparent outline-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleOptimize();
                    }
                  }}
                />
                <button
                  onClick={handleOptimize}
                  className="px-6 py-3 bg-saas-blue-600 text-white rounded-lg font-semibold hover:bg-saas-blue-700 transition-colors shadow-md hover:shadow-lg"
                >
                  Optimize
                </button>
              </div>
            </div>
          )}

          {/* Loading State */}
          {state.status === 'loading' && (
            <div>
              <LoadingSpinner />
              <div className="mt-8 space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Original Title</h3>
                  <p className="text-gray-800">{state.originalTitle}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">AI Optimized Title</h3>
                  <TitleSkeleton />
                </div>
              </div>
            </div>
          )}

          {/* Review Required State - HITL Interface */}
          {state.status === 'review_required' && (
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Original Title */}
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Original Title</h3>
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-gray-800">{state.originalTitle}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      {state.originalTitle.length} characters
                    </p>
                  </div>
                </div>

                {/* AI Optimized Title - Editable */}
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">
                    AI Optimized Title
                    <span className="ml-2 text-xs text-saas-blue-600">(Editable)</span>
                  </h3>
                  <textarea
                    value={state.editableTitle}
                    onChange={(e) =>
                      setState({
                        ...state,
                        editableTitle: e.target.value,
                      })
                    }
                    className="w-full p-4 bg-saas-blue-50 rounded-lg border border-saas-blue-200 focus:ring-2 focus:ring-saas-blue-500 focus:border-transparent outline-none resize-none"
                    rows={4}
                  />
                  <div className="flex justify-between items-center mt-2">
                    <p className="text-xs text-gray-500">
                      {state.editableTitle.length} characters
                    </p>
                    {state.editableTitle.length <= 80 && (
                      <p className="text-xs text-green-600 font-medium">
                        ✓ Mobile optimized (≤80 chars)
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Keywords Section */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-3">
                  Suggested Keywords (Click to add/remove)
                </h3>
                <div className="flex flex-wrap gap-2">
                  {state.keywords.map((keyword, index) => {
                    const isInTitle = state.editableTitle
                      .toLowerCase()
                      .includes(keyword.toLowerCase());
                    return (
                      <KeywordChip
                        key={index}
                        keyword={keyword}
                        variant={isInTitle ? 'selected' : 'default'}
                        onClick={() => handleKeywordClick(keyword)}
                        onRemove={() => handleKeywordRemove(keyword)}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Reasoning */}
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="text-sm font-medium text-blue-900 mb-2">AI Reasoning</h3>
                <p className="text-sm text-blue-800">{state.reasoning}</p>
                {state.provider && (
                  <p className="text-xs text-gray-500 mt-2">Powered by {state.provider}</p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-4 border-t">
                <button
                  onClick={handleApprove}
                  className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors shadow-md"
                >
                  Approve & Save
                </button>
                <button
                  onClick={handleReset}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                >
                  Start Over
                </button>
              </div>
            </div>
          )}

          {/* Error State */}
          {state.status === 'error' && (
            <div className="space-y-6">
              <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
                <h3 className="text-lg font-semibold text-red-900 mb-2">Error</h3>
                <p className="text-red-800">{state.errorMessage}</p>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={handleRetry}
                  className="flex-1 px-6 py-3 bg-saas-blue-600 text-white rounded-lg font-semibold hover:bg-saas-blue-700 transition-colors"
                >
                  Retry
                </button>
                <button
                  onClick={handleManualEntry}
                  className="flex-1 px-6 py-3 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 transition-colors"
                >
                  Manual Entry
                </button>
                <button
                  onClick={handleReset}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                >
                  Start Over
                </button>
              </div>
            </div>
          )}

          {/* Approved State */}
          {state.status === 'approved' && (
            <div className="space-y-6">
              <div className="p-6 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="text-lg font-semibold text-green-900 mb-2">
                  ✓ Title Approved
                </h3>
                <p className="text-green-800 mb-4">{state.optimizedTitle}</p>
                <p className="text-sm text-green-700">
                  Approved at: {state.approvedAt.toLocaleString()}
                </p>
              </div>
              <button
                onClick={handleReset}
                className="w-full px-6 py-3 bg-saas-blue-600 text-white rounded-lg font-semibold hover:bg-saas-blue-700 transition-colors"
              >
                Optimize Another Title
              </button>
            </div>
          )}

          {/* Manual Entry State */}
          {state.status === 'manual_entry' && (
            <div className="space-y-6">
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h3 className="text-sm font-medium text-yellow-900 mb-2">
                  Manual Entry Mode
                </h3>
                <p className="text-sm text-yellow-800">
                  Enter your optimized title manually below.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Optimized Title
                </label>
                <textarea
                  value={state.manualTitle}
                  onChange={(e) =>
                    setState({
                      ...state,
                      manualTitle: e.target.value,
                    })
                  }
                  className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-saas-blue-500 focus:border-transparent outline-none resize-none"
                  rows={4}
                />
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setState({
                      id: generateUUID(),
                      originalTitle: state.originalTitle,
                      taskType: 'seo_optimization',
                      status: 'approved',
                      optimizedTitle: state.manualTitle,
                      keywords: state.manualKeywords,
                      approvedAt: new Date(),
                    });
                  }}
                  className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
                >
                  Save Manual Entry
                </button>
                <button
                  onClick={handleReset}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                >
                  Start Over
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
