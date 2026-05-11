import React, { useState, useEffect } from 'react';
import { X, Crown, Star, Zap, Check, Lock } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { UpgradePlanPage } from '../pages/UpgradePlanPage';
import { Modal } from './Modal';
import { PlanChangeRequestModal } from './PlanChangeRequestModal';
import { employees, profiles, attendance, wages, messages, admin } from '../../lib/api';
import { detectCurrency, formatPlanPrice, getCurrencySymbol } from '../../lib/currencyHelper';

interface SubscriptionModalProps {
  onClose: () => void;
  onSelectPlan?: (tier: 'free' | 'core' | 'pro' | 'pro_plus') => void;
}

export function SubscriptionModal({ onClose, onSelectPlan }: SubscriptionModalProps) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { user } = useAuth();
  const [selectedPlanForUpgrade, setSelectedPlanForUpgrade] = useState<'core' | 'pro' | 'pro_plus' | null>(null);
  const [showChangeRequestModal, setShowChangeRequestModal] = useState(false);
  const [changeRequestData, setChangeRequestData] = useState<{current: string, requested: string} | null>(null);
  const [currentPlan, setCurrentPlan] = useState<string>('free');
  const [hasActivePlan, setHasActivePlan] = useState(false);
  const [trialUsed, setTrialUsed] = useState(false);
  const [detectedCurrency, setDetectedCurrency] = useState<string>('USD');

  useEffect(() => {
    loadUserPlan();
    detectCurrency().then(setDetectedCurrency);
  }, [user]);

  const loadUserPlan = async () => {
    if (!user) return;

    try {
      const { data, error } = await profiles.get(user.id);

      if (!error && data) {
        setCurrentPlan(data.subscription_plan || 'free');
        const hasPlan = data.subscription_plan !== 'free' || data.trial_ends_at !== null;
        setHasActivePlan(hasPlan);
        setTrialUsed(!!data.trial_used);
      }
    } catch (err) {
      console.error('Error loading user plan:', err);
    }
  };

  const plans = [
    {
      tier: 'free' as const,
      name: 'FREE',
      icon: Star,
      color: 'from-gray-400 to-gray-500',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
      textColor: 'text-gray-500',
      iconBg: 'bg-gray-100',
      usdPrice: null,
      period: 'forever',
      features: [
        'Employee x1',
        'Employer app only',
        'Single-user',
        'Basic reporting',
        'No attendance tracking',
        'Multiple adverts'
      ],
      popular: false,
      freeTrialText: '',
      bottomNote: 'Limited features'
    },
    {
      tier: 'core' as const,
      name: 'CORE',
      icon: Zap,
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-300',
      textColor: 'text-green-600',
      iconBg: 'bg-green-100',
      usdPrice: 4.95,
      period: 'per month',
      features: [
        'Employees x3',
        'Full/Part-time employees',
        'Employer app',
        'Attendance tracking',
        'Basic reporting',
        'Multiple adverts'
      ],
      popular: false,
      freeTrialText: '14-day Free trial'
    },
    {
      tier: 'pro' as const,
      name: 'PRO',
      icon: Star,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-600',
      borderColor: 'border-blue-500',
      textColor: 'text-white',
      iconBg: 'bg-white',
      iconColor: 'text-blue-600',
      usdPrice: 19.95,
      period: 'per month',
      features: [
        'Employees x6',
        'Full/part-time employees',
        'Employer/employee app',
        'Multi-user platform',
        'Standard reporting',
        'Single advert'
      ],
      popular: true,
      freeTrialText: '14-day Free trial'
    },
    {
      tier: 'pro_plus' as const,
      name: 'PRO PLUS',
      icon: Crown,
      color: 'from-amber-500 to-orange-500',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-300',
      textColor: 'text-amber-600',
      iconBg: 'bg-amber-100',
      usdPrice: 29.95,
      period: 'per month',
      features: [
        'Employees x12',
        'Employees & contractors',
        'Employer/employee app',
        'Shareable multi-user platform',
        'Advanced reporting',
        'No adverts'
      ],
      popular: false,
      freeTrialText: '14-day Free trial'
    }
  ];

  const handleSelectPlan = (tier: 'free' | 'core' | 'pro' | 'pro_plus') => {
    if (hasActivePlan && tier !== currentPlan) {
      setChangeRequestData({ current: currentPlan, requested: tier });
      setShowChangeRequestModal(true);
      return;
    }

    if (tier === 'free') {
      if (onSelectPlan) {
        onSelectPlan(tier);
      }
      onClose();
    } else {
      setSelectedPlanForUpgrade(tier);
    }
  };

  if (showChangeRequestModal && changeRequestData) {
    return (
      <PlanChangeRequestModal
        currentPlan={changeRequestData.current}
        requestedPlan={changeRequestData.requested}
        onClose={() => {
          setShowChangeRequestModal(false);
          setChangeRequestData(null);
        }}
        onRequestSubmitted={() => {
          setShowChangeRequestModal(false);
          setChangeRequestData(null);
          onClose();
        }}
      />
    );
  }

  if (selectedPlanForUpgrade) {
    return (
      <UpgradePlanPage
        selectedPlan={selectedPlanForUpgrade}
        trialUsed={trialUsed}
        onClose={() => {
          setSelectedPlanForUpgrade(null);
          onClose();
        }}
      />
    );
  }

  return (
    <Modal isOpen={true} onClose={onClose} size="2xl">
      <div className="bg-white rounded-3xl shadow-2xl max-h-[85vh] overflow-y-auto animate-slideUp">
        <div className={`bg-gradient-to-r ${colors.gradient} p-6 relative`}>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-10 h-10 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center transition-all"
          >
            <X className="w-5 h-5 text-white" />
          </button>

          <div className="text-center text-white">
            <h2 className="text-4xl font-bold mb-2">Pricing</h2>
            <p className="text-white/90 text-lg">
              {trialUsed ? 'Choose a plan to unlock premium features' : 'In-app subscription with 14-day free trial'}
            </p>
          </div>
        </div>

        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {plans.map((plan) => {
              const Icon = plan.icon;
              const isPro = plan.tier === 'pro';

              return (
                <div
                  key={plan.tier}
                  className={`relative rounded-3xl border-2 p-6 transition-all hover:shadow-xl ${
                    isPro
                      ? `${plan.bgColor} ${plan.borderColor} text-white`
                      : `bg-white ${plan.borderColor}`
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white text-blue-600 px-4 py-1 rounded-full text-sm font-bold shadow-lg">
                      Most Popular
                    </div>
                  )}

                  <div className={`border-2 ${plan.borderColor} rounded-lg py-2 mb-4`}>
                    <h3 className={`text-xl font-bold text-center ${isPro ? 'text-white' : plan.textColor}`}>
                      {plan.name}
                    </h3>
                  </div>

                  <div className="text-center mb-6">
                    <span className={`text-5xl font-bold ${isPro ? 'text-white' : 'text-blue-600'}`}>
                      {plan.usdPrice === null ? 'FREE' : formatPlanPrice(plan.usdPrice, detectedCurrency)}
                    </span>
                    <div className={`text-sm mt-1 ${isPro ? 'text-white/90' : 'text-blue-600'}`}>
                      {plan.period}
                    </div>
                    {plan.usdPrice !== null && detectedCurrency !== 'USD' && (
                      <div className={`text-xs mt-0.5 ${isPro ? 'text-white/70' : 'text-gray-400'}`}>
                        ≈ ${plan.usdPrice.toFixed(2)} USD
                      </div>
                    )}
                  </div>

                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start space-x-3">
                        <Check className={`w-5 h-5 flex-shrink-0 mt-0.5 ${isPro ? 'text-white' : 'text-blue-600'}`} />
                        <span className={`text-sm ${isPro ? 'text-white' : 'text-gray-700'}`}>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => handleSelectPlan(plan.tier)}
                    disabled={hasActivePlan && plan.tier === currentPlan}
                    className={`w-full py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                      hasActivePlan && plan.tier === currentPlan
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : plan.tier === 'free'
                        ? 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-300'
                        : isPro
                        ? 'bg-white text-blue-600 hover:bg-gray-50 hover:shadow-lg transform hover:scale-105 active:scale-95'
                        : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:shadow-lg transform hover:scale-105 active:scale-95'
                    }`}
                  >
                    {hasActivePlan && plan.tier === currentPlan ? (
                      <>
                        <Lock className="w-4 h-4" />
                        <span>Current Plan</span>
                      </>
                    ) : hasActivePlan && plan.tier !== currentPlan ? (
                      <>
                        <span>Request Change</span>
                      </>
                    ) : (
                      <span>{plan.tier === 'free' ? 'Switch to Free' : `Choose ${plan.name}`}</span>
                    )}
                  </button>

                  {plan.freeTrialText && !trialUsed && (
                    <div className={`text-center mt-3 text-sm font-medium ${isPro ? 'text-white/90' : 'text-blue-600'}`}>
                      {plan.freeTrialText}
                    </div>
                  )}

                  {plan.bottomNote && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-xs text-center text-gray-500">
                        {plan.bottomNote}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="text-center space-y-2">
            <p className="text-gray-600 text-sm">
              10% discount on paid plans for annual payment. Contact us for unlimited employee plan.
            </p>
            {detectedCurrency !== 'USD' && (
              <p className="text-xs text-gray-400">
                Prices shown in {detectedCurrency} ({getCurrencySymbol(detectedCurrency)}) — approximate conversion from USD. Billing in USD.
              </p>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
