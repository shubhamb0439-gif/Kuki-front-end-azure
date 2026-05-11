import React, { useState } from 'react';
import { X, Upload, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { createPaymentRequest, PLAN_PRICING, PlanPricing } from '../../lib/paymentHelper';

interface ManualPaymentRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPlan: 'plus' | 'business' | 'premium';
}

export function ManualPaymentRequestModal({
  isOpen,
  onClose,
  selectedPlan
}: ManualPaymentRequestModalProps) {
  const { user } = useAuth();
  const [paymentProof, setPaymentProof] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const planDetails: PlanPricing = PLAN_PRICING[selectedPlan];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      setError('You must be logged in to make a payment request');
      return;
    }

    setLoading(true);
    setError('');

    const result = await createPaymentRequest(
      user.id,
      selectedPlan,
      'manual',
      paymentProof || undefined
    );

    setLoading(false);

    if (result.success) {
      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setPaymentProof('');
      }, 2000);
    } else {
      setError(result.error || 'Failed to submit payment request');
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Request Submitted!</h3>
          <p className="text-gray-600">
            Your payment request has been sent to the admin for approval.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Manual Payment Request</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-2">
            {planDetails.name} Plan
          </h3>
          <p className="text-2xl font-bold text-blue-600 mb-2">
            ${planDetails.price.toFixed(2)}/month
          </p>
          <ul className="space-y-1 text-sm text-gray-700">
            {planDetails.features.map((feature, index) => (
              <li key={index} className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                {feature}
              </li>
            ))}
          </ul>
        </div>

        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h4 className="font-semibold text-gray-900 mb-2">Payment Instructions</h4>
          <ol className="space-y-2 text-sm text-gray-700">
            <li>1. Make payment to admin via your preferred method</li>
            <li>2. Take a screenshot or photo of the payment receipt</li>
            <li>3. Upload the proof below (optional but recommended)</li>
            <li>4. Admin will review and activate your subscription</li>
          </ol>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Proof (Optional)
            </label>
            <div className="relative">
              <Upload className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={paymentProof}
                onChange={(e) => setPaymentProof(e.target.value)}
                placeholder="Paste image URL or transaction ID"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Upload your payment proof to any image hosting service and paste the URL here
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white rounded-lg font-medium transition-colors"
            >
              {loading ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>

        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600 text-center">
            Your request will be reviewed by admin within 24 hours. You'll be notified once approved.
          </p>
        </div>
      </div>
    </div>
  );
}
