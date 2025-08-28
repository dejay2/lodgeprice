import React from 'react';
import Select, { SingleValue } from 'react-select';
import { Property } from '../../types/database.types';
import './DiscountPropertySelector.css';

interface PropertyOption {
  value: string | null;
  label: string;
  property?: Property;
  isGlobal?: boolean;
  description?: string;
}

interface DiscountPropertySelectorProps {
  value: string | null;
  onChange: (value: string | null) => void;
  properties: Property[];
  loading?: boolean;
  error?: string | null;
  placeholder?: string;
  isDisabled?: boolean;
}

const DiscountPropertySelector: React.FC<DiscountPropertySelectorProps> = ({
  value,
  onChange,
  properties,
  loading = false,
  error = null,
  placeholder = "Select property or create global template...",
  isDisabled = false
}) => {
  // Create options with global template option first
  const options: PropertyOption[] = [
    {
      value: null,
      label: '🌍 Global Template (All Properties)',
      isGlobal: true,
      description: 'Apply to all properties'
    },
    ...properties.map(property => ({
      value: property.id,
      label: property.property_name,
      property,
      isGlobal: false,
      description: `Base: £${property.base_price_per_day}/night • Min: £${property.min_price_per_day}/night`
    }))
  ];

  // Find selected option
  const selectedOption = options.find(opt => opt.value === value) || null;

  const handleChange = (newValue: SingleValue<PropertyOption>) => {
    onChange(newValue?.value ?? null);
  };

  // Custom option label with additional info
  const formatOptionLabel = (option: PropertyOption) => (
    <div className="property-option">
      <div className="property-option-main">
        {option.label}
      </div>
      {option.description && (
        <div className="property-option-description">
          {option.description}
        </div>
      )}
    </div>
  );

  // Custom styles for react-select
  const customStyles = {
    control: (base: any, state: any) => ({
      ...base,
      borderColor: state.isFocused ? '#80bdff' : error ? '#dc3545' : '#ced4da',
      boxShadow: state.isFocused 
        ? '0 0 0 0.2rem rgba(0, 123, 255, 0.25)'
        : error 
        ? '0 0 0 0.2rem rgba(220, 53, 69, 0.25)'
        : 'none',
      '&:hover': {
        borderColor: state.isFocused ? '#80bdff' : '#adb5bd'
      }
    }),
    option: (base: any, state: any) => ({
      ...base,
      backgroundColor: state.isSelected 
        ? '#007bff'
        : state.isFocused 
        ? '#f8f9fa' 
        : 'white',
      color: state.isSelected ? 'white' : '#212529',
      padding: '8px 12px',
      cursor: 'pointer',
      '&:active': {
        backgroundColor: '#007bff',
        color: 'white'
      }
    }),
    menu: (base: any) => ({
      ...base,
      zIndex: 9999
    }),
    menuPortal: (base: any) => ({
      ...base,
      zIndex: 9999
    })
  };

  // Group options
  const groupedOptions = [
    {
      label: 'Template Options',
      options: options.filter(opt => opt.isGlobal)
    },
    {
      label: 'Individual Properties',
      options: options.filter(opt => !opt.isGlobal)
    }
  ];

  if (loading) {
    return (
      <div className="property-selector-loading">
        <div className="loading-spinner"></div>
        <span>Loading properties...</span>
      </div>
    );
  }

  return (
    <div className="discount-property-selector">
      <Select
        value={selectedOption}
        onChange={handleChange}
        options={groupedOptions}
        placeholder={placeholder}
        isSearchable
        isClearable
        isDisabled={isDisabled || loading}
        formatOptionLabel={formatOptionLabel}
        styles={customStyles}
        menuPortalTarget={document.body}
        menuPosition="fixed"
        classNamePrefix="property-select"
        noOptionsMessage={() => "No properties found"}
      />
      
      {error && (
        <div className="property-selector-error">
          {error}
        </div>
      )}
      
      {selectedOption && (
        <div className="property-selector-info">
          {selectedOption.isGlobal ? (
            <div className="info-badge info-badge-global">
              This strategy will be a template that can be applied to all properties
            </div>
          ) : (
            <div className="info-badge info-badge-property">
              This strategy will apply only to {selectedOption.label}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DiscountPropertySelector;