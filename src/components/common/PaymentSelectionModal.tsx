import React, { useState } from 'react';
import { X, CreditCard, FileText, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { PLAN_PRICING, createPaymentRequest, getUserPaymentRequests, PaymentRequest } from '../../lib/paymentHelper';
import { ManualPaymentRequestModal } from './ManualPaymentRequestModal';

interface PaymentSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPlan: 'plus' | 'business' | 'premium';
}

export function PaymentSelectionModal({
  isOpen,
  onClose,
  selectedPlan
}: PaymentSelectionModalProps) {
  const { user } = useAuth();
  const toast = useToast();
  const [paymentMethod, setPaymentMethod] = useState<'paisa_waise' | 'razorpay' | 'manual' | null>(null);
  const [showManualModal, setShowManualModal] = useState(false);
  const [existingRequests, setExistingRequests] = useState<PaymentRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  React.useEffect(() => {
    if (isOpen && user) {
      loadExistingRequests();
    }
  }, [isOpen, user]);

  const loadExistingRequests = async () => {
    if (!user) return;
    setLoadingRequests(true);
    const result = await getUserPaymentRequests(user.id);
    if (result.success && result.data) {
      setExistingRequests(result.data.filter(req => req.status === 'pending'));
    }
    setLoadingRequests(false);
  };

  if (!isOpen) return null;

  const planDetails = PLAN_PRICING[selectedPlan];

  const handlePaymentMethodSelect = (method: 'paisa_waise' | 'razorpay' | 'manual') => {
    setPaymentMethod(method);

    if (method === 'manual') {
      setShowManualModal(true);
    } else {
      // Handle online payment gateways
      toast.showInfo('Coming Soon', `${method === 'paisa_waise' ? 'Paisa Waise' : 'Razorpay'} integration coming soon!`);
    }
  };

  const handleManualModalClose = () => {
    setShowManualModal(false);
    setPaymentMethod(null);
    loadExistingRequests(); // Reload to show new request
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'approved':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'rejected':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Select Payment Method</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Plan Summary */}
          <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-1">
              {planDetails.name} Plan
            </h3>
            <p className="text-3xl font-bold text-blue-600 mb-3">
              ${planDetails.price.toFixed(2)}
              <span className="text-sm font-normal text-gray-600">/month</span>
            </p>
            <div className="grid grid-cols-2 gap-2">
              {planDetails.features.slice(0, 4).map((feature, index) => (
                <div key={index} className="flex items-center gap-2 text-sm text-gray-700">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  {feature}
                </div>
              ))}
            </div>
          </div>

          {/* Existing Pending Requests */}
          {existingRequests.length > 0 && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-2 mb-3">
                <Clock className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-yellow-900 mb-1">Pending Requests</h4>
                  <p className="text-sm text-yellow-700">
                    You have {existingRequests.length} payment request(s) awaiting admin approval.
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                {existingRequests.map(req => (
                  <div key={req.id} className="bg-white p-3 rounded-lg border border-yellow-200">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900">{PLAN_PRICING[req.plan].name}</p>
                        <p className="text-sm text-gray-600">
                          ${req.amount.toFixed(2)} · {req.payment_method.replace('_', ' ')}
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full border ${getStatusColor(req.status)}`}>
                        {req.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payment Methods */}
          <div className="space-y-3 mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">Choose Payment Method</h3>

            {/* Online Payment Gateways */}
            <button
              onClick={() => handlePaymentMethodSelect('razorpay')}
              className="w-full p-4 border-2 border-gray-200 hover:border-blue-500 rounded-lg transition-colors text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                  <CreditCard className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">Razorpay</h4>
                  <p className="text-sm text-gray-600">Pay instantly with cards, UPI, wallets</p>
                </div>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Instant</span>
              </div>
            </button>

            <button
              onClick={() => handlePaymentMethodSelect('paisa_waise')}
              className="w-full p-4 border-2 border-gray-200 hover:border-purple-500 rounded-lg transition-colors text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                  <CreditCard className="w-6 h-6 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">Paisa Waise</h4>
                  <p className="text-sm text-gray-600">Secure payment gateway</p>
                </div>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Instant</span>
              </div>
            </button>

            {/* Manual Payment */}
            <button
              onClick={() => handlePaymentMethodSelect('manual')}
              className="w-full p-4 border-2 border-gray-200 hover:border-orange-500 rounded-lg transition-colors text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center group-hover:bg-orange-200 transition-colors">
                  <FileText className="w-6 h-6 text-orange-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">Manual Payment</h4>
                  <p className="text-sm text-gray-600">Pay admin directly, submit proof for approval</p>
                </div>
                <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">24-48h</span>
              </div>
            </button>
          </div>

          {/* Info Note */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600 text-center">
              All payments are secure and encrypted. Your subscription will be activated immediately for online payments,
              or within 24-48 hours for manual payments after admin approval.
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-full mt-4 px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Manual Payment Modal */}
      <ManualPaymentRequestModal
        isOpen={showManualModal}
        onClose={handleManualModalClose}
        selectedPlan={selectedPlan}
      />
    </>
  );
}
