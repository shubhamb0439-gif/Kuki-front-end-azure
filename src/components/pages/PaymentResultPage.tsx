import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Loader } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export function PaymentResultPage() {
  const { user, refreshUser } = useAuth();
  const [checked, setChecked] = useState(false);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    refreshUser().then(() => setChecked(true));
  }, []);

  useEffect(() => {
    if (checked) {
      setIsActive(user?.subscription_status === 'active');
    }
  }, [checked, user?.subscription_status]);

  const goToDashboard = () => {
    window.location.hash = '';
    window.location.reload();
  };

  const recheck = async () => {
    setChecked(false);
    await refreshUser();
    setChecked(true);
  };

  if (!checked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-cyan-500 to-blue-700 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 text-center">
          <Loader className="w-16 h-16 text-blue-500 animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800">Verifying Payment...</h2>
          <p className="text-gray-500 mt-2 text-sm">Please wait while we confirm your payment.</p>
        </div>
      </div>
    );
  }

  if (isActive) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-400 via-emerald-500 to-green-600 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 text-center">
          <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Payment Successful!</h2>
          <p className="text-gray-600 mb-6">
            Your subscription is now active. Welcome to your new plan!
          </p>
          <button
            onClick={goToDashboard}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white py-4 rounded-xl font-semibold transition-all shadow-lg"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-400 via-orange-400 to-amber-500 flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 text-center">
        <XCircle className="w-20 h-20 text-amber-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Payment Pending</h2>
        <p className="text-gray-600 mb-6">
          Your payment could not be confirmed yet. If you completed the payment, please wait a few minutes and check again. Otherwise, contact support.
        </p>
        <div className="space-y-3">
          <button
            onClick={recheck}
            className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white py-3 rounded-xl font-semibold transition-all"
          >
            Check Again
          </button>
          <button
            onClick={goToDashboard}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold transition-all"
          >
            Return to App
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-4">
          Need help? Contact us at support@kuki.app
        </p>
      </div>
    </div>
  );
}
