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
import PricingCalendarDemo from '@/pages/PricingCalendarDemo'
import InlineEditingDemo from '@/pages/InlineEditingDemo'
import DiscountStrategyDemo from '@/pages/DiscountStrategyDemo'
import SeasonalRateManagementPage from '@/components/seasonal-rate-management/SeasonalRateManagementPage'

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
                <Route path="seasonal-rates" element={<SeasonalRateManagementPage />} />
                <Route path="settings" element={<Settings />} />
                <Route path="test" element={<TestPricing />} />
                <Route path="property-selection-demo" element={<PropertySelectionDemo />} />
                <Route path="pricing-calendar-demo" element={<PricingCalendarDemo />} />
                <Route path="inline-editing-demo" element={<InlineEditingDemo />} />
                <Route path="discount-strategy-demo" element={<DiscountStrategyDemo />} />
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