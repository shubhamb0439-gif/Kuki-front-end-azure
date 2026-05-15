import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, CheckCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import LanguageSelector from '../common/LanguageSelector';
import { employees, profiles, attendance, wages, messages, admin, auth as authApi } from '../../lib/api';

interface LoginPageProps {
  onSwitchToSignup: () => void;
  showSuccess?: boolean;
  onMounted?: () => void;
}

export function LoginPage({ onSwitchToSignup, showSuccess = false, onMounted }: LoginPageProps) {
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [displaySuccess, setDisplaySuccess] = useState(showSuccess);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState('');
  const { signIn } = useAuth();
  const { t } = useLanguage();

  useEffect(() => {
    if (onMounted) {
      onMounted();
    }
  }, [onMounted]);

  useEffect(() => {
    if (showSuccess) {
      setDisplaySuccess(true);
      const timer = setTimeout(() => setDisplaySuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showSuccess]);

  const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const friendlyAuthError = (msg: string): string => {
    const m = msg.toLowerCase();
    if (m.includes('invalid login') || m.includes('invalid credentials') || m.includes('invalid email or password') || m.includes('email not confirmed')) {
      return 'Incorrect email or password. Please try again.';
    }
    if (m.includes('user not found') || m.includes('no user found')) {
      return 'No account found with those details. Please sign up first.';
    }
    if (m.includes('too many requests') || m.includes('rate limit')) {
      return 'Too many attempts. Please wait a moment and try again.';
    }
    if (m.includes('network') || m.includes('fetch')) {
      return 'Network error. Please check your connection and try again.';
    }
    if (m.includes('token') || m.includes('otp') || m.includes('expired')) {
      return 'The code is invalid or has expired. Please request a new one.';
    }
    return 'Something went wrong. Please try again.';
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setForgotLoading(true);
    await authApi.forgotPassword(forgotEmail.trim());
    setForgotLoading(false);
    setForgotMessage('If an account exists for that email, a reset link has been sent.');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmed = emailOrPhone.trim();
    if (!trimmed) {
      setError('Please enter your email or phone number');
      return;
    }

    // If it looks like an email attempt (contains @), validate the format
    if (trimmed.includes('@') && !isEmail(trimmed)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);

    try {
      if (emailOrPhone === 'admin@gmail.com' && password === 'Shub@0811') {
        await signIn(emailOrPhone, password);
      } else {
        await signIn(emailOrPhone, password);
      }
    } catch (err: any) {
      setError(friendlyAuthError(err.message || ''));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-emerald-50 flex items-center justify-center p-4 animate-fadeIn">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {displaySuccess && (
            <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-center space-x-3 animate-fadeIn">
              <CheckCircle className="w-6 h-6 text-emerald-500 flex-shrink-0" />
              <p className="text-emerald-700 font-medium">Account created successfully! Please log in.</p>
            </div>
          )}

          <div className="text-center mb-6">
            <img
              src="/logo-kuki.png"
              alt="KUKI"
              className="w-24 h-24 mx-auto mb-4 object-contain"
            />
            <h1 className="text-3xl font-bold text-gray-900">KUKI</h1>
            <p className="text-gray-600">{t('auth.login')}</p>
          </div>

          <div className="mb-6">
            <LanguageSelector />
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('auth.email')} / {t('auth.phone')}
                </label>
                <input
                  type="text"
                  value={emailOrPhone}
                  onChange={(e) => setEmailOrPhone(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder={`${t('auth.email')} / ${t('auth.phone')}`}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('auth.password')}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder={t('auth.password')}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="text-right">
                <button
                  type="button"
                  onClick={() => { setShowForgot(true); setForgotMessage(''); setError(''); }}
                  className="text-sm text-blue-500 hover:text-blue-700"
                >
                  Forgot password?
                </button>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  t('auth.loginButton')
                )}
              </button>
            </form>

            {/* Forgot Password Modal */}
            {showForgot && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
                  <h2 className="text-lg font-bold text-gray-900 mb-2">Reset Password</h2>
                  <p className="text-sm text-gray-600 mb-4">Enter your email address and we'll send you a reset link.</p>
                  {forgotMessage ? (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-4">
                      <p className="text-emerald-700 text-sm">{forgotMessage}</p>
                    </div>
                  ) : (
                    <form onSubmit={handleForgotPassword} className="space-y-4">
                      <input
                        type="email"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="your@email.com"
                        required
                      />
                      <button
                        type="submit"
                        disabled={forgotLoading}
                        className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center"
                      >
                        {forgotLoading ? (
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : 'Send Reset Link'}
                      </button>
                    </form>
                  )}
                  <button
                    onClick={() => { setShowForgot(false); setForgotEmail(''); setForgotMessage(''); }}
                    className="w-full mt-3 text-gray-500 hover:text-gray-700 text-sm py-2"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

          <div className="mt-8 pt-6 border-t border-gray-200 text-center">
            <p className="text-gray-600 mb-4">{t('auth.noAccount')}</p>
            <button
              onClick={onSwitchToSignup}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3 px-4 rounded-lg font-medium transition-colors"
            >
              {t('auth.signup')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
