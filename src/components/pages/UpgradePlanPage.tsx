import React, { useState } from 'react';
import { X, CreditCard, Zap, Check, ArrowLeft, ExternalLink } from 'lucide-react';
import { profiles, payments } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { formatPlanPrice } from '../../lib/currencyHelper';

interface UpgradePlanPageProps {
  selectedPlan: 'core' | 'pro' | 'pro_plus';
  trialUsed?: boolean;
  detectedCurrency?: string;
  onClose: () => void;
}

export function UpgradePlanPage({ selectedPlan, trialUsed = false, detectedCurrency = 'USD', onClose }: UpgradePlanPageProps) {
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [upgradeError, setUpgradeError] = useState('');

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

  const handleStartTrial = async () => {
    if (!user) return;
    setIsProcessing(true);
    setUpgradeError('');
    try {
      const planLimits: Record<string, number> = { free: 1, core: 3, pro: 6, pro_plus: 12 };
      const { error } = await profiles.update(user.id, {
        subscription_plan: selectedPlan,
        trial_started_at: new Date().toISOString(),
        trial_used: true,
        max_employees: planLimits[selectedPlan] ?? 1
      });
      if (error) throw new Error(error);
      onClose();
      window.location.reload();
    } catch (err) {
      setUpgradeError('Something went wrong. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePayWithPesawise = async () => {
    if (!user) return;
    setIsProcessing(true);
    setUpgradeError('');
    try {
      const { data, error } = await payments.createLink(selectedPlan);
      if (error || !data?.payment_url) throw new Error(error || 'No payment URL returned');
      window.location.href = data.payment_url;
    } catch (err: any) {
      setUpgradeError(err.message || 'Failed to create payment link. Please try again.');
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <h2 className="text-xl font-bold text-gray-900">Upgrade to {plan.name}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="text-center">
            <div className="inline-flex items-baseline gap-1">
              <span className="text-5xl font-bold text-gray-900">{formatPlanPrice(plan.price, detectedCurrency)}</span>
              <span className="text-gray-600">/month</span>
            </div>
            {detectedCurrency !== 'USD' && (
              <p className="text-xs text-gray-400 mt-0.5">≈ ${plan.price.toFixed(2)} USD</p>
            )}
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

          {upgradeError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-600 text-sm text-center">{upgradeError}</p>
            </div>
          )}

          <div className="space-y-3">
            {!trialUsed && (
              <button
                onClick={handleStartTrial}
                disabled={isProcessing}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white py-4 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
              >
                {isProcessing ? 'Processing...' : 'Start Free Trial'}
              </button>
            )}

            <button
              onClick={handlePayWithPesawise}
              disabled={isProcessing}
              className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white py-4 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg"
            >
              {isProcessing ? (
                <span>Redirecting to payment...</span>
              ) : (
                <>
                  <CreditCard className="w-5 h-5" />
                  <span>{trialUsed ? 'Pay & Subscribe' : 'Pay Now'}</span>
                  <ExternalLink className="w-4 h-4 opacity-70" />
                </>
              )}
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
                Your 14-day free trial has been used. Please pay to subscribe or contact admin to request access.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
