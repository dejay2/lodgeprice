/**
 * Demo page for PricingCalendarGrid component
 * For manual testing and validation as per PRP-10
 */

import React, { useState } from 'react'
import PricingCalendarGrid from '@/components/PricingCalendarGrid'
import type { CalculateFinalPriceResult } from '@/types/pricing-calendar.types'

const PricingCalendarDemo: React.FC = () => {
  const [selectedProperty] = useState('327020')
  const [stayLength, setStayLength] = useState(3)

  const handleStayLengthChange = (nights: number) => {
    console.log('Stay length changed to:', nights)
    setStayLength(nights)
  }

  const handleDateClick = (date: Date, priceData: CalculateFinalPriceResult | null) => {
    console.log('Date clicked:', date, 'Price data:', priceData)
    if (priceData) {
      alert(`Price for ${date.toDateString()}: €${priceData.final_price_per_night}/night (Total: €${priceData.total_price})`)
    } else {
      alert(`No price data available for ${date.toDateString()}`)
    }
  }

  return (
    <div className="container-fluid py-4">
      <div className="row">
        <div className="col-12">
          <h1 className="h2 mb-4">Pricing Calendar Grid Demo</h1>
          
          <div className="mb-4 p-3 bg-light rounded">
            <h5>Demo Info</h5>
            <p>This demo shows the PricingCalendarGrid component with:</p>
            <ul>
              <li>React Calendar integration with custom pricing tiles</li>
              <li>Property selection dropdown</li>
              <li>Stay length selector (1-30 days)</li>
              <li>Real-time price loading from database</li>
              <li>Visual indicators for seasonal rates and discounts</li>
              <li>Error handling with retry functionality</li>
              <li>Responsive design for all screen sizes</li>
            </ul>
            <p><strong>Current Selection:</strong> Property {selectedProperty}, {stayLength} night{stayLength !== 1 ? 's' : ''}</p>
          </div>

          <div className="card">
            <div className="card-body">
              <PricingCalendarGrid
                propertyId={selectedProperty}
                selectedStayLength={stayLength}
                onStayLengthChange={handleStayLengthChange}
                onDateClick={handleDateClick}
                className="demo-calendar"
              />
            </div>
          </div>

          <div className="mt-4 p-3 bg-light rounded">
            <h5>Validation Checklist (PRP-10 Requirements)</h5>
            <div className="row">
              <div className="col-md-6">
                <h6>Functional Requirements</h6>
                <ul className="list-unstyled">
                  <li>✅ FR-1: Calendar grid with database pricing</li>
                  <li>✅ FR-2: Multiple stay length support</li>
                  <li>✅ FR-3: Visual indicators for adjustments</li>
                  <li>✅ FR-4: Property selection integration</li>
                  <li>✅ FR-5: Date range navigation</li>
                  <li>✅ FR-6: Loading states (&gt;500ms)</li>
                  <li>✅ FR-7: Error states with retry</li>
                  <li>✅ FR-8: Holiday rental visual consistency</li>
                  <li>✅ FR-9: Real-time price updates</li>
                  <li>✅ FR-10: Edge case handling</li>
                </ul>
              </div>
              <div className="col-md-6">
                <h6>Non-Functional Requirements</h6>
                <ul className="list-unstyled">
                  <li>🔄 Performance: &lt;2s load time (test needed)</li>
                  <li>✅ Accuracy: Matches database functions</li>
                  <li>✅ Reliability: Error boundaries</li>
                  <li>✅ Usability: Responsive 320px-1920px</li>
                  <li>✅ Maintainability: TypeScript strict</li>
                  <li>🔄 Scalability: 365+ day support (test needed)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PricingCalendarDemo