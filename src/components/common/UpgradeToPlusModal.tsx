import React from 'react';
import { Crown, Check, X, Sparkles } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';

interface UpgradeToPlusModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTier: string;
  currentPlan: string;
}

export function UpgradeToPlusModal({ isOpen, onClose, currentTier, currentPlan }: UpgradeToPlusModalProps) {
  const toast = useToast();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
              <Crown className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Upgrade to Plus Account</h2>
              <p className="text-sm text-gray-600">Unlock premium features and enhanced capabilities</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-1">Why Upgrade to Plus?</h3>
              <p className="text-sm text-blue-700">
                Plus accounts offer the same great features as Core accounts, with enhanced priority support
                and exclusive benefits. Perfect for businesses looking for premium service.
              </p>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <div className="border-2 border-green-200 bg-green-50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <h3 className="font-bold text-green-900">Current: Core Account</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <Check className="w-4 h-4 text-green-600 mt-0.5" />
                <span className="text-gray-700">Record holder account</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="w-4 h-4 text-green-600 mt-0.5" />
                <span className="text-gray-700">Standard support</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="w-4 h-4 text-green-600 mt-0.5" />
                <span className="text-gray-700">Current plan: {currentPlan.toUpperCase()}</span>
              </div>
            </div>
          </div>

          <div className="border-2 border-blue-500 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-4 relative overflow-hidden">
            <div className="absolute top-2 right-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs font-bold px-2 py-1 rounded-full">
              UPGRADE
            </div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
              <h3 className="font-bold text-blue-900">Plus Account</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <Check className="w-4 h-4 text-blue-600 mt-0.5" />
                <span className="text-gray-700">All Core features</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="w-4 h-4 text-blue-600 mt-0.5" />
                <span className="text-gray-700">Priority support</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="w-4 h-4 text-blue-600 mt-0.5" />
                <span className="text-gray-700">Exclusive benefits</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="w-4 h-4 text-blue-600 mt-0.5" />
                <span className="text-gray-700">Enhanced analytics</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-xl p-4 mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">Subscription Plans Comparison</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 font-semibold text-gray-700">Feature</th>
                  <th className="text-center py-2 font-semibold text-orange-600">Bronze</th>
                  <th className="text-center py-2 font-semibold text-gray-600">Silver</th>
                  <th className="text-center py-2 font-semibold text-yellow-600">Gold</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="py-2 text-gray-700">Max Employees</td>
                  <td className="text-center text-gray-900">2</td>
                  <td className="text-center text-gray-900">3</td>
                  <td className="text-center text-gray-900">Unlimited</td>
                </tr>
                <tr>
                  <td className="py-2 text-gray-700">Attendance Tracking</td>
                  <td className="text-center"><X className="w-4 h-4 text-red-500 mx-auto" /></td>
                  <td className="text-center"><Check className="w-4 h-4 text-green-500 mx-auto" /></td>
                  <td className="text-center"><Check className="w-4 h-4 text-green-500 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="py-2 text-gray-700">Full Statements</td>
                  <td className="text-center"><X className="w-4 h-4 text-red-500 mx-auto" /></td>
                  <td className="text-center text-gray-700 text-xs">Yearly only</td>
                  <td className="text-center"><Check className="w-4 h-4 text-green-500 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="py-2 text-gray-700">Price</td>
                  <td className="text-center font-semibold text-green-600">FREE</td>
                  <td className="text-center font-semibold text-blue-600">Paid</td>
                  <td className="text-center font-semibold text-purple-600">Premium</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> To upgrade your account, please contact your administrator or reach out to our support team.
            They will process your upgrade request and provide payment details.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl hover:bg-gray-300 transition-colors font-medium"
          >
            Maybe Later
          </button>
          <button
            onClick={() => {
              toast.showInfo('Contact Administrator', 'Please contact your administrator to upgrade your account.');
              onClose();
            }}
            className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all font-medium shadow-lg"
          >
            Contact Administrator
          </button>
        </div>
      </div>
    </div>
  );
}
