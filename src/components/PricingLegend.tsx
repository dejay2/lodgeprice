/**
 * PricingLegend Component
 * Visual legend explaining pricing color codes and indicators
 * As specified in PRP-10 architecture section
 */

import React from 'react'
import type { PricingLegendProps } from '@/types/pricing-calendar.types'

const PricingLegend: React.FC<PricingLegendProps> = ({
  showSeasonalIndicator = true,
  showDiscountIndicator = true,
  showMinPriceIndicator = true,
  className = ''
}) => {
  return (
    <div className={`pricing-legend ${className}`}>
      <div className="legend-title small fw-semibold text-muted mb-2">
        Price Indicators
      </div>
      
      <div className="legend-items d-flex flex-wrap gap-3 small text-muted">
        {showSeasonalIndicator && (
          <div className="legend-item d-flex align-items-center gap-1">
            <span className="indicator-dot seasonal" style={{ color: '#17a2b8' }}>●</span>
            <span>Seasonal adjustment</span>
          </div>
        )}
        
        {showDiscountIndicator && (
          <div className="legend-item d-flex align-items-center gap-1">
            <span className="indicator-symbol discount" style={{ color: '#28a745' }}>%</span>
            <span>Last minute discount</span>
          </div>
        )}
        
        {showMinPriceIndicator && (
          <div className="legend-item d-flex align-items-center gap-1">
            <span className="indicator-text min-price" style={{ 
              fontSize: '0.7rem', 
              fontWeight: 'bold',
              color: '#ffc107'
            }}>MIN</span>
            <span>Minimum price enforced</span>
          </div>
        )}
        
        {/* Additional legend items for understanding */}
        <div className="legend-item d-flex align-items-center gap-1">
          <span className="text-muted">|</span>
          <span>Hover dates for detailed breakdown</span>
        </div>
      </div>
    </div>
  )
}

export default React.memo(PricingLegend)