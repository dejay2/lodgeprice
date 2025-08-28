import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider } from '@/context/AppContext'
import { PricingProvider } from '@/context/PricingContext'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import Layout from '@/components/Layout'
import Properties from '@/pages/Properties'
import Calendar from '@/pages/Calendar'
import Settings from '@/pages/Settings'
import NotFound from '@/pages/NotFound'
import { TestPricing } from '@/pages/TestPricing'
import PropertySelectionDemo from '@/pages/PropertySelectionDemo'

function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <PricingProvider>
          <Router>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<Navigate to="/properties" replace />} />
                <Route path="properties" element={<Properties />} />
                <Route path="calendar" element={<Calendar />} />
                <Route path="calendar/:propertyId" element={<Calendar />} />
                <Route path="settings" element={<Settings />} />
                <Route path="test" element={<TestPricing />} />
                <Route path="property-selection-demo" element={<PropertySelectionDemo />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </Router>
        </PricingProvider>
      </AppProvider>
    </ErrorBoundary>
  )
}

export default App