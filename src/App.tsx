import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { OnboardingProvider } from './contexts/OnboardingContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import { LoginPage } from './components/auth/LoginPage';
import { SignupPage } from './components/auth/SignupPage';
import { ResetPasswordPage } from './components/auth/ResetPasswordPage';
import { EmployerHome } from './components/employer/EmployerHome';
import { EmployeeHome } from './components/employee/EmployeeHome';
import { BottomNavigation } from './components/navigation/BottomNavigation';
import { SearchPage } from './components/pages/SearchPage';
import { WagesPage } from './components/pages/WagesPage';
import { RatingPage } from './components/pages/RatingPage';
import { CalendarPage } from './components/pages/CalendarPage';
import { EmployeeAttendancePage } from './components/pages/EmployeeAttendancePage';
import { LoadingScreen } from './components/common/LoadingScreen';
import { EditProfilePage } from './components/pages/EditProfilePage';
import { MessagesPage } from './components/pages/MessagesPage';
import { ManageEmployeesPage } from './components/pages/ManageEmployeesPage';
import { ProfessionSelectionPage } from './components/pages/ProfessionSelectionPage';
import { ProfilePhotoUploadPage } from './components/pages/ProfilePhotoUploadPage';
import { LinkedAccountsPage } from './components/pages/LinkedAccountsPage';
import { ReferFriendModal } from './components/common/ReferFriendModal';
import { OrientationLock } from './components/common/OrientationLock';
import { AdPlayer } from './components/common/AdPlayer';
import { OnboardingGuide } from './components/common/OnboardingGuide';
import { AdminDashboard } from './components/pages/AdminDashboard';
import { DesktopEmployerLogin } from './components/pages/DesktopEmployerLogin';
import { DesktopEmployerPage } from './components/pages/DesktopEmployerPage';
import { isLargeScreen } from './lib/deviceHelper';
// supabase removed - using api.ts

function AppContent() {
  const { user, loading, profile, signOut } = useAuth();
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [currentPage, setCurrentPage] = useState('home');
  const [showReferModal, setShowReferModal] = useState(false);
  const [showSignupSuccess, setShowSignupSuccess] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [desktopLoginSuccess, setDesktopLoginSuccess] = useState(false);
  const [showTransitionBlur, setShowTransitionBlur] = useState(false);
  const [showAd, setShowAd] = useState(false);
  const [adShownThisSession, setAdShownThisSession] = useState(false);

  useEffect(() => {
    const checkDevice = () => {
      setIsDesktop(isLargeScreen());
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);

    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  useEffect(() => {
    let wasOffline = false;

    const handleOffline = () => {
      wasOffline = true;
    };

    const handleOnline = () => {
      if (wasOffline) {
        wasOffline = false;
        window.location.reload();
      }
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  React.useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#/', '');
      if (hash) {
        setCurrentPage(hash);
      } else {
        setCurrentPage('home');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateToMessages = React.useCallback(() => {
    setCurrentPage('messages');
    window.location.hash = '#/messages';
  }, []);

  useEffect(() => {
    if (user && profile && profile.ads_enabled && !adShownThisSession) {
      const timer = setTimeout(() => {
        setShowAd(true);
        setAdShownThisSession(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [user, profile, adShownThisSession]);


  if (loading) {
    return <LoadingScreen />;
  }

  // Desktop/Tablet mode - Employer and Admin only
  if (isDesktop) {
    if (!user) {
      return <DesktopEmployerLogin onLoginSuccess={() => setDesktopLoginSuccess(true)} />;
    }

    if (user.role === 'employer') {
      return <DesktopEmployerPage />;
    }

    if (user.role === 'admin') {
      return <AdminDashboard {...{ onReferFriend: () => {}, onMessages: () => {} }} />;
    }

    // If not employer or admin, show error
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-cyan-500 to-blue-700 flex items-center justify-center p-8">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-4">
            <span className="text-4xl">⚠️</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Access Restricted</h2>
          <p className="text-gray-600 mb-6">
            This interface is only available for employers and administrators on large screens.
            Please use the mobile app to access all features.
          </p>
          <button
            onClick={() => signOut()}
            className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    );
  }

  // Mobile mode - Full functionality
  if (!user) {
    // Handle reset-password link before showing login/signup
    const hashPath = window.location.hash.replace('#/', '').split('?')[0];
    const resetToken = new URLSearchParams(window.location.hash.split('?')[1] || '').get('token');
    if (hashPath === 'reset-password' && resetToken) {
      return (
        <ResetPasswordPage
          token={resetToken}
          onDone={() => {
            window.location.hash = '';
            setAuthMode('login');
          }}
        />
      );
    }

    return (
      <div className="min-h-screen relative">
        {authMode === 'login' ? (
          <LoginPage
            onSwitchToSignup={() => {
              setAuthMode('signup');
              setShowSignupSuccess(false);
            }}
            showSuccess={showSignupSuccess}
            onMounted={() => {
              setTimeout(() => setShowTransitionBlur(false), 100);
            }}
          />
        ) : (
          <SignupPage
            onSwitchToLogin={(showSuccess = false) => {
              setShowTransitionBlur(true);
              setTimeout(() => {
                setAuthMode('login');
                setShowSignupSuccess(showSuccess);
              }, 100);
            }}
          />
        )}

        {/* Transition blur overlay */}
        <div
          className={`fixed inset-0 bg-white/50 backdrop-blur-lg pointer-events-none transition-opacity duration-500 z-50 ${
            showTransitionBlur ? 'opacity-100' : 'opacity-0'
          }`}
        />
      </div>
    );
  }

  // Check if user needs to upload profile photo (skip for admin)
  if (!user.profile_photo && user.role !== 'admin') {
    return <ProfilePhotoUploadPage onComplete={() => window.location.reload()} />;
  }

  // Account type selection removed - all features are subscription-based

  // Check if employee needs to select profession
  if (user.role === 'employee' && !user.profession) {
    return <ProfessionSelectionPage onComplete={() => window.location.reload()} />;
  }

  const pageProps = {
    onReferFriend: () => setShowReferModal(true),
    onMessages: navigateToMessages
  };

  const handleNavigate = (page: string) => {
    setCurrentPage(page);
    window.location.hash = page === 'home' ? '' : `#/${page}`;
  };

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'search':
        return <SearchPage {...pageProps} />;
      case 'wages':
        return <WagesPage {...pageProps} />;
      case 'rating':
        return <RatingPage {...pageProps} />;
      case 'calendar':
        return user.role === 'employer' ? <CalendarPage {...pageProps} /> : <EmployeeAttendancePage {...pageProps} />;
      case 'attendance':
        return <EmployeeAttendancePage {...pageProps} />;
      case 'edit-profile':
        return <EditProfilePage {...pageProps} />;
      case 'messages':
        return <MessagesPage {...pageProps} />;
      case 'manage-employees':
        return <ManageEmployeesPage {...pageProps} />;
      case 'linked-accounts':
        return <LinkedAccountsPage />;
      case 'admin':
        return user.role === 'admin' ? <AdminDashboard {...pageProps} /> : <EmployeeHome {...pageProps} />;
      case 'home':
      default:
        if (user.role === 'admin') {
          return <AdminDashboard {...pageProps} />;
        }
        return user.role === 'employer' ? <EmployerHome {...pageProps} /> : <EmployeeHome {...pageProps} />;
    }
  };

  return (
    <OrientationLock>
      <div className="min-h-screen bg-gray-50" style={{ height: 'auto' }}>
        {/* Main Content */}
        <div className="pb-20" style={{ minHeight: '100vh' }}>
          {renderCurrentPage()}
        </div>

        {/* Bottom Navigation */}
        <BottomNavigation
          currentPage={currentPage}
          onNavigate={handleNavigate}
        />

        {/* Onboarding Guide - Shows on first app launch */}
        <OnboardingGuide />

        {/* Refer Friend Modal */}
        {showReferModal && <ReferFriendModal onClose={() => setShowReferModal(false)} />}

        {/* Ad Player - Shows on app launch */}
        {showAd && <AdPlayer onClose={() => setShowAd(false)} />}
      </div>
    </OrientationLock>
  );
}

function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <ThemeProvider>
          <ToastProvider>
            <OnboardingProvider>
              <AppContent />
            </OnboardingProvider>
          </ToastProvider>
        </ThemeProvider>
      </LanguageProvider>
    </AuthProvider>
  );
}

export default App;