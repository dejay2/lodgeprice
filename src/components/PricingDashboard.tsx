/**
 * PricingDashboard - Main container for pricing management interface
 * Coordinates all pricing components and manages layout
 * Enhanced with preview mode functionality (PRP-14)
 */

import React, { useState, useEffect } from 'react'
import { usePricingContext } from '@/context/PricingContext'
import { useAppContext } from '@/context/AppContext'
import { PricingPreviewProvider, usePricingPreview } from '@/context/PricingPreviewContext'
import PricingCalendarGrid from './PricingCalendarGrid'
import UnifiedPropertyControls from './unified-property-controls/UnifiedPropertyControls'
// Removed unused imports after calendar simplification
// import SeasonalRatePanel from './SeasonalRatePanel'
// import DiscountStrategyPanel from './DiscountStrategyPanel'
import PriceDetailModal from './PriceDetailModal'
import OverridePriceModal from './OverridePriceModal'
import PreviewControls from './PreviewControls'
import PreviewSummary from './PreviewSummary'
import PricingConfirmationModal from './PricingConfirmationModal'
import type { CalculateFinalPriceReturn } from '@/types/helpers'
import type { CalculateFinalPriceResult } from '@/types/pricing-calendar.types'
import type { Property } from '@/types/database'
import type { PriceOverride } from './OverridePriceModal.types'
import './PricingPreview.css'

/**
 * Dashboard header component with integrated unified property controls
 * Modified for Task 54: Integrates unified property controls section
 * Maintains existing functionality while eliminating redundant interfaces
 */
interface DashboardHeaderProps {
  className?: string
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({ className = '' }) => {
  const { setSelectedProperty, defaultNights, setDefaultNights, error, clearError } = usePricingContext()
  const { stayLength, setStayLength } = useAppContext()
  
  useEffect(() => {
    // Sync with app context
    setDefaultNights(stayLength)
  }, [stayLength, setDefaultNights])
  
  const handleNightsChange = (nights: number) => {
    setStayLength(nights)
    setDefaultNights(nights)
  }

  const handlePropertyChange = (property: Property | null) => {
    if (property) {
      setSelectedProperty(property)
    }
  }
  
  return (
    <div className={`dashboard-header bg-white shadow-sm border-bottom p-4 mb-4 ${className}`} data-testid="pricing-dashboard">
      <div className="container-fluid">
        {/* Unified Property Controls Section - Replaces title and integrates all property controls */}
        <div className="row mb-3">
          <div className="col-12">
            <UnifiedPropertyControls 
              onPropertyChange={handlePropertyChange}
              className="property-controls-section"
            />
          </div>
        </div>
        
        {/* Header Controls Section - Stay Length Only */}
        <div className="row align-items-center">
          <div className="col-md-6">
            <div className="d-flex align-items-center gap-3">
              <div className="d-flex align-items-center gap-2">
                <label htmlFor="nights-select" className="mb-0">Default nights:</label>
                <select
                  id="nights-select"
                  className="form-select form-select-sm"
                  value={defaultNights}
                  onChange={(e) => handleNightsChange(Number(e.target.value))}
                  style={{ width: 'auto' }}
                  data-testid="stay-length-selector"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 14, 21, 28].map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
        
        {/* Error Display Section */}
        {error && (
          <div className="alert alert-danger mt-3 mb-0 d-flex justify-content-between align-items-center" role="alert">
            <span>{error}</span>
            <button 
              type="button" 
              className="btn-close" 
              aria-label="Close error message"
              onClick={clearError}
            />
          </div>
        )}
      </div>
    </div>
  )
}

// Tab navigation removed - Calendar simplification (Tasks #034-036)

/**
 * Inner dashboard component that uses preview context
 */
const PricingDashboardInner: React.FC = () => {
  const { 
    selectedProperty, 
    selectedDateRange: _selectedDateRange, 
    defaultNights,
    loading,
    refreshCalendarData
  } = usePricingContext()
  
  // Preview context must be called at the top level to comply with Rules of Hooks
  const { isPreviewMode, pendingChanges } = usePricingPreview()
  
  // Tab state removed - Calendar simplification (Tasks #034-036)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [priceDetailData, setPriceDetailData] = useState<CalculateFinalPriceReturn | null>(null)
  const [showPriceDetail, setShowPriceDetail] = useState(false)
  
  // Override Price Modal state
  const [showOverrideModal, setShowOverrideModal] = useState(false)
  const [existingOverride, setExistingOverride] = useState<PriceOverride | null>(null)
  
  /**
   * Refresh data when property changes
   */
  useEffect(() => {
    if (selectedProperty) {
      // Refresh calendar data for the selected property
      refreshCalendarData().catch(err => {
        console.error('Failed to refresh pricing data:', err)
      })
    }
  }, [selectedProperty, refreshCalendarData])
  
  /**
   * Handle date click from calendar
   */
  const handleDateClick = (date: Date, priceData: CalculateFinalPriceResult | null) => {
    if (priceData && selectedProperty) {
      setSelectedDate(date)
      // Convert to the expected format for PriceDetailModal
      const convertedData: CalculateFinalPriceReturn = {
        property_id: selectedProperty.lodgify_property_id,
        property_name: selectedProperty.property_name,
        check_date: date.toISOString().split('T')[0],
        nights: defaultNights,
        base_price_per_night: priceData.base_price,
        seasonal_adjustment: priceData.seasonal_adjustment,
        seasonal_rate: 0, // Not available in CalculateFinalPriceResult
        adjusted_price_per_night: priceData.base_price + priceData.seasonal_adjustment,
        last_minute_discount: priceData.last_minute_discount,
        discounted_price_per_night: priceData.base_price + priceData.seasonal_adjustment - priceData.last_minute_discount,
        final_price_per_night: priceData.final_price_per_night,
        total_price: priceData.total_price,
        min_price_per_night: priceData.base_price, // Assuming base price is minimum
        savings_amount: priceData.last_minute_discount,
        savings_percentage: priceData.base_price > 0 ? (priceData.last_minute_discount / priceData.base_price) * 100 : 0,
        has_seasonal_rate: Math.abs(priceData.seasonal_adjustment) > 0.01,
        has_last_minute_discount: priceData.last_minute_discount > 0.01,
        at_minimum_price: priceData.min_price_enforced,
        is_overridden: priceData.is_override || false,
        // Add required compatibility fields
        base_price: priceData.base_price,
        min_price_enforced: priceData.min_price_enforced
      }
      setPriceDetailData(convertedData)
      setShowPriceDetail(true)
    }
  }

  /**
   * Open override modal for the currently selected date
   */
  const handleOpenOverrideModal = () => {
    if (selectedDate && priceDetailData) {
      // Close detail modal first
      setShowPriceDetail(false)
      
      // Check if there's an existing override for this date
      // For now, we'll set it to null and let the service handle it
      setExistingOverride(null)
      setShowOverrideModal(true)
    }
  }

  /**
   * Handle successful override creation/update
   */
  const handleOverrideSet = (_override: PriceOverride) => {
    // Refresh calendar data to show the new override
    refreshCalendarData().catch(err => {
      console.error('Failed to refresh calendar after override set:', err)
    })
    
    // Close override modal
    setShowOverrideModal(false)
    setSelectedDate(null)
    setPriceDetailData(null)
  }

  /**
   * Handle override removal
   */
  const handleOverrideRemoved = (_dateString: string) => {
    // Refresh calendar data to remove the override
    refreshCalendarData().catch(err => {
      console.error('Failed to refresh calendar after override removed:', err)
    })
    
    // Close override modal
    setShowOverrideModal(false)
    setSelectedDate(null)
    setPriceDetailData(null)
  }
  
  /**
   * Handle price edit from calendar
   */
  // const _handlePriceEdit = async (date: Date, newPrice: number) => {
  //   // This will be handled by the CalendarCell component with optimistic updates
  //   console.log('Price edit:', date, newPrice)
  // }
  
  /**
   * Close price detail modal
   */
  const handleClosePriceDetail = () => {
    setShowPriceDetail(false)
    setSelectedDate(null)
    setPriceDetailData(null)
  }

  /**
   * Close override modal
   */
  const handleCloseOverrideModal = () => {
    setShowOverrideModal(false)
    setExistingOverride(null)
    // Keep selected date and price data in case user wants to reopen
  }
  
  if (!selectedProperty) {
    return (
      <div className="pricing-dashboard">
        <DashboardHeader />
        <div className="container-fluid">
          <div className="alert alert-info">
            <h5 className="alert-heading">No Property Selected</h5>
            <p className="mb-0">
              Please select a property from the dropdown above to view and manage pricing.
            </p>
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className={`pricing-dashboard ${isPreviewMode ? 'pricing-dashboard--preview-mode' : ''}`}>
      <DashboardHeader />
      
      {/* Preview Controls Bar - Always show, but style differently based on mode */}
      <div className={`preview-controls-bar ${isPreviewMode ? 'bg-warning bg-opacity-10 border-bottom border-warning' : 'bg-light border-bottom'} p-3`}>
        <div className="container-fluid">
          <PreviewControls className="mb-0" />
        </div>
      </div>
      
      <div className="container-fluid">
        <div className="row">
          <div className={isPreviewMode && pendingChanges.length > 0 ? 'col-lg-9' : 'col-12'}>
            {/* Tab navigation removed - Calendar simplification */}
            
            {loading && (
              <div className="text-center p-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <p className="mt-3">Loading pricing data...</p>
              </div>
            )}
            
            {!loading && (
              <div>
                {/* Calendar View Only - Simplified Interface */}
                <PricingCalendarGrid
                  propertyId={selectedProperty.lodgify_property_id}
                  selectedStayLength={defaultNights}
                  onDateClick={handleDateClick}
                />
              </div>
            )}
          </div>
          
          {/* Preview Summary Sidebar */}
          {isPreviewMode && pendingChanges.length > 0 && (
            <div className="col-lg-3">
              <div className="sticky-top" style={{ top: '1rem' }}>
                <PreviewSummary className="mt-4" />
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Price Detail Modal */}
      {selectedDate && priceDetailData && (
        <PriceDetailModal
          propertyId={selectedProperty.lodgify_property_id}
          checkDate={selectedDate}
          nights={defaultNights}
          isOpen={showPriceDetail}
          onClose={handleClosePriceDetail}
          priceData={priceDetailData}
          onOverridePrice={handleOpenOverrideModal}
        />
      )}

      {/* Override Price Modal */}
      {selectedDate && priceDetailData && (
        <OverridePriceModal
          isOpen={showOverrideModal}
          onClose={handleCloseOverrideModal}
          propertyId={selectedProperty.lodgify_property_id}
          date={selectedDate}
          currentPrice={priceDetailData}
          existingOverride={existingOverride}
          onOverrideSet={handleOverrideSet}
          onOverrideRemoved={handleOverrideRemoved}
        />
      )}
      
      {/* Pricing Confirmation Modal */}
      <PricingConfirmationModal 
        propertyName={selectedProperty.property_name}
      />
    </div>
  )
}

/**
 * Main PricingDashboard component with preview provider
 */
const PricingDashboard: React.FC = () => {
  return (
    <PricingPreviewProvider>
      <PricingDashboardInner />
    </PricingPreviewProvider>
  )
}

export default PricingDashboard