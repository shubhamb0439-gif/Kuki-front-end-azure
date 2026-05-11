import React, { useState } from 'react';
import { X, Send, UserPlus, Mail } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

interface ReferFriendModalProps {
  onClose: () => void;
}

export function ReferFriendModal({ onClose }: ReferFriendModalProps) {
  const { user } = useAuth();
  const { showSuccess, showError, showInfo } = useToast();
  const contactMethod = 'email';
  const [contactValue, setContactValue] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !contactValue) return;

    setLoading(true);
    try {
      const appUrl = window.location.origin;
      const appName = 'KUKI';
      const description = `${user.name} has invited you to join ${appName}!\n\n${appName} is a comprehensive employee-employer management platform that helps businesses manage wages, attendance, performance reviews, and more.\n\nKey Features:\n- Seamless wage management and payment tracking\n- QR-based attendance and transaction systems\n- Performance ratings and reviews\n- Job postings and applications\n- Real-time messaging and notifications\n\nJoin ${appName} today and experience efficient workforce management!`;

      if (contactMethod === 'email') {
        // Call edge function to send email
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-referral`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'email',
            to: contactValue,
            from: user.name,
            fromUserId: user.id,
            appUrl,
            description,
            credentials: {
              sendgridApiKey: import.meta.env.VITE_SENDGRID_API_KEY,
              twilioFromEmail: import.meta.env.VITE_TWILIO_FROM_EMAIL
            }
          })
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to send email');
        }

        const referralLink = result.referralLink || `${appUrl}#/signup?ref=${result.referralCode}`;

        if (result.info) {
          showInfo(
            `Referral invitation prepared for ${contactValue}!`,
            `${result.info}\n\nReferral Link: ${referralLink}`,
            8000
          );
        } else {
          showSuccess(
            `Email sent successfully to ${contactValue}!`,
            `A beautiful invitation email has been sent with your referral link. When they sign up using the link, they'll be automatically linked to your account!`,
            8000
          );
        }
      } else {
        // Call edge function to send SMS
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-referral`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'sms',
            to: contactValue,
            from: user.name,
            fromUserId: user.id,
            appUrl,
            description,
            credentials: {
              twilioAccountSid: import.meta.env.VITE_TWILIO_ACCOUNT_SID,
              twilioAuthToken: import.meta.env.VITE_TWILIO_AUTH_TOKEN,
              twilioPhoneNumber: import.meta.env.VITE_TWILIO_PHONE_NUMBER
            }
          })
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to send SMS');
        }

        const referralLink = result.referralLink || `${appUrl}#/signup?ref=${result.referralCode}`;

        if (result.info) {
          showInfo(
            `Referral invitation prepared for ${contactValue}!`,
            `${result.info}\n\nReferral Link: ${referralLink}`,
            8000
          );
        } else {
          showSuccess(
            `SMS sent successfully to ${contactValue}!`,
            `A text message has been sent with your referral link. When they sign up using the link, they'll be automatically linked to your account!`,
            8000
          );
        }
      }

      onClose();
    } catch (error: any) {
      showError('Error sending referral', error.message);
    } finally {
      setLoading(false);
    }
  };

  const isValidContact = () => {
    if (contactMethod === 'email') {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactValue);
    } else {
      return /^\+?[\d\s-()]+$/.test(contactValue) && contactValue.replace(/\D/g, '').length >= 10;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md transform transition-all animate-slideUp">
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                <UserPlus className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">Refer a Friend</h2>
                <p className="text-sm text-gray-500">Invite someone to join KUKI</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Mail className="w-5 h-5 text-gray-400" />
              </div>
              <input
                type="email"
                value={contactValue}
                onChange={(e) => setContactValue(e.target.value)}
                placeholder="friend@example.com"
                required
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all duration-200"
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Enter the email address of the person you want to invite
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-sm text-blue-800 font-medium mb-2">What they'll receive:</p>
            <p className="text-xs text-blue-700">
              A personalized invitation from you with information about KUKI and a link to get started.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-all duration-200 transform hover:scale-105 active:scale-95"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !contactValue || !isValidContact()}
              className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold hover:from-blue-600 hover:to-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Send
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
