/**
 * LoadingStates - Reusable loading components for pricing interface
 * Provides consistent loading indicators across all components
 */

import React from 'react'

/**
 * Generic spinner loading indicator
 */
export const LoadingSpinner: React.FC<{ size?: 'sm' | 'md' | 'lg'; text?: string }> = ({ 
  size = 'md', 
  text = 'Loading...' 
}) => {
  const sizeClass = size === 'sm' ? '' : size === 'lg' ? 'spinner-border-lg' : ''
  
  return (
    <div className="text-center p-3">
      <div className={`spinner-border text-primary ${sizeClass}`} role="status">
        <span className="visually-hidden">{text}</span>
      </div>
      {text && <p className="mt-2 text-muted">{text}</p>}
    </div>
  )
}

/**
 * Calendar skeleton loader
 */
export const CalendarSkeleton: React.FC = () => {
  return (
    <div className="calendar-skeleton">
      {/* Header skeleton */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div className="skeleton skeleton-button" style={{ width: '120px', height: '38px' }}></div>
        <div className="skeleton skeleton-text" style={{ width: '200px', height: '32px' }}></div>
        <div className="skeleton skeleton-button" style={{ width: '120px', height: '38px' }}></div>
      </div>
      
      {/* Controls skeleton */}
      <div className="d-flex gap-3 mb-3">
        <div className="skeleton skeleton-checkbox" style={{ width: '150px', height: '24px' }}></div>
        <div className="skeleton skeleton-checkbox" style={{ width: '180px', height: '24px' }}></div>
      </div>
      
      {/* Calendar grid skeleton */}
      <div className="calendar-grid-skeleton">
        {/* Weekday headers */}
        <div className="row g-0 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="col text-center">
              <div className="skeleton skeleton-text mx-auto" style={{ width: '40px', height: '20px' }}></div>
            </div>
          ))}
        </div>
        
        {/* Calendar cells */}
        {Array.from({ length: 5 }, (_, weekIndex) => (
          <div key={weekIndex} className="row g-0 mb-1">
            {Array.from({ length: 7 }, (_, dayIndex) => (
              <div key={dayIndex} className="col p-1">
                <div 
                  className="skeleton skeleton-cell" 
                  style={{ 
                    height: '80px',
                    borderRadius: '4px',
                    animation: `pulse 1.5s ease-in-out ${(weekIndex * 7 + dayIndex) * 0.05}s infinite`
                  }}
                ></div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Panel skeleton loader
 */
export const PanelSkeleton: React.FC = () => {
  return (
    <div className="panel-skeleton">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div className="skeleton skeleton-text" style={{ width: '250px', height: '32px' }}></div>
        <div className="skeleton skeleton-button" style={{ width: '120px', height: '38px' }}></div>
      </div>
      
      {/* List items */}
      <div className="list-group">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="list-group-item">
            <div className="d-flex justify-content-between align-items-start">
              <div className="flex-grow-1">
                <div className="skeleton skeleton-text mb-2" style={{ width: '200px', height: '20px' }}></div>
                <div className="skeleton skeleton-text mb-2" style={{ width: '300px', height: '16px' }}></div>
                <div className="skeleton skeleton-badge" style={{ width: '60px', height: '22px' }}></div>
              </div>
              <div className="d-flex gap-1">
                <div className="skeleton skeleton-button" style={{ width: '60px', height: '31px' }}></div>
                <div className="skeleton skeleton-button" style={{ width: '60px', height: '31px' }}></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Inline loading indicator for buttons
 */
export const ButtonSpinner: React.FC<{ text?: string }> = ({ text = 'Processing...' }) => {
  return (
    <>
      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
      {text}
    </>
  )
}

/**
 * Data fetching indicator with retry option
 */
interface DataLoadingProps {
  message?: string
  showRetry?: boolean
  onRetry?: () => void
}

export const DataLoading: React.FC<DataLoadingProps> = ({ 
  message = 'Loading data...', 
  showRetry = false,
  onRetry 
}) => {
  return (
    <div className="data-loading text-center p-5">
      <div className="spinner-border text-primary mb-3" role="status">
        <span className="visually-hidden">{message}</span>
      </div>
      <p className="text-muted">{message}</p>
      {showRetry && onRetry && (
        <button className="btn btn-link" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  )
}

/**
 * Placeholder for empty states
 */
interface EmptyStateProps {
  title: string
  message: string
  actionText?: string
  onAction?: () => void
  icon?: string
}

export const EmptyState: React.FC<EmptyStateProps> = ({ 
  title, 
  message, 
  actionText, 
  onAction,
  icon = 'bi-inbox'
}) => {
  return (
    <div className="empty-state text-center p-5">
      <i className={`bi ${icon} display-4 text-muted mb-3`}></i>
      <h5 className="mb-2">{title}</h5>
      <p className="text-muted mb-3">{message}</p>
      {actionText && onAction && (
        <button className="btn btn-primary" onClick={onAction}>
          {actionText}
        </button>
      )}
    </div>
  )
}

/**
 * CSS for skeleton loaders (add to your main CSS file)
 */
export const SkeletonStyles = `
.skeleton {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: pulse 1.5s ease-in-out infinite;
}

.skeleton-text {
  border-radius: 4px;
}

.skeleton-button {
  border-radius: 6px;
}

.skeleton-cell {
  border: 1px solid #e0e0e0;
}

.skeleton-badge {
  border-radius: 12px;
}

.skeleton-checkbox {
  border-radius: 4px;
}

@keyframes pulse {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
`