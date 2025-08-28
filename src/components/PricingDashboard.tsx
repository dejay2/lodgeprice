/**
 * PricingDashboard - Main container for pricing management interface
 * Coordinates all pricing components and manages layout
 */

import React, { useState, useEffect } from 'react'
import { usePricingContext } from '@/context/PricingContext'
import { useAppContext } from '@/context/AppContext'
import PricingCalendarGrid from './PricingCalendarGrid'
import SeasonalRatePanel from './SeasonalRatePanel'
import DiscountStrategyPanel from './DiscountStrategyPanel'
import PriceDetailModal from './PriceDetailModal'
import type { CalculateFinalPriceReturn } from '@/types/helpers'

/**
 * Dashboard header component for controls and summary
 */
const DashboardHeader: React.FC = () => {
  const { selectedProperty, defaultNights, setDefaultNights, error, clearError } = usePricingContext()
  const { stayLength, setStayLength } = useAppContext()
  
  useEffect(() => {
    // Sync with app context
    setDefaultNights(stayLength)
  }, [stayLength, setDefaultNights])
  
  const handleNightsChange = (nights: number) => {
    setStayLength(nights)
    setDefaultNights(nights)
  }
  
  return (
    <div className="dashboard-header bg-white shadow-sm border-bottom p-3 mb-4">
      <div className="container-fluid">
        <div className="row align-items-center">
          <div className="col-md-6">
            <h2 className="h4 mb-0">
              {selectedProperty ? (
                <>Pricing for {selectedProperty.property_name}</>
              ) : (
                <>Select a property to manage pricing</>
              )}
            </h2>
          </div>
          <div className="col-md-6">
            <div className="d-flex justify-content-end align-items-center gap-3">
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
 * Main PricingDashboard component
 */
const PricingDashboard: React.FC = () => {
  const { 
    selectedProperty, 
    selectedDateRange, 
    defaultNights,
    loading,
    refreshCalendarData,
    refreshSeasonalRates,
    refreshDiscountStrategies
  } = usePricingContext()
  
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
  const handleDateClick = (date: Date, priceData: CalculateFinalPriceReturn) => {
    setSelectedDate(date)
    setPriceDetailData(priceData)
    setShowPriceDetail(true)
  }
  
  /**
   * Handle price edit from calendar
   */
  const handlePriceEdit = async (date: Date, newPrice: number) => {
    // This will be handled by the CalendarCell component with optimistic updates
    console.log('Price edit:', date, newPrice)
  }
  
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
    <div className="pricing-dashboard">
      <DashboardHeader />
      
      <div className="container-fluid">
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
                  dateRange={selectedDateRange}
                  nights={defaultNights}
                  onPriceClick={handleDateClick}
                  onPriceEdit={handlePriceEdit}
                  editable={true}
                  highlightDiscounts={true}
                  showSeasonalAdjustments={true}
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
    </div>
  )
}

export default PricingDashboard