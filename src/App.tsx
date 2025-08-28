import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider } from '@/context/AppContext'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import Layout from '@/components/Layout'
import Properties from '@/pages/Properties'
import Calendar from '@/pages/Calendar'
import Settings from '@/pages/Settings'
import NotFound from '@/pages/NotFound'
import { TestPricing } from '@/pages/TestPricing'

function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Navigate to="/properties" replace />} />
              <Route path="properties" element={<Properties />} />
              <Route path="calendar" element={<Calendar />} />
              <Route path="calendar/:propertyId" element={<Calendar />} />
              <Route path="settings" element={<Settings />} />
              <Route path="test" element={<TestPricing />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </Router>
      </AppProvider>
    </ErrorBoundary>
  )
}

export default App