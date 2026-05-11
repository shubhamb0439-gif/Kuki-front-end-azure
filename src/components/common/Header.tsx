import React, { useState } from 'react';
import { MessageSquare, Menu, Users, UserPlus, X, Crown, ArrowUpDown, ArrowDown } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';

interface HeaderProps {
  onReferFriend: () => void;
  onMessages: () => void;
  unreadCount?: number;
  onUpgradePlan?: () => void;
  currentPlan?: 'free' | 'core' | 'pro' | 'pro_plus';
  hideUpgradeAndLinked?: boolean;
}

export function Header({ onReferFriend, onMessages, unreadCount = 0, onUpgradePlan, currentPlan = 'free', hideUpgradeAndLinked = false }: HeaderProps) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [showMenu, setShowMenu] = useState(false);

  const getPlanButtonConfig = () => {
    switch (currentPlan) {
      case 'pro_plus':
        return {
          icon: ArrowUpDown,
          text: 'Manage Plan',
          description: 'View plan options',
          color: 'text-gray-600'
        };
      case 'pro':
        return {
          icon: ArrowUpDown,
          text: 'Manage Plan',
          description: 'View plan options',
          color: 'text-gray-600'
        };
      case 'core':
      case 'free':
      default:
        return {
          icon: Crown,
          text: 'Upgrade Plan',
          description: 'Unlock premium features',
          color: 'text-purple-600'
        };
    }
  };

  const planConfig = getPlanButtonConfig();

  const handleMessagesClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onMessages();
  };

  const handleReferClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowMenu(false);
    onReferFriend();
  };

  const handleLinkedAccountsClick = () => {
    setShowMenu(false);
    window.location.hash = '#/linked-accounts';
  };

  const handleUpgradePlanClick = () => {
    setShowMenu(false);
    if (onUpgradePlan) {
      onUpgradePlan();
    }
  };

  return (
    <header className={`fixed left-0 right-0 ${colors.primary} z-50 shadow-lg animate-slideDown`} style={{ top: '-8px', paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="w-full h-[75px] px-4 flex items-center justify-center">
        <div className="w-full max-w-md flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <img
              src="/logo-kuki.png"
              alt="KUKI"
              className="w-10 h-10 object-contain -mt-2"
            />
            <h1 className="text-xl font-bold text-white">KUKI</h1>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleMessagesClick}
              className="p-2 hover:bg-white/20 rounded-full transition-all duration-200 relative transform hover:scale-110 active:scale-95"
              title="Messages"
            >
              <MessageSquare className="w-5 h-5 text-white" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold text-white animate-pulse-slow">
                  {unreadCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 hover:bg-white/20 rounded-full transition-all duration-200 transform hover:scale-110 active:scale-95"
              title="Menu"
            >
              {showMenu ? <X className="w-5 h-5 text-white" /> : <Menu className="w-5 h-5 text-white" />}
            </button>
          </div>
        </div>
      </div>

      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute right-4 top-[70px] bg-white rounded-2xl shadow-2xl overflow-hidden z-50 w-64 animate-slideDown">
            <div className="py-2">
              {onUpgradePlan && !hideUpgradeAndLinked && (
                <button
                  onClick={handleUpgradePlanClick}
                  className="w-full px-6 py-3 flex items-center gap-3 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-colors text-left border-b border-gray-100"
                >
                  <planConfig.icon className={`w-5 h-5 ${planConfig.color}`} />
                  <div>
                    <p className="font-semibold text-gray-900">{planConfig.text}</p>
                    <p className="text-xs text-gray-600">{planConfig.description}</p>
                  </div>
                </button>
              )}

              {!hideUpgradeAndLinked && (
                <button
                  onClick={handleLinkedAccountsClick}
                  className="w-full px-6 py-3 flex items-center gap-3 hover:bg-blue-50 transition-colors text-left"
                >
                  <Users className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="font-semibold text-gray-900">Linked Accounts</p>
                    <p className="text-xs text-gray-600">Share with family & friends</p>
                  </div>
                </button>
              )}

              <button
                onClick={handleReferClick}
                className="w-full px-6 py-3 flex items-center gap-3 hover:bg-blue-50 transition-colors text-left"
              >
                <UserPlus className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="font-semibold text-gray-900">Refer a Friend</p>
                  <p className="text-xs text-gray-600">Invite someone to KUKI</p>
                </div>
              </button>
            </div>
          </div>
        </>
      )}
    </header>
  );
}
