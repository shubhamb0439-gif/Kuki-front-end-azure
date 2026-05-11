import React, { useState } from 'react';
import { X, CreditCard, Zap, Check, ArrowLeft } from 'lucide-react';
import { employees, profiles, attendance, wages, messages, admin } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

interface UpgradePlanPageProps {
  selectedPlan: 'core' | 'pro' | 'pro_plus';
  trialUsed?: boolean;
  onClose: () => void;
}

export function UpgradePlanPage({ selectedPlan, trialUsed = false, onClose }: UpgradePlanPageProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [upgradeError, setUpgradeError] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardName, setCardName] = useState('');

  const planDetails = {
    core: {
      name: 'CORE Plan',
      price: 4.95,
      features: [
        'Employees x3',
        'Full/Part-time employees',
        'Employer app',
        'Attendance tracking',
        'Basic reporting',
        'Multiple adverts'
      ]
    },
    pro: {
      name: 'PRO Plan',
      price: 19.95,
      features: [
        'Employees x6',
        'Full/part-time employees',
        'Employer/employee app',
        'Multi-user platform',
        'Standard reporting',
        'Single advert'
      ]
    },
    pro_plus: {
      name: 'PRO PLUS Plan',
      price: 29.95,
      features: [
        'Employees x12',
        'Employees & contractors',
        'Employer/employee app',
        'Shareable multi-user platform',
        'Advanced reporting',
        'No adverts'
      ]
    }
  };

  const plan = planDetails[selectedPlan];

  const handleStartTrial = async (withPayment: boolean) => {
    if (!user) return;

    setIsProcessing(true);

    try {
      const planLimits: Record<string, number> = { free: 1, core: 3, pro: 6, pro_plus: 12 };
      const { data, error } = await profiles.update(user.id, {
        subscription_plan: selectedPlan,
        trial_started_at: new Date().toISOString(),
        trial_used: true,
        max_employees: planLimits[selectedPlan] ?? 1
      });

      if (error) throw new Error(error);

      onClose();
      window.location.reload();
    } catch (error) {
      console.error('Trial activation error:', error);
      setUpgradeError('Something went wrong. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCardNumberChange = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    const formatted = cleaned.replace(/(\d{4})/g, '$1 ').trim();
    setCardNumber(formatted.substring(0, 19));
  };

  const handleExpiryChange = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      setExpiryDate(cleaned.substring(0, 2) + '/' + cleaned.substring(2, 4));
    } else {
      setExpiryDate(cleaned);
    }
  };

  const handleCvvChange = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    setCvv(cleaned.substring(0, 3));
  };

  if (showPaymentForm) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <button
              onClick={() => setShowPaymentForm(false)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="w-6 h-6 text-gray-600" />
            </button>
            <h2 className="text-xl font-bold text-gray-900">Add Payment Method</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-6 h-6 text-gray-600" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-200">
              <p className="text-sm text-gray-700">
                Your card will not be charged during the 14-day free trial. You can cancel anytime.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Card Number
              </label>
              <input
                type="text"
                value={cardNumber}
                onChange={(e) => handleCardNumberChange(e.target.value)}
                placeholder="1234 5678 9012 3456"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expiry Date
                </label>
                <input
                  type="text"
                  value={expiryDate}
                  onChange={(e) => handleExpiryChange(e.target.value)}
                  placeholder="MM/YY"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  CVV
                </label>
                <input
                  type="text"
                  value={cvv}
                  onChange={(e) => handleCvvChange(e.target.value)}
                  placeholder="123"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cardholder Name
              </label>
              <input
                type="text"
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
                placeholder="John Doe"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {upgradeError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-600 text-sm text-center">{upgradeError}</p>
              </div>
            )}

            <button
              onClick={() => handleStartTrial(true)}
              disabled={isProcessing || !cardNumber || !expiryDate || !cvv || !cardName}
              className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white py-4 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isProcessing ? 'Processing...' : trialUsed ? 'Subscribe Now' : 'Start 14-Day Free Trial'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Upgrade to {plan.name}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="text-center">
            <div className="inline-flex items-baseline gap-1">
              <span className="text-5xl font-bold text-gray-900">${plan.price}</span>
              <span className="text-gray-600">/month</span>
            </div>
            {!trialUsed && (
              <p className="mt-2 text-green-600 font-semibold">14 days free trial</p>
            )}
          </div>

          <div className={`rounded-xl p-6 border ${trialUsed ? 'bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200' : 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200'}`}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${trialUsed ? 'bg-blue-500' : 'bg-green-500'}`}>
                {trialUsed ? <CreditCard className="w-6 h-6 text-white" /> : <Zap className="w-6 h-6 text-white" />}
              </div>
              <div>
                {trialUsed ? (
                  <>
                    <h3 className="font-semibold text-gray-900">Subscribe to {plan.name}</h3>
                    <p className="text-sm text-gray-600">Your free trial has already been used</p>
                  </>
                ) : (
                  <>
                    <h3 className="font-semibold text-gray-900">Try it free for 14 days</h3>
                    <p className="text-sm text-gray-600">No charges until trial ends</p>
                  </>
                )}
              </div>
            </div>

            <ul className="space-y-3">
              {plan.features.map((feature, index) => (
                <li key={index} className="flex items-start gap-3">
                  <Check className={`w-5 h-5 flex-shrink-0 mt-0.5 ${trialUsed ? 'text-blue-600' : 'text-green-600'}`} />
                  <span className="text-gray-700">{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-3">
            {upgradeError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-600 text-sm text-center">{upgradeError}</p>
              </div>
            )}

            {!trialUsed && (
              <button
                onClick={() => handleStartTrial(false)}
                disabled={isProcessing}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white py-4 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
              >
                {isProcessing ? 'Processing...' : 'Start Free Trial'}
              </button>
            )}

            <button
              onClick={() => setShowPaymentForm(true)}
              disabled={isProcessing}
              className="w-full bg-white border-2 border-gray-300 hover:border-blue-500 text-gray-900 py-4 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              <CreditCard className="w-5 h-5" />
              {trialUsed ? 'Pay & Subscribe' : 'Add Payment Details'}
            </button>
          </div>

          {!trialUsed && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm text-gray-600">
              <p className="flex items-start gap-2">
                <Check className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                Cancel anytime during the trial
              </p>
              <p className="flex items-start gap-2">
                <Check className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                Auto-downgrade to Free plan after trial
              </p>
              <p className="flex items-start gap-2">
                <Check className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                No credit card required to start
              </p>
            </div>
          )}

          {trialUsed && (
            <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
              <p className="text-sm text-amber-800 text-center">
                Your 14-day free trial has been used. Please add payment details or contact the admin to request access.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
