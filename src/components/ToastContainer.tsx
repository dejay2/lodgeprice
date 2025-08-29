/**
 * Toast Container Component
 * 
 * Provides accessible toast notifications with proper ARIA attributes
 * and configurable display options.
 */

import React from 'react'
import { ToastContainer as ReactToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

// Custom styles to match Tailwind design system
const customStyles = `
  .Toastify__toast {
    font-family: inherit;
    border-radius: 0.5rem;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  }
  
  .Toastify__toast--error {
    background-color: #FEE2E2;
    color: #991B1B;
  }
  
  .Toastify__toast--warning {
    background-color: #FED7AA;
    color: #9A3412;
  }
  
  .Toastify__toast--success {
    background-color: #D1FAE5;
    color: #065F46;
  }
  
  .Toastify__toast--info {
    background-color: #DBEAFE;
    color: #1E40AF;
  }
  
  .Toastify__progress-bar--error {
    background: #DC2626;
  }
  
  .Toastify__progress-bar--warning {
    background: #F59E0B;
  }
  
  .Toastify__progress-bar--success {
    background: #10B981;
  }
  
  .Toastify__progress-bar--info {
    background: #3B82F6;
  }
`

export const ToastContainer: React.FC = () => {
  return (
    <>
      <style>{customStyles}</style>
      <ReactToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={true}
        closeOnClick={true}
        rtl={false}
        pauseOnFocusLoss={true}
        draggable={true}
        pauseOnHover={true}
        theme="light"
        // Accessibility attributes
        role="region"
        aria-label="Notifications"
        aria-live="polite"
        aria-atomic="true"
        // Limit number of toasts to prevent overwhelming
        limit={3}
        // Custom close button for accessibility
        closeButton={({ closeToast }) => (
          <button
            onClick={closeToast}
            aria-label="Close notification"
            className="text-current opacity-70 hover:opacity-100 p-1"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      />
    </>
  )
}

// Export configured toast methods with proper ARIA attributes
export const showToast = {
  error: (message: string, options?: any) => {
    return toast.error(message, {
      ...options,
      role: 'alert',
      ariaLive: 'assertive',
      className: 'toast-error'
    })
  },
  
  warning: (message: string, options?: any) => {
    return toast.warning(message, {
      ...options,
      role: 'alert',
      ariaLive: 'assertive',
      className: 'toast-warning'
    })
  },
  
  success: (message: string, options?: any) => {
    return toast.success(message, {
      ...options,
      role: 'status',
      ariaLive: 'polite',
      className: 'toast-success'
    })
  },
  
  info: (message: string, options?: any) => {
    return toast.info(message, {
      ...options,
      role: 'status',
      ariaLive: 'polite',
      className: 'toast-info'
    })
  }
}

export default ToastContainer