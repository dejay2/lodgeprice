/**
 * PriceDetailModal - Detailed price breakdown modal
 * Shows comprehensive pricing information for a specific date
 */

import React, { useEffect } from 'react'
import { PricingFormatters } from '@/types/pricing'
import { usePricingContext } from '@/context/PricingContext'
import type { CalculateFinalPriceReturn } from '@/types/helpers'

interface PriceDetailModalProps {
  propertyId: string
  checkDate: Date
  nights: number
  isOpen: boolean
  onClose: () => void
  priceData?: CalculateFinalPriceReturn
  onConfirm?: (priceData: CalculateFinalPriceReturn) => void
}

/**
 * Price breakdown row component
 */
interface PriceBreakdownRowProps {
  label: string
  value: number
  isSubtotal?: boolean
  isTotal?: boolean
  isDiscount?: boolean
  isAdjustment?: boolean
  showCurrency?: boolean
}

const PriceBreakdownRow: React.FC<PriceBreakdownRowProps> = ({
  label,
  value,
  isSubtotal = false,
  isTotal = false,
  isDiscount = false,
  isAdjustment = false,
  showCurrency = true
}) => {
  const formattedValue = showCurrency 
    ? PricingFormatters.currency(Math.abs(value))
    : PricingFormatters.percentage(Math.abs(value))
  
  const getValueClass = () => {
    if (isTotal) return 'fw-bold text-primary'
    if (isSubtotal) return 'fw-semibold'
    if (isDiscount && value > 0) return 'text-success'
    if (isAdjustment) return value > 0 ? 'text-danger' : 'text-success'
    return ''
  }
  
  return (
    <tr className={isTotal ? 'border-top' : ''}>
      <td className={isTotal ? 'fw-bold' : ''}>{label}</td>
      <td className={`text-end ${getValueClass()}`}>
        {(isDiscount || (isAdjustment && value < 0)) && value !== 0 && '-'}
        {(isAdjustment && value > 0) && '+'}
        {formattedValue}
      </td>
    </tr>
  )
}

/**
 * Main PriceDetailModal component
 */
const PriceDetailModal: React.FC<PriceDetailModalProps> = ({
  propertyId,
  checkDate,
  nights,
  isOpen,
  onClose,
  priceData,
  onConfirm
}) => {
  // Get toggle states from context (FR-8)
  const { toggles } = usePricingContext()
  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])
  
  if (!isOpen || !priceData) return null
  
  const dateString = checkDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
  
  // FR-8: Price detail modal reflects current toggle settings
  const hasSeasonalAdjustment = toggles.seasonalRatesEnabled && priceData.seasonal_adjustment !== 0
  const hasDiscount = toggles.discountStrategiesEnabled && priceData.last_minute_discount > 0
  const isMinPriceEnforced = priceData.min_price_enforced
  
  // Calculate percentage changes
  const seasonalPercentage = hasSeasonalAdjustment
    ? priceData.seasonal_adjustment / priceData.base_price
    : 0
    
  const discountPercentage = hasDiscount
    ? priceData.last_minute_discount / priceData.base_price
    : 0
  
  return (
    <>
      {/* Modal backdrop */}
      <div 
        className="modal-backdrop show"
        onClick={onClose}
        style={{ zIndex: 1040 }}
      />
      
      {/* Modal */}
      <div 
        className="modal show d-block"
        tabIndex={-1}
        style={{ zIndex: 1050 }}
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Price Breakdown</h5>
              <button 
                type="button" 
                className="btn-close"
                onClick={onClose}
                aria-label="Close"
              />
            </div>
            
            <div className="modal-body">
              <div className="mb-3">
                <h6 className="text-muted">Date</h6>
                <p className="mb-0">{dateString}</p>
              </div>
              
              <div className="mb-3">
                <h6 className="text-muted">Stay Details</h6>
                <p className="mb-0">{nights} night{nights !== 1 ? 's' : ''}</p>
              </div>
              
              <div className="pricing-breakdown">
                <h6 className="text-muted mb-3">Pricing Calculation</h6>
                
                <table className="table table-sm">
                  <tbody>
                    <PriceBreakdownRow 
                      label="Base price per night"
                      value={priceData.base_price}
                    />
                    
                    {hasSeasonalAdjustment && (
                      <>
                        <PriceBreakdownRow
                          label={`Seasonal adjustment (${Math.abs(seasonalPercentage * 100).toFixed(0)}%)`}
                          value={priceData.seasonal_adjustment}
                          isAdjustment={true}
                        />
                        <PriceBreakdownRow
                          label="Price after seasonal adjustment"
                          value={priceData.base_price + priceData.seasonal_adjustment}
                          isSubtotal={true}
                        />
                      </>
                    )}
                    
                    {hasDiscount && (
                      <>
                        <PriceBreakdownRow
                          label={`Last-minute discount (${Math.abs(discountPercentage * 100).toFixed(0)}%)`}
                          value={priceData.last_minute_discount}
                          isDiscount={true}
                        />
                        <PriceBreakdownRow
                          label="Price after discount"
                          value={priceData.final_price_per_night}
                          isSubtotal={true}
                        />
                      </>
                    )}
                    
                    <PriceBreakdownRow
                      label="Final price per night"
                      value={priceData.final_price_per_night}
                      isTotal={!nights || nights === 1}
                    />
                    
                    {nights > 1 && (
                      <>
                        <PriceBreakdownRow
                          label={`× ${nights} nights`}
                          value={priceData.final_price_per_night * nights}
                          isSubtotal={true}
                        />
                        <PriceBreakdownRow
                          label="Total price"
                          value={priceData.total_price}
                          isTotal={true}
                        />
                      </>
                    )}
                  </tbody>
                </table>
                
                {isMinPriceEnforced && (
                  <div className="alert alert-warning mb-0">
                    <small>
                      <strong>Note:</strong> Minimum price enforced. The calculated price was adjusted to meet the property's minimum price requirement.
                    </small>
                  </div>
                )}
              </div>
              
              {/* Additional information */}
              <div className="mt-3 text-muted small">
                <p className="mb-1">
                  <strong>Property ID:</strong> {propertyId}
                </p>
                {/* Show toggle states */}
                <p className="mb-1">
                  <strong>Seasonal Rates:</strong> {toggles.seasonalRatesEnabled ? 'Enabled' : 'Disabled'}
                  {hasSeasonalAdjustment && ' (Active)'}
                </p>
                <p className="mb-1">
                  <strong>Discount Strategies:</strong> {toggles.discountStrategiesEnabled ? 'Enabled' : 'Disabled'}
                  {hasDiscount && ' (Active)'}
                </p>
              </div>
            </div>
            
            <div className="modal-footer">
              {onConfirm && (
                <button 
                  type="button" 
                  className="btn btn-primary"
                  onClick={() => onConfirm(priceData)}
                >
                  Confirm
                </button>
              )}
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={onClose}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default PriceDetailModal