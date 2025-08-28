import { Outlet, Navigate } from 'react-router-dom'

interface RouteGuardProps {
  fallback?: string
}

const RouteGuard = ({ fallback = '/login' }: RouteGuardProps) => {
  // TODO: Replace with actual Supabase auth check when authentication is implemented
  // This is a skeleton component that currently allows all access
  
  // Example of what authentication check might look like:
  // const { user, loading } = useAuth() // Custom hook for Supabase auth
  // if (loading) return <div>Loading...</div>
  // if (!user) return <Navigate to={fallback} replace />
  
  // For now, always allow access (placeholder implementation)
  const isAuthenticated = true
  
  return isAuthenticated ? <Outlet /> : <Navigate to={fallback} replace />
}

export default RouteGuard