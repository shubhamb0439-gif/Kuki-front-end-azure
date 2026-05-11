import React, { useState } from 'react';
import { Building, FileText, CheckCircle, ChevronRight } from 'lucide-react';
import { employees, profiles, attendance, wages, messages, admin } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

export function AccountTypeSelection() {
  const [selectedType, setSelectedType] = useState<'normal' | 'record_holder' | null>(null);
  const [loading, setLoading] = useState(false);
  const { user, refreshUser } = useAuth();

  const handleSelection = async () => {
    if (!selectedType || !user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ account_type: selectedType })
        .eq('id', user.id);

      if (error) throw error;

      await refreshUser();
      window.location.reload();
    } catch (error) {
      console.error('Error updating account type:', error);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-emerald-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Building className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Choose Your Account Type</h1>
          <p className="text-gray-600">Select the type of employer account that best suits your needs</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <button
            onClick={() => setSelectedType('normal')}
            className={`bg-white rounded-2xl p-6 shadow-lg transition-all transform hover:scale-105 ${
              selectedType === 'normal'
                ? 'ring-4 ring-blue-500 border-2 border-blue-500'
                : 'border-2 border-gray-200 hover:border-blue-300'
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-blue-100 rounded-xl">
                <Building className="w-8 h-8 text-blue-600" />
              </div>
              {selectedType === 'normal' && (
                <CheckCircle className="w-8 h-8 text-blue-600" />
              )}
            </div>

            <h3 className="text-2xl font-bold text-gray-900 mb-3">Normal Account</h3>
            <p className="text-gray-600 mb-4">Perfect for managing employees with mutual verification</p>

            <div className="space-y-3 text-left">
              <div className="flex items-start space-x-3">
                <ChevronRight className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-gray-700">Employees scan QR codes to verify transactions</p>
              </div>
              <div className="flex items-start space-x-3">
                <ChevronRight className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-gray-700">Secure two-way verification for wages, loans, and bonuses</p>
              </div>
              <div className="flex items-start space-x-3">
                <ChevronRight className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-gray-700">Employees manage their own profiles</p>
              </div>
              <div className="flex items-start space-x-3">
                <ChevronRight className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-gray-700">Real-time attendance tracking via QR scans</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => setSelectedType('record_holder')}
            className={`bg-white rounded-2xl p-6 shadow-lg transition-all transform hover:scale-105 ${
              selectedType === 'record_holder'
                ? 'ring-4 ring-emerald-500 border-2 border-emerald-500'
                : 'border-2 border-gray-200 hover:border-emerald-300'
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-emerald-100 rounded-xl">
                <FileText className="w-8 h-8 text-emerald-600" />
              </div>
              {selectedType === 'record_holder' && (
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              )}
            </div>

            <h3 className="text-2xl font-bold text-gray-900 mb-3">Record Holder Account</h3>
            <p className="text-gray-600 mb-4">Ideal for manual record keeping without employee interaction</p>

            <div className="space-y-3 text-left">
              <div className="flex items-start space-x-3">
                <ChevronRight className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-gray-700">Create and manage employee accounts yourself</p>
              </div>
              <div className="flex items-start space-x-3">
                <ChevronRight className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-gray-700">No QR code verification required</p>
              </div>
              <div className="flex items-start space-x-3">
                <ChevronRight className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-gray-700">Manually enter attendance, wages, loans, and bonuses</p>
              </div>
              <div className="flex items-start space-x-3">
                <ChevronRight className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-gray-700">Complete control over all employee records</p>
              </div>
            </div>
          </button>
        </div>

        <button
          onClick={handleSelection}
          disabled={!selectedType || loading}
          className="w-full bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 disabled:from-gray-300 disabled:to-gray-400 text-white py-4 px-6 rounded-xl font-semibold text-lg transition-all shadow-lg disabled:cursor-not-allowed"
        >
          {loading ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
              <span>Setting up your account...</span>
            </div>
          ) : (
            'Continue'
          )}
        </button>

        <p className="text-center text-gray-500 text-sm mt-6">
          You can change your account type later in settings
        </p>
      </div>
    </div>
  );
}
