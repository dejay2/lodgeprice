import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Environment variable validation at startup
if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing required environment variables:')
  console.error('VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL ? 'Set' : 'Missing')
  console.error('VITE_SUPABASE_SERVICE_ROLE_KEY:', import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Missing')
  console.error('Please check your .env file and ensure all required variables are set.')
}

// Development environment info
if (import.meta.env.DEV) {
  console.log('🚀 Lodgeprice 2.0 - Development Mode')
  console.log('Environment:', import.meta.env.MODE)
  console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL)
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)