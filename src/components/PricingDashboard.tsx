/**
 * PricingDashboard - Main container for pricing management interface
 * Coordinates all pricing components and manages layout
 * Enhanced with preview mode functionality (PRP-14)
 */

import React, { useState, useEffect } from 'react'
import { usePricingContext } from '@/context/PricingContext'
import { useAppContext } from '@/context/AppContext'
import { PricingPreviewProvider, usePricingPreview } from '@/context/PricingPreviewContext'
import { useProperties } from '@/hooks/useProperties'
import PricingCalendarGrid from './PricingCalendarGrid'
import SeasonalRatePanel from './SeasonalRatePanel'
import DiscountStrategyPanel from './DiscountStrategyPanel'
import PriceDetailModal from './PriceDetailModal'
import PreviewControls from './PreviewControls'
import PreviewSummary from './PreviewSummary'
import PricingConfirmationModal from './PricingConfirmationModal'
import type { CalculateFinalPriceReturn } from '@/types/helpers'
import type { CalculateFinalPriceResult } from '@/types/pricing-calendar.types'
import './PricingPreview.css'

/**
 * Dashboard header component for controls and summary
 */
const DashboardHeader: React.FC = () => {
  const { selectedProperty, setSelectedProperty, defaultNights, setDefaultNights, error, clearError } = usePricingContext()
  const { stayLength, setStayLength } = useAppContext()
  const { properties } = useProperties()
  
  useEffect(() => {
    // Sync with app context
    setDefaultNights(stayLength)
  }, [stayLength, setDefaultNights])
  
  const handleNightsChange = (nights: number) => {
    setStayLength(nights)
    setDefaultNights(nights)
  }
  
  const handlePropertyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const propertyId = e.target.value
    const property = properties.find(p => p.lodgify_property_id === propertyId)
    if (property) {
      setSelectedProperty(property)
    }
  }
  
  return (
    <div className="dashboard-header bg-white shadow-sm border-bottom p-3 mb-4">
      <div className="container-fluid">
        <div className="row align-items-center">
          <div className="col-md-4">
            <h2 className="h4 mb-0">
              {selectedProperty ? (
                <>Pricing Dashboard</>
              ) : (
                <>Select a property to manage pricing</>
              )}
            </h2>
          </div>
          <div className="col-md-8">
            <div className="d-flex justify-content-end align-items-center gap-3">
              <div className="d-flex align-items-center gap-2">
                <label htmlFor="property-select" className="mb-0">Property:</label>
                <select
                  id="property-select"
                  className="form-select form-select-sm"
                  value={selectedProperty?.lodgify_property_id || ''}
                  onChange={handlePropertyChange}
                  style={{ width: 'auto' }}
                >
                  <option value="">Choose a property...</option>
                  {properties.map((property) => (
                    <option key={property.lodgify_property_id} value={property.lodgify_property_id}>
                      {property.property_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="d-flex align-items-center gap-2">
                <label htmlFor="nights-select" className="mb-0">Default nights:</label>
                <select
                  id="nights-select"
                  className="form-select form-select-sm"
                  value={defaultNights}
                  onChange={(e) => handleNightsChange(Number(e.target.value))}
                  style={{ width: 'auto' }}
                >
                  {[1, 2, 3, 4, 5, 6, 7, 14, 21, 28].map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
        {error && (
          <div className="alert alert-danger mt-3 mb-0 d-flex justify-content-between align-items-center">
            <span>{error}</span>
            <button 
              type="button" 
              className="btn-close" 
              aria-label="Close"
              onClick={clearError}
            />
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Tab navigation for switching between views
 */
type TabView = 'calendar' | 'seasonal' | 'discounts'

interface TabNavigationProps {
  activeTab: TabView
  onTabChange: (tab: TabView) => void
}

const TabNavigation: React.FC<TabNavigationProps> = ({ activeTab, onTabChange }) => {
  return (
    <ul className="nav nav-tabs mb-4">
      <li className="nav-item">
        <button
          className={`nav-link ${activeTab === 'calendar' ? 'active' : ''}`}
          onClick={() => onTabChange('calendar')}
        >
          Calendar View
        </button>
      </li>
      <li className="nav-item">
        <button
          className={`nav-link ${activeTab === 'seasonal' ? 'active' : ''}`}
          onClick={() => onTabChange('seasonal')}
        >
          Seasonal Rates
        </button>
      </li>
      <li className="nav-item">
        <button
          className={`nav-link ${activeTab === 'discounts' ? 'active' : ''}`}
          onClick={() => onTabChange('discounts')}
        >
          Discount Strategies
        </button>
      </li>
    </ul>
  )
}

/**
 * Inner dashboard component that uses preview context
 */
const PricingDashboardInner: React.FC = () => {
  const { 
    selectedProperty, 
    selectedDateRange: _selectedDateRange, 
    defaultNights,
    loading,
    refreshCalendarData,
    refreshSeasonalRates,
    refreshDiscountStrategies
  } = usePricingContext()
  
  // Preview context must be called at the top level to comply with Rules of Hooks
  const { isPreviewMode, pendingChanges } = usePricingPreview()
  
  const [activeTab, setActiveTab] = useState<TabView>('calendar')
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [priceDetailData, setPriceDetailData] = useState<CalculateFinalPriceReturn | null>(null)
  const [showPriceDetail, setShowPriceDetail] = useState(false)
  
  /**
   * Refresh data when property changes
   */
  useEffect(() => {
    if (selectedProperty) {
      // Refresh all data for the selected property
      Promise.all([
        refreshCalendarData(),
        refreshSeasonalRates(),
        refreshDiscountStrategies()
      ]).catch(err => {
        console.error('Failed to refresh pricing data:', err)
      })
    }
  }, [selectedProperty, refreshCalendarData, refreshSeasonalRates, refreshDiscountStrategies])
  
  /**
   * Handle date click from calendar
   */
  const handleDateClick = (date: Date, priceData: CalculateFinalPriceResult | null) => {
    if (priceData) {
      setSelectedDate(date)
      // Convert to the expected format for PriceDetailModal
      const convertedData: CalculateFinalPriceReturn = {
        base_price: priceData.base_price,
        seasonal_adjustment: priceData.seasonal_adjustment,
        last_minute_discount: priceData.last_minute_discount,
        final_price_per_night: priceData.final_price_per_night,
        total_price: priceData.total_price,
        min_price_enforced: priceData.min_price_enforced
      }
      setPriceDetailData(convertedData)
      setShowPriceDetail(true)
    }
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
            <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
            
            {loading && (
              <div className="text-center p-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <p className="mt-3">Loading pricing data...</p>
              </div>
            )}
            
            {!loading && (
              <div className="tab-content">
                {activeTab === 'calendar' && (
                  <div className="tab-pane active">
                    <PricingCalendarGrid
                      propertyId={selectedProperty.lodgify_property_id}
                      selectedStayLength={defaultNights}
                      onDateClick={handleDateClick}
                      enableInlineEditing={true}
                      onBasePriceChanged={(propertyId, newPrice) => {
                        console.log('Base price changed:', propertyId, newPrice)
                        // Refresh calendar data after base price change
                        refreshCalendarData()
                      }}
                    />
                  </div>
                )}
            
            {activeTab === 'seasonal' && (
              <div className="tab-pane active">
                <SeasonalRatePanel
                  onRateChange={() => refreshCalendarData()}
                />
              </div>
            )}
            
            {activeTab === 'discounts' && (
              <div className="tab-pane active">
                <DiscountStrategyPanel
                  propertyId={selectedProperty.lodgify_property_id}
                  onStrategyChange={() => refreshCalendarData()}
                />
              </div>
            )}
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