import React, { useState } from 'react';
import { DiscountStrategyForm } from '../components/discount-strategy';
import { useNavigate } from 'react-router-dom';

const DiscountStrategyDemo: React.FC = () => {
  const navigate = useNavigate();
  const [savedStrategyId, setSavedStrategyId] = useState<string | null>(null);

  const handleSave = (strategyId: string) => {
    setSavedStrategyId(strategyId);
    console.log('Strategy saved with ID:', strategyId);
    // Could navigate to strategy list or show success message
  };

  const handleCancel = () => {
    navigate('/');
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Discount Strategy Configuration Demo</h1>
      
      {savedStrategyId && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          Strategy saved successfully! ID: {savedStrategyId}
        </div>
      )}
      
      <DiscountStrategyForm
        onSave={handleSave}
        onCancel={handleCancel}
      />
    </div>
  );
};

export default DiscountStrategyDemo;