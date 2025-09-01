import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider } from '@/context/AppContext'
import { PricingProvider } from '@/context/PricingContext'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ToastContainer } from '@/components/ToastContainer'
import { TooltipProvider } from '@/components/contextual-help'
import Layout from '@/components/Layout'
import Calendar from '@/pages/Calendar'
import Settings from '@/pages/Settings'
import NotFound from '@/pages/NotFound'
import { TestPricing } from '@/pages/TestPricing'
import PropertySelectionDemo from '@/pages/PropertySelectionDemo'
import PricingCalendarDemo from '@/pages/PricingCalendarDemo'
import InlineEditingDemo from '@/pages/InlineEditingDemo'
import DiscountStrategyDemo from '@/pages/DiscountStrategyDemo'
import SeasonalRateManagementPage from '@/components/seasonal-rate-management/SeasonalRateManagementPage'
import DiscountStrategies from '@/pages/DiscountStrategies'
import LodgifyPayloadGeneratorPage from '@/pages/LodgifyPayloadGenerator'

function App() {
  return (
    <ErrorBoundary>
      <TooltipProvider>
        <AppProvider>
          <PricingProvider>
            <Router>
              <ToastContainer />
              <Routes>
                <Route path="/" element={<Layout />}>
                  <Route index element={<Navigate to="/calendar" replace />} />
                  <Route path="properties" element={<Navigate to="/calendar" replace />} />
                  <Route path="calendar" element={<Calendar />} />
                  <Route path="calendar/:propertyId" element={<Calendar />} />
                  <Route path="seasonal-rates" element={<SeasonalRateManagementPage />} />
                  <Route path="discount-strategies" element={<DiscountStrategies />} />
                  <Route path="lodgify-payload-generator" element={<LodgifyPayloadGeneratorPage />} />
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
      </TooltipProvider>
    </ErrorBoundary>
  )
}

export default App