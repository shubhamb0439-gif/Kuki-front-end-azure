import React from 'react';
import { Search, DollarSign, Star, Calendar, Cookie, Home, Shield } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';

interface BottomNavigationProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export function BottomNavigation({ currentPage, onNavigate }: BottomNavigationProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { colors } = useTheme();

  const getNavItems = () => {
    if (user?.role === 'admin') {
      return [
        {
          id: 'search',
          icon: Search,
          label: t('nav.search'),
        },
        {
          id: 'wages',
          icon: DollarSign,
          label: t('employees.wages'),
        },
        {
          id: 'home',
          icon: Cookie,
          label: 'Admin',
        },
        {
          id: 'rating',
          icon: Star,
          label: t('employees.performance'),
        },
        {
          id: 'calendar',
          icon: Calendar,
          label: t('nav.calendar'),
        },
      ];
    }

    return [
      {
        id: 'search',
        icon: Search,
        label: t('nav.search'),
      },
      {
        id: 'wages',
        icon: DollarSign,
        label: t('employees.wages'),
      },
      {
        id: 'home',
        icon: Cookie,
        label: t('nav.home'),
      },
      {
        id: 'rating',
        icon: Star,
        label: t('employees.performance'),
      },
      {
        id: 'calendar',
        icon: Calendar,
        label: t('nav.calendar'),
      },
    ];
  };

  const navItems = getNavItems();

  return (
    <div className={`fixed bottom-0 left-0 right-0 ${colors.primary} px-4 pb-safe z-50 shadow-2xl animate-slideUp`}>
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-around py-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            const isHome = item.id === 'home';

            if (isHome) {
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className="flex flex-col items-center transition-all duration-200 transform hover:scale-110 active:scale-95"
                  style={{ marginBottom: '0.25rem' }}
                >
                  <img
                    src="/logo-kuki.png"
                    alt="Home"
                    className={`w-16 h-16 rounded-full transition-all duration-200 ${isActive ? 'ring-4 ring-white/50 shadow-xl' : ''}`}
                  />
                </button>
              );
            }

            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`flex flex-col items-center justify-center transition-all duration-200 transform hover:scale-110 active:scale-95 ${isActive ? 'text-white' : 'text-white/70'}`}
              >
                <Icon className={`w-7 h-7 transition-all duration-200 ${isActive ? 'drop-shadow-lg' : ''}`} />
                {isActive && (
                  <div className="w-1.5 h-1.5 bg-white rounded-full mt-1 animate-pulse" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}