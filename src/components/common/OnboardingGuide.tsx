import React, { useState } from 'react';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';

export function OnboardingGuide() {
  const { showOnboarding, completeOnboarding } = useOnboarding();
  const { t } = useLanguage();
  const { user } = useAuth();
  const [currentPage, setCurrentPage] = useState(0);

  if (!showOnboarding) return null;

  const guidePages = [
    {
      title: 'Welcome to KUKI',
      content: 'KUKI is your complete employee management system. Track wages, attendance, loans, and more all in one place with advanced features.',
      features: [
        'Real-time wage tracking with payment details',
        'QR code attendance & payment system',
        'Loan management with automated deductions',
        'Performance ratings & reviews',
        'Email & SMS notifications',
        'Premium subscription plans with trial'
      ]
    },
    {
      title: 'Getting Started',
      content: 'Sign up with email or phone number and start managing your workforce.',
      features: [
        'Email or phone registration',
        'SMS verification for security',
        'Choose employee or employer account',
        'Set up your profile with photo',
        'Select your profession',
        'Start with a 7-day free trial'
      ]
    },
    {
      title: 'Home Dashboard',
      content: 'Your home screen shows your current status and quick actions.',
      features: [
        'View your current balance',
        'See recent transactions',
        'Quick access to scan QR codes',
        'Check upcoming payments',
        'Watch ads to earn rewards (Free plan)',
        'Access premium features with subscriptions'
      ]
    },
    {
      title: 'QR Scanner & Payments',
      content: 'Scan QR codes to perform various actions instantly with detailed payment tracking.',
      features: [
        'Clock in/out for attendance',
        'Receive wage payments with receipts',
        'Get loan advances instantly',
        'Record bonuses and deductions',
        'Track login/logout times',
        'View payment details and history'
      ]
    },
    {
      title: 'Employment Types',
      content: 'Support for different employment types with flexible wage calculations.',
      features: [
        'Full-time employees with monthly wages',
        'Part-time workers with hourly rates',
        'Contract workers with project payments',
        'Automated wage calculations',
        'Custom working hours per day',
        'Flexible working days per month'
      ]
    },
    {
      title: 'Calendar & Attendance',
      content: 'Track your work schedule and attendance history with detailed insights.',
      features: [
        'View monthly attendance calendar',
        'See total work hours logged',
        'Track present/absent/leave days',
        'Export attendance reports',
        'View detailed login/logout times',
        'Automatic monthly hours calculation'
      ]
    },
    {
      title: 'Messages & Notifications',
      content: 'Receive important notifications via email, SMS, and in-app messages.',
      features: [
        'Wage statements via email',
        'SMS notifications for payments',
        'Loan and bonus notifications',
        'Performance review alerts',
        'System announcements',
        'Download PDF statements'
      ]
    },
    {
      title: 'Premium Plans & Trial',
      content: 'Upgrade to unlock advanced features and remove ads. Start with a 14-day free trial!',
      features: [
        'FREE: 1 employee, basic features with ads',
        'CORE Plan ($4.95/mo): 3 employees, attendance',
        'PRO Plan ($19.95/mo): 6 employees, multi-user',
        'PRO PLUS ($29.95/mo): 12 employees, no ads',
        '14-day free trial on all paid plans',
        'Cancel anytime, no commitment'
      ]
    },
    {
      title: 'Account Linking & Referrals',
      content: 'Link multiple accounts together and invite friends to earn rewards.',
      features: [
        'Link employee and employer accounts',
        'Switch between accounts instantly',
        'Share data across linked accounts',
        'Invite friends via QR or SMS',
        'Earn referral rewards',
        'Manage all accounts in one place'
      ]
    },
    {
      title: 'Refer a Friend',
      content: 'Grow the KUKI community and earn rewards by referring friends.',
      features: [
        'Generate unique referral QR codes',
        'Share referral links via SMS',
        'Track your referrals',
        'Earn rewards for each referral',
        'Help friends get started',
        'Build your network'
      ]
    },
    {
      title: 'Profile & Settings',
      content: 'Manage your account, preferences, and subscription.',
      features: [
        'Update profile photo',
        'Change language (English/አማርኛ)',
        'View employment details',
        'Rate employers/employees',
        'Manage subscription plan',
        'Control ad and notification preferences'
      ]
    }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-95 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl h-full max-h-[95vh] bg-white rounded-2xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-2">
            <img
              src="/logo-kuki.png"
              alt="KUKI"
              className="h-8"
            />
            <h1 className="text-lg font-bold text-gray-900">Beginner's Guide</h1>
          </div>
          <button
            onClick={completeOnboarding}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
            <div className="mx-auto">
              <div className="mb-4">
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  {guidePages[currentPage].title}
                </h2>
                <p className="text-sm text-gray-600">
                  {guidePages[currentPage].content}
                </p>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-200">
                <h3 className="text-base font-semibold text-gray-900 mb-3">Key Features:</h3>
                <div className="space-y-2">
                  {guidePages[currentPage].features.map((feature, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-2 bg-white rounded-lg p-3 shadow-sm"
                    >
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-white font-bold text-xs">{index + 1}</span>
                      </div>
                      <span className="text-sm text-gray-700 leading-relaxed">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pro Tips for each page */}
              {currentPage === 0 && (
                <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-xl p-3">
                  <h4 className="font-semibold text-gray-900 mb-1 text-sm">Pro Tip</h4>
                  <p className="text-gray-700 text-xs leading-relaxed">
                    Scroll vertically through this guide to explore all features. You can always access this guide later from your profile settings.
                  </p>
                </div>
              )}

              {currentPage === 1 && (
                <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-3">
                  <h4 className="font-semibold text-gray-900 mb-1 text-sm">SMS Verification</h4>
                  <p className="text-gray-700 text-xs leading-relaxed">
                    Phone registration includes SMS verification for added security. You'll receive a code to verify your number before accessing your account.
                  </p>
                </div>
              )}

              {currentPage === 2 && (
                <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-3">
                  <h4 className="font-semibold text-gray-900 mb-1 text-sm">Pro Tip</h4>
                  <p className="text-gray-700 text-xs leading-relaxed">
                    Watch ads to earn rewards on the Free plan, or upgrade to Plus/Business/Premium to remove all ads permanently.
                  </p>
                </div>
              )}

              {currentPage === 3 && (
                <div className="mt-4 bg-green-50 border border-green-200 rounded-xl p-3">
                  <h4 className="font-semibold text-gray-900 mb-1 text-sm">Payment Details</h4>
                  <p className="text-gray-700 text-xs leading-relaxed">
                    Every payment includes detailed information: amount, date, currency, and type. You'll receive instant notifications via SMS and email.
                  </p>
                </div>
              )}

              {currentPage === 4 && (
                <div className="mt-4 bg-cyan-50 border border-cyan-200 rounded-xl p-3">
                  <h4 className="font-semibold text-gray-900 mb-1 text-sm">Employment Types</h4>
                  <p className="text-gray-700 text-xs leading-relaxed">
                    Different employment types have different payment structures. Part-time workers are paid based on hours worked, while contract workers receive project-based payments.
                  </p>
                </div>
              )}

              {currentPage === 5 && (
                <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-3">
                  <h4 className="font-semibold text-gray-900 mb-1 text-sm">Attendance Tracking</h4>
                  <p className="text-gray-700 text-xs leading-relaxed">
                    Your attendance is automatically tracked with every QR scan. View detailed reports and export them for your records.
                  </p>
                </div>
              )}

              {currentPage === 6 && (
                <div className="mt-4 bg-green-50 border border-green-200 rounded-xl p-3">
                  <h4 className="font-semibold text-gray-900 mb-1 text-sm">Email & SMS Notifications</h4>
                  <p className="text-gray-700 text-xs leading-relaxed">
                    You can email your wage statements directly to yourself! Generate a statement and click the email button to receive it in your inbox. SMS notifications keep you updated on payments.
                  </p>
                </div>
              )}

              {currentPage === 7 && (
                <div className="mt-4 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-300 rounded-xl p-3">
                  <h4 className="font-semibold text-gray-900 mb-1 text-sm">Free Trial</h4>
                  <div className="space-y-1 text-gray-700 text-xs leading-relaxed">
                    <p><strong>Try before you buy!</strong> All paid plans come with a 14-day free trial.</p>
                    <p><strong>FREE:</strong> 1 employee, basic features with ads</p>
                    <p><strong>CORE ($4.95/month):</strong> 3 employees, attendance tracking</p>
                    <p><strong>PRO ($19.95/month):</strong> 6 employees, multi-user platform</p>
                    <p><strong>PRO PLUS ($29.95/month):</strong> 12 employees, no ads, shareable</p>
                  </div>
                </div>
              )}

              {currentPage === 8 && (
                <div className="mt-4 bg-cyan-50 border border-cyan-200 rounded-xl p-3">
                  <h4 className="font-semibold text-gray-900 mb-1 text-sm">Account Linking</h4>
                  <p className="text-gray-700 text-xs leading-relaxed">
                    Link your employee and employer accounts to switch seamlessly between them. Share data across linked accounts for better management.
                  </p>
                </div>
              )}

              {currentPage === 9 && (
                <div className="mt-4 bg-pink-50 border border-pink-200 rounded-xl p-3">
                  <h4 className="font-semibold text-gray-900 mb-1 text-sm">Referral Rewards</h4>
                  <p className="text-gray-700 text-xs leading-relaxed">
                    Invite friends and earn rewards when they join KUKI! Share your unique QR code or send referral links via SMS. The more friends you refer, the more you earn!
                  </p>
                </div>
              )}

              {currentPage === 10 && (
                <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-3">
                  <h4 className="font-semibold text-gray-900 mb-1 text-sm">Settings</h4>
                  <p className="text-gray-700 text-xs leading-relaxed">
                    Customize your experience! Change language, manage your subscription, and control your preferences all from your profile page.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Footer Navigation */}
          <div className="border-t border-gray-200 p-3 flex-shrink-0">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1">
                {guidePages.map((_, index) => (
                  <div
                    key={index}
                    className={`h-1.5 rounded-full transition-all ${
                      index === currentPage
                        ? 'w-6 bg-blue-500'
                        : 'w-1.5 bg-gray-300'
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs text-gray-500">
                {currentPage + 1} / {guidePages.length}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {currentPage > 0 && (
                <button
                  onClick={() => setCurrentPage(prev => prev - 1)}
                  className="flex items-center gap-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium transition-colors text-sm flex-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>
              )}

              {currentPage < guidePages.length - 1 ? (
                <button
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  className="flex items-center justify-center gap-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors text-sm flex-1"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={completeOnboarding}
                  className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors text-sm flex-1"
                >
                  Get Started
                </button>
              )}
            </div>
          </div>
      </div>
    </div>
  );
}
