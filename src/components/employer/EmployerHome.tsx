import React, { useState, useEffect, useRef, useMemo } from 'react';
import { CreditCard as Edit, CreditCard, Plus, QrCode, Users, DollarSign, CheckCircle, Crown, AlertCircle, UserPlus, User, Lock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import { employees as employeesApi, profiles, attendance, wages, messages, admin, qrTransactions } from '../../lib/api';
import { Employee } from '../../types/auth';
import { Header } from '../common/Header';
import { ProfileWithStatusRing } from '../common/ProfileWithStatusRing';
import { AdPlayer } from '../common/AdPlayer';
import { EmployeeProfileModal } from './EmployeeProfileModal';
import { EmployeeCard } from './EmployeeCard';
import { ManualEmployeeAdd } from './ManualEmployeeAdd';
import { ManualAttendanceEntry } from './ManualAttendanceEntry';
import { getEmployerOwnStatus, getBatchEmployeeStatusForEmployer } from '../../lib/statusRingHelper';
import { useSwipeGesture } from '../../hooks/useSwipeGesture';
import { EmployerHomeSkeletonLoader } from '../common/SkeletonLoader';
import { SubscriptionModal } from '../common/SubscriptionModal';
import { canAddMoreEmployees, getPlanDisplayName, getTierDisplayName, getPlanBadgeColor, canUseContractEmployment } from '../../lib/subscriptionHelper';
import { Modal } from '../common/Modal';

interface EmployerHomeProps {
  onReferFriend: () => void;
  onMessages: () => void;
}

export function EmployerHome({ onReferFriend, onMessages }: EmployerHomeProps) {
  const { user, signOut } = useAuth();
  const { colors } = useTheme();
  const { showSuccess, showError, showInfo } = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showQRCode, setShowQRCode] = useState(false);
  const [showQROptions, setShowQROptions] = useState(false);
  const [qrTransactionType, setQrTransactionType] = useState<'add_employee' | 'pay_wages' | 'settle_loan' | 'mark_attendance'>('add_employee');
  const [showEmploymentTypeModal, setShowEmploymentTypeModal] = useState(false);
  const [selectedEmploymentType, setSelectedEmploymentType] = useState<'full_time' | 'part_time' | 'contract'>('full_time');
  const [showPartTimeConfig, setShowPartTimeConfig] = useState(false);
  const [partTimeConfig, setPartTimeConfig] = useState({ workingHoursPerDay: 8, workingDaysPerMonth: 22 });
  const [showEmployeeSelection, setShowEmployeeSelection] = useState(false);
  const [selectedQREmployee, setSelectedQREmployee] = useState<Employee | null>(null);
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [qrCodeValue, setQrCodeValue] = useState('');
  const [currentTransactionId, setCurrentTransactionId] = useState<string | null>(null);
  const currentTransactionIdRef = useRef<string | null>(null);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [employerStatus, setEmployerStatus] = useState<{showRing: boolean; color: string; text: string}>({ showRing: false, color: '', text: '' });
  const [employeeStatuses, setEmployeeStatuses] = useState<Record<string, {showRing: boolean; color: string; text: string}>>({});
  const [employerRating, setEmployerRating] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [showManualEmployeeAdd, setShowManualEmployeeAdd] = useState(false);
  const [showManualAttendance, setShowManualAttendance] = useState(false);
  const [showRecordHolderOptions, setShowRecordHolderOptions] = useState(false);
  const [showAddEmployeeOptions, setShowAddEmployeeOptions] = useState(false);
  const [adsEnabled, setAdsEnabled] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showLimitReachedModal, setShowLimitReachedModal] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<'free' | 'core' | 'pro' | 'pro_plus'>('free');

  useSwipeGesture({
    onSwipeLeft: () => {
      window.location.hash = '#/messages';
    }
  });

  const handleEditProfile = () => {
    window.location.hash = '#/edit-profile';
  };

  useEffect(() => {
    if (user) {
      // Load fresh data immediately
      Promise.all([
        fetchEmployees(),
        fetchUnreadMessages(),
        loadEmployerStatus(),
        loadAdsStatus()
      ]).then(() => {
        setIsLoading(false);
        setInitialLoadComplete(true);
      }).catch(() => {
        setIsLoading(false);
        setInitialLoadComplete(true);
      });

      const cleanupEmployees = subscribeToEmployees();
      const cleanupProfiles = subscribeToProfiles();
      const cleanupJobPostings = subscribeToJobPostings();
      const cleanupJobApplications = subscribeToJobApplications();
      const cleanupQRTransactions = subscribeToQRTransactions();

      return () => {
        if (cleanupEmployees) cleanupEmployees();
        if (cleanupProfiles) cleanupProfiles();
        if (cleanupJobPostings) cleanupJobPostings();
        if (cleanupJobApplications) cleanupJobApplications();
        if (cleanupQRTransactions) cleanupQRTransactions();
      };
    }
  }, [user]);

  const subscribeToQRTransactions = () => {
    if (!user) return;
    return () => {};
  };

  // Memoize employee user IDs to prevent re-computing on every render
  const employeeUserIds = useMemo(() => {
    return employees
      .filter(emp => emp.user_id)
      .map(emp => emp.user_id as string);
  }, [employees]);

  useEffect(() => {
    if (employeeUserIds.length > 0) {
      loadEmployeeStatuses();
    }
  }, [employeeUserIds]);

  const fetchUnreadMessages = async () => {
    if (!user) return;
    const { data } = await messages.list();
    const unread = (data || []).filter((m: any) => !m.is_read);
    setUnreadMessages(unread.length);
  };

  const loadAdsStatus = async () => {
    if (!user) return;

    const { data } = await profiles.get(user.id);

    if (data) {
      setAdsEnabled(data.ads_enabled || false);
      setCurrentPlan(data.subscription_plan || 'free');
    }
  };

  const fetchEmployees = async () => {
    if (!user) return;

    const { data, error } = await employeesApi.list();

    if (error) {
      console.error('Error fetching employees:', error);
      return;
    }

    if (!data) return;

    const formattedEmployees = data.map((emp: any) => ({
      id: emp.id,
      user_id: emp.user_id,
      employer_id: emp.employer_id,
      employee_has_app: emp.employee_has_app,
      name: emp.name || emp.email || emp.phone || 'Unknown',
      email: emp.email,
      phone: emp.phone,
      profile_photo: emp.photo_url || emp.profile_photo,
      job_status: emp.job_status,
      show_status_ring: emp.show_status_ring,
      profession: emp.profession,
      employment_type: emp.employment_type,
      status: emp.status,
      created_at: emp.created_at
    }));

    setEmployees(formattedEmployees);
  };

  const subscribeToEmployees = () => {
    if (!user) return;
    return () => {};
  };

  const subscribeToProfiles = () => {
    if (!user) return;
    return () => {};
  };

  const subscribeToJobPostings = () => {
    if (!user) return;
    return () => {};
  };

  const subscribeToJobApplications = () => {
    if (!user) return;
    return () => {};
  };

  const loadEmployerStatus = async () => {
    if (!user) return;
    const status = await getEmployerOwnStatus(user.id);
    setEmployerStatus(status);

    const { data: ratings } = await admin.ratings.listByEmployer(user.id);
    if (ratings && ratings.length > 0) {
      const avgRating = ratings.reduce((sum: number, r: any) => sum + r.rating, 0) / ratings.length;
      setEmployerRating(Math.round(avgRating));
    } else {
      setEmployerRating(5);
    }
  };

  const loadEmployeeStatuses = async () => {
    if (employees.length === 0) return;

    // Get all user IDs
    const userIds = employees
      .filter(emp => emp.user_id)
      .map(emp => emp.user_id as string);

    if (userIds.length === 0) return;

    // Batch load all statuses in just 2 queries instead of N queries
    const statusesByUserId = await getBatchEmployeeStatusForEmployer(userIds);

    // Map back to employee IDs
    const statuses: Record<string, {showRing: boolean; color: string; text: string}> = {};
    employees.forEach(employee => {
      if (employee.user_id && statusesByUserId[employee.user_id]) {
        statuses[employee.id] = statusesByUserId[employee.user_id];
      }
    });

    setEmployeeStatuses(statuses);
  };

  const generateQRCode = () => {
    if (user?.account_type === 'record_holder') {
      setShowRecordHolderOptions(true);
    } else {
      setShowQROptions(true);
    }
  };

  const handleAddEmployeeClick = () => {
    const maxEmployees = user?.max_employees || 1;
    const canAdd = canAddMoreEmployees(employees.length, maxEmployees);

    if (!canAdd) {
      setShowLimitReachedModal(true);
      return;
    }

    const plan = user?.subscription_plan || 'free';

    // FREE and CORE plans go directly to manual entry
    // PRO and PRO PLUS get options modal (Manual or QR Scan)
    if (plan === 'free' || plan === 'core') {
      setShowManualEmployeeAdd(true);
    } else {
      setShowAddEmployeeOptions(true);
    }
  };

  const handleEmploymentTypeSelected = (type: 'full_time' | 'part_time' | 'contract') => {
    const plan = user?.subscription_plan || 'free';

    // Block contract type for non-pro_plus plans
    if (type === 'contract' && !canUseContractEmployment(plan)) {
      setShowEmploymentTypeModal(false);
      setShowSubscriptionModal(true);
      return;
    }

    setSelectedEmploymentType(type);
    setShowEmploymentTypeModal(false);

    if (type === 'part_time') {
      setShowPartTimeConfig(true);
    } else {
      generateAddEmployeeQR(type);
    }
  };

  const handlePartTimeConfigSubmit = () => {
    setShowPartTimeConfig(false);
    generateAddEmployeeQR('part_time');
  };

  const generateAddEmployeeQR = (employmentType: 'full_time' | 'part_time' | 'contract') => {
    if (!user) return;
    let code = '';
    if (employmentType === 'part_time') {
      const configData = encodeURIComponent(JSON.stringify(partTimeConfig));
      code = `employer:${user.id}:${user.email}:${employmentType}:${configData}`;
    } else {
      code = `employer:${user.id}:${user.email}:${employmentType}`;
    }
    setQrCodeValue(code);
    setQrTransactionType('add_employee');
    setShowQRCode(true);
  };

  const handleQROption = (type: 'pay_wages' | 'mark_attendance') => {
    if (!user) return;
    setQrTransactionType(type);
    setShowQROptions(false);

    if (type === 'mark_attendance') {
      // Universal attendance - no employee selection needed
      createUniversalAttendanceQR();
    } else {
      // For pay_wages - select employee first
      setShowEmployeeSelection(true);
    }
  };

  const handleEmployeeSelected = (employee: Employee) => {
    setSelectedQREmployee(employee);
    setShowEmployeeSelection(false);
    createQRTransaction(qrTransactionType as 'pay_wages' | 'settle_loan' | 'mark_attendance', employee.id);
  };

  const createUniversalAttendanceQR = async () => {
    if (!user) return;

    const qrCode = crypto.randomUUID();

    const { data, error } = await qrTransactions.create({
      employee_id: null,
      transaction_type: 'attendance',
      amount: 0,
      status: 'pending',
      qr_code: qrCode,
      metadata: { employer_id: user.id, type: 'universal_attendance' }
    });

    if (!error && data) {
      setCurrentTransactionId(data.id);
      currentTransactionIdRef.current = data.id;
      setQrCodeValue(qrCode);
      setShowQRCode(true);
    } else {
      showError('QR Code Error', error || 'Failed to create QR code');
    }
  };

  const createQRTransaction = async (type: 'pay_wages', employeeId: string) => {
    if (!user) return;

    const qrCode = crypto.randomUUID();

    const { data, error } = await qrTransactions.create({
      employee_id: employeeId,
      transaction_type: 'wage_payment',
      amount: 0,
      status: 'pending',
      qr_code: qrCode,
      metadata: { employer_id: user.id }
    });

    if (!error && data) {
      setCurrentTransactionId(data.id);
      currentTransactionIdRef.current = data.id;
      setQrCodeValue(qrCode);
      setShowQRCode(true);
    } else {
      showError('QR Code Error', error || 'Failed to create QR code');
    }
  };

  const handleEmployeeClick = (employee: Employee) => {
    setSelectedEmployee(employee);
    setShowEmployeeModal(true);
  };

  const ProfilePhoto = ({ name, photo }: { name: string; photo?: string }) => (
    <div className="relative w-full h-full">
      <div className={`absolute inset-0 bg-gradient-to-br ${colors.gradientFrom} ${colors.gradientTo} rounded-full flex items-center justify-center`}>
        <span className="text-white font-semibold text-lg">{name ? name.charAt(0).toUpperCase() : '?'}</span>
      </div>
      {photo && photo.startsWith('http') && (
        <img
          src={photo}
          alt={name}
          className="absolute inset-0 w-full h-full object-cover rounded-full"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-white">
      <Header
        onReferFriend={onReferFriend}
        onMessages={onMessages}
        unreadCount={unreadMessages}
        onUpgradePlan={() => setShowSubscriptionModal(true)}
        currentPlan={currentPlan}
      />

      {/* Loading Overlay with Blur Effect */}
      {isLoading && !initialLoadComplete && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-white/80 backdrop-blur-sm" style={{ paddingTop: 'calc(67px + env(safe-area-inset-top))' }}>
          <div className="flex flex-col items-center gap-3">
            <div className={`w-12 h-12 border-4 ${colors.primary} border-t-transparent rounded-full animate-spin`} />
            <p className="text-sm text-gray-600 font-medium">Loading...</p>
          </div>
        </div>
      )}

      <div className={`max-w-md mx-auto bg-white pb-24 overflow-y-auto transition-all duration-300 ${isLoading && !initialLoadComplete ? 'blur-sm' : 'blur-0'}`} style={{ paddingTop: 'calc(67px + env(safe-area-inset-top))', minHeight: '100vh' }}>
        {/* Profile Header */}
        <div className={`${colors.primary} text-white px-4 py-6 relative overflow-hidden bg-cover bg-center shadow-lg -mt-[calc(env(safe-area-inset-top))]`} style={{ backgroundImage: 'url(/waves 4.png)', paddingTop: 'calc(1.5rem + env(safe-area-inset-top))' }}>
          <div className="relative z-10">

            {/* Profile Section */}
            <div className="text-center pb-20">
              <div className="mx-auto mb-4 relative inline-block">
                <ProfileWithStatusRing
                  name={user?.name || ''}
                  photo={user?.profile_photo}
                  showStatus={employerStatus.showRing}
                  statusText={employerStatus.text}
                  statusColor={employerStatus.color}
                  size="large"
                />
                <button
                  onClick={handleEditProfile}
                  className="absolute bottom-0 right-0 w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-lg hover:bg-gray-100 transition-colors z-20"
                >
                  <Edit className={`w-4 h-4 ${colors.text}`} />
                </button>
              </div>
              <p className="text-white text-base mb-1">Welcome</p>
              <h2 className="text-2xl font-bold text-white mb-3">{user?.name}</h2>
              <div className="flex justify-center space-x-1 mb-3">
                {[...Array(5)].map((_, i) => (
                  <svg
                    key={i}
                    className={`w-5 h-5 ${i < employerRating ? 'text-yellow-400' : 'text-white/30'} fill-current`}
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                ))}
              </div>

              {/* Subscription Info */}
              <div className="flex justify-center items-center gap-2 flex-wrap">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border border-white/30 bg-white/10 text-white backdrop-blur-sm`}>
                  {getPlanDisplayName(user?.subscription_plan || 'free')} Account
                </span>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border border-white/30 bg-white/10 text-white backdrop-blur-sm`}>
                  {employees.length}/{user?.max_employees || 1} Employees
                </span>
              </div>

              <button
                onClick={() => setShowSubscriptionModal(true)}
                className={`mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all shadow-lg ${
                  currentPlan === 'pro_plus' || currentPlan === 'pro'
                    ? 'bg-white/20 hover:bg-white/30 text-white border border-white/40 backdrop-blur-sm'
                    : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white'
                }`}
              >
                {currentPlan === 'pro_plus' || currentPlan === 'pro' ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Manage Plan
                  </>
                ) : (
                  <>
                    <Crown className="w-4 h-4" />
                    Upgrade Plan
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Wave decoration */}
          <div className="absolute bottom-0 left-0 right-0">
            <svg viewBox="0 0 1440 100" className="w-full" preserveAspectRatio="none">
              <path fill="rgba(59, 130, 246, 0.5)" d="M0,50L80,53.3C160,57,320,63,480,60C640,57,800,43,960,40C1120,37,1280,43,1360,46.7L1440,50L1440,100L1360,100C1280,100,1120,100,960,100C800,100,640,100,480,100C320,100,160,100,80,100L0,100Z"></path>
              <path fill="rgba(96, 165, 250, 0.5)" d="M0,70L80,66.7C160,63,320,57,480,60C640,63,800,77,960,80C1120,83,1280,77,1360,73.3L1440,70L1440,100L1360,100C1280,100,1120,100,960,100C800,100,640,100,480,100C320,100,160,100,80,100L0,100Z"></path>
              <path fill="white" d="M0,50L80,53.3C160,57,320,63,480,60C640,57,800,43,960,40C1120,37,1280,43,1360,46.7L1440,50L1440,100L1360,100C1280,100,1120,100,960,100C800,100,640,100,480,100C320,100,160,100,80,100L0,100Z"></path>
            </svg>
          </div>
        </div>

        {/* Employee Grid */}
        <div className="px-6 -mt-16 relative z-20 mb-6 pb-24">
          <div className="grid grid-cols-4 gap-4">
            {/* All Employees */}
            {employees.slice(0, 12).map((employee) => {
              const status = employeeStatuses[employee.id] || { showRing: false, color: '', text: '' };
              return (
                <div key={employee.id} className="flex justify-center">
                  <ProfileWithStatusRing
                    name={employee.name}
                    photo={employee.profile_photo}
                    showStatus={status.showRing}
                    statusText={status.text}
                    statusColor={status.color}
                    size="medium"
                    onClick={() => handleEmployeeClick(employee)}
                  />
                </div>
              );
            })}

            {/* Add Employee Button - appears after all employees */}
            {employees.length < 12 && (
              <button
                onClick={handleAddEmployeeClick}
                className={`w-20 h-20 ${colors.primary} rounded-full flex items-center justify-center shadow-lg ${colors.primaryHover} transition-colors`}
              >
                <Plus className="w-10 h-10 text-white" />
              </button>
            )}

            {/* Placeholder slots to fill grid */}
            {employees.length < 12 && [...Array(Math.max(0, 11 - employees.length))].map((_, i) => (
              <div key={`empty-${i}`} className="w-20 h-20 rounded-full bg-gray-100 border-2 border-gray-200"></div>
            ))}
          </div>

          {employees.length === 0 && (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">No employees yet</p>
              <p className="text-sm text-gray-500">Tap the + button to invite employees</p>
            </div>
          )}
        </div>

        {/* Generate QR Code Button - Fixed at Bottom (Hidden for record keeper accounts) */}
        {employees.length > 0 && user?.account_type !== 'record_holder' && (
          <div className="fixed bottom-24 left-0 right-0 px-6 z-30">
            <div className="max-w-md mx-auto">
              <button
                onClick={generateQRCode}
                className={`w-full bg-gradient-to-r ${colors.gradientFrom} ${colors.gradientTo} hover:from-emerald-600 hover:to-emerald-700 text-white py-4 px-6 rounded-full font-semibold flex items-center justify-center shadow-lg transition-all transform hover:scale-105`}
              >
                <QrCode className="w-5 h-5 mr-2" />
                Generate QR Code
              </button>
            </div>
          </div>
        )}

        {/* Employee Selection Modal for QR */}
        <Modal
          isOpen={showEmployeeSelection}
          onClose={() => {
            setShowEmployeeSelection(false);
            setSelectedQREmployee(null);
          }}
          size="md"
        >
          <div className="bg-white rounded-2xl p-6 max-h-[80vh] overflow-y-auto">
            <div className="text-center mb-6">
              <Users className={`w-8 h-8 ${colors.text} mx-auto mb-2`} />
              <h3 className="text-lg font-semibold text-gray-900">Select Employee</h3>
              <p className="text-sm text-gray-600">
                Choose the employee for this transaction
              </p>
            </div>

            <div className="space-y-2">
              {employees.map((employee) => (
                <button
                  key={employee.id}
                  onClick={() => handleEmployeeSelected(employee)}
                  className={`w-full p-4 bg-gray-50 ${colors.primaryLight} border border-gray-200 hover:border-emerald-300 rounded-lg transition-all text-left`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12">
                      <ProfilePhoto name={employee.name} photo={employee.profile_photo} />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{employee.name}</p>
                      <p className="text-sm text-gray-600">{employee.email || employee.phone}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                setShowEmployeeSelection(false);
                setSelectedQREmployee(null);
              }}
              className="w-full mt-4 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 px-4 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </Modal>

        {/* Employment Type Selection Modal */}
        <Modal
          isOpen={showEmploymentTypeModal}
          onClose={() => setShowEmploymentTypeModal(false)}
          size="sm"
        >
          <div className="bg-white rounded-2xl p-6">
            <div className="text-center mb-6">
              <Users className={`w-8 h-8 ${colors.text} mx-auto mb-2`} />
              <h3 className="text-lg font-semibold text-gray-900">Select Employment Type</h3>
              <p className="text-sm text-gray-600">Choose the type of employment for this employee</p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => handleEmploymentTypeSelected('full_time')}
                className={`w-full ${colors.primary} ${colors.primaryHover} text-white py-4 px-4 rounded-lg font-medium transition-colors`}
              >
                Full-time
              </button>

              <button
                onClick={() => handleEmploymentTypeSelected('part_time')}
                className="w-full bg-green-500 hover:bg-green-600 text-white py-4 px-4 rounded-lg font-medium transition-colors"
              >
                Part-time
              </button>

              {(user?.subscription_plan === 'pro_plus') ? (
                <button
                  onClick={() => handleEmploymentTypeSelected('contract')}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white py-4 px-4 rounded-lg font-medium transition-colors"
                >
                  Contract
                </button>
              ) : (
                <div className="relative">
                  <button
                    className="w-full bg-gray-300 text-gray-600 py-4 px-4 rounded-lg font-medium flex items-center justify-center space-x-2 cursor-not-allowed opacity-60"
                    disabled
                  >
                    <Lock className="w-4 h-4" />
                    <span>Contract</span>
                    <Crown className="w-4 h-4 text-amber-500" />
                  </button>
                  <div className="text-xs text-center text-gray-500 mt-1">Pro Plus Only</div>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowEmploymentTypeModal(false)}
              className="w-full mt-4 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 px-4 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </Modal>

        {/* Part-time Configuration Modal */}
        <Modal
          isOpen={showPartTimeConfig}
          onClose={() => setShowPartTimeConfig(false)}
          size="sm"
        >
          <div className="bg-white rounded-2xl p-6">
            <div className="text-center mb-6">
              <DollarSign className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <h3 className="text-lg font-semibold text-gray-900">Part-time Configuration</h3>
              <p className="text-sm text-gray-600">Set working hours and days</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Working Hours Per Day
                </label>
                <input
                  type="number"
                  value={partTimeConfig.workingHoursPerDay}
                  onChange={(e) => setPartTimeConfig({...partTimeConfig, workingHoursPerDay: Math.min(24, Math.max(0, parseFloat(e.target.value) || 0))})}
                  className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 ${colors.ring}`}
                  placeholder="8"
                  step="0.5"
                  min="0"
                  max="24"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Working Days Per Month
                </label>
                <input
                  type="number"
                  value={partTimeConfig.workingDaysPerMonth}
                  onChange={(e) => setPartTimeConfig({...partTimeConfig, workingDaysPerMonth: Math.min(31, Math.max(0, parseInt(e.target.value) || 0))})}
                  className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 ${colors.ring}`}
                  placeholder="22"
                  min="0"
                  max="31"
                />
              </div>

            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowPartTimeConfig(false)}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 px-4 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePartTimeConfigSubmit}
                disabled={partTimeConfig.workingHoursPerDay <= 0 || partTimeConfig.workingDaysPerMonth <= 0}
                className={`flex-1 ${colors.primary} ${colors.primaryHover} disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-3 px-4 rounded-lg font-medium transition-colors`}
              >
                Generate QR
              </button>
            </div>
          </div>
        </Modal>

        {/* Employee Profile Modal */}
        {showEmployeeModal && selectedEmployee && (
          <EmployeeProfileModal
            employee={selectedEmployee}
            onClose={() => {
              setShowEmployeeModal(false);
              setSelectedEmployee(null);
            }}
            onUpdate={() => {
              fetchEmployees();
            }}
          />
        )}

        {/* QR Options Modal */}
        <Modal
          isOpen={showQROptions}
          onClose={() => setShowQROptions(false)}
          size="sm"
        >
          <div className="bg-white rounded-2xl p-6">
            <div className="text-center mb-6">
              <QrCode className={`w-8 h-8 ${colors.text} mx-auto mb-2`} />
              <h3 className="text-lg font-semibold text-gray-900">Generate QR Code</h3>
              <p className="text-sm text-gray-600">Choose an action</p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => handleQROption('pay_wages')}
                className="w-full bg-green-500 hover:bg-green-600 text-white py-4 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
              >
                <DollarSign className="w-5 h-5" />
                <span>Pay Wages</span>
              </button>

              {user?.can_track_attendance && (
                <button
                  onClick={() => handleQROption('mark_attendance')}
                  className={`w-full ${colors.primary} ${colors.primaryHover} text-white py-4 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2`}
                >
                  <CheckCircle className="w-5 h-5" />
                  <span>Mark Attendance</span>
                </button>
              )}
            </div>

            <button
              onClick={() => setShowQROptions(false)}
              className="w-full mt-4 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 px-4 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </Modal>

        {/* Add Employee Options Modal (Manual or QR) */}
        <Modal
          isOpen={showAddEmployeeOptions}
          onClose={() => setShowAddEmployeeOptions(false)}
          size="sm"
        >
          <div className="bg-white rounded-2xl p-6">
            <div className="text-center mb-6">
              <UserPlus className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <h3 className="text-lg font-semibold text-gray-900">Add Employee</h3>
              <p className="text-sm text-gray-600">Choose how to add your employee</p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => {
                  setShowAddEmployeeOptions(false);
                  setShowManualEmployeeAdd(true);
                }}
                className={`w-full ${colors.primary} ${colors.primaryHover} text-white py-4 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2`}
              >
                <User className="w-5 h-5" />
                <span>Manual Entry</span>
              </button>

              <button
                onClick={() => {
                  setShowAddEmployeeOptions(false);
                  setShowEmploymentTypeModal(true);
                }}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-4 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
              >
                <QrCode className="w-5 h-5" />
                <span>Scan Employee QR</span>
              </button>
            </div>

            <button
              onClick={() => setShowAddEmployeeOptions(false)}
              className="w-full mt-4 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 px-4 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </Modal>

        {/* QR Code Modal */}
        <Modal
          isOpen={showQRCode}
          onClose={() => setShowQRCode(false)}
          size="sm"
        >
          <div className="bg-white rounded-2xl p-6">
            <div className="text-center mb-6">
              <QrCode className={`w-8 h-8 ${colors.text} mx-auto mb-2`} />
              <h3 className="text-lg font-semibold text-gray-900">
                {qrTransactionType === 'add_employee' && (
                  selectedEmploymentType === 'full_time' ? 'Add Full-time Employee' :
                  selectedEmploymentType === 'part_time' ? 'Add Part-time Employee' :
                  selectedEmploymentType === 'contract' ? 'Add Contract Employee' :
                  'Add Employee QR Code'
                )}
                {qrTransactionType === 'pay_wages' && 'Pay Wages QR Code'}
                {qrTransactionType === 'settle_loan' && 'Settle Loan QR Code'}
                {qrTransactionType === 'mark_attendance' && 'Mark Attendance QR Code'}
              </h3>
              <p className="text-sm text-gray-600">
                {qrTransactionType === 'add_employee' ? 'Share this code with employees to add them' : qrTransactionType === 'mark_attendance' ? 'Any employee can scan this code to mark attendance' : 'Share this code with your employee to scan'}
              </p>
            </div>

            <div className="bg-gray-100 p-6 rounded-lg mb-6">
              <div className="w-48 h-48 mx-auto bg-white rounded-lg flex items-center justify-center border-2 border-gray-300">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(qrCodeValue)}&size=200x200`}
                  alt="QR Code"
                  className="w-full h-full object-contain"
                />
              </div>
              <p className="text-xs text-center text-gray-600 mt-4 break-all font-mono">
                {qrCodeValue}
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowQRCode(false)}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 px-4 rounded-lg font-medium transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => navigator.share && navigator.share({ text: qrCodeValue })}
                className={`flex-1 ${colors.primary} ${colors.primaryHover} text-white py-3 px-4 rounded-lg font-medium transition-colors`}
              >
                Share
              </button>
            </div>
          </div>
        </Modal>

        {/* Record Holder Options Modal */}
        <Modal
          isOpen={showRecordHolderOptions}
          onClose={() => setShowRecordHolderOptions(false)}
          size="sm"
        >
          <div className="bg-white rounded-2xl p-6">
            <div className="text-center mb-6">
              <Users className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <h3 className="text-lg font-semibold text-gray-900">Manage Employees</h3>
              <p className="text-sm text-gray-600">Choose an action</p>
            </div>

            <div className="space-y-3">
              {user?.can_track_attendance && (
                <button
                  onClick={() => {
                    setShowRecordHolderOptions(false);
                    setShowManualAttendance(true);
                  }}
                  className={`w-full ${colors.primary} ${colors.primaryHover} text-white py-4 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2`}
                >
                  <CheckCircle className="w-5 h-5" />
                  <span>Mark Attendance</span>
                </button>
              )}

              <button
                onClick={() => {
                  setShowRecordHolderOptions(false);
                  window.location.hash = '#/wages';
                }}
                className="w-full bg-green-500 hover:bg-green-600 text-white py-4 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
              >
                <DollarSign className="w-5 h-5" />
                <span>Manage Wages</span>
              </button>
            </div>

            <button
              onClick={() => setShowRecordHolderOptions(false)}
              className="w-full mt-4 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 px-4 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </Modal>

        {/* Manual Employee Add Modal */}
        {showManualEmployeeAdd && (
          <ManualEmployeeAdd
            onClose={() => setShowManualEmployeeAdd(false)}
            onSuccess={() => {
              fetchEmployees();
              setShowManualEmployeeAdd(false);
            }}
          />
        )}

        {/* Manual Attendance Entry Modal */}
        {showManualAttendance && (
          <ManualAttendanceEntry
            onClose={() => setShowManualAttendance(false)}
            onSuccess={() => {
              setShowManualAttendance(false);
              showSuccess('Attendance Marked', 'Attendance has been marked successfully!');
            }}
          />
        )}
      </div>

      {user && <AdPlayer userId={user.id} adsEnabled={adsEnabled} />}

      {/* Subscription Modal */}
      {showSubscriptionModal && (
        <SubscriptionModal
          onClose={() => setShowSubscriptionModal(false)}
          onSelectPlan={(tier) => {
            showInfo('Plan Selected', `You selected ${tier.toUpperCase()} plan. Please contact your administrator to complete the upgrade.`, 6000);
          }}
        />
      )}

      {/* Employee Limit Reached Modal */}
      <Modal
        isOpen={showLimitReachedModal}
        onClose={() => setShowLimitReachedModal(false)}
        size="md"
      >
        <div className="bg-white rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-orange-100 rounded-xl">
              <AlertCircle className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Employee Limit Reached</h2>
              <p className="text-sm text-gray-600">Current plan: {getPlanDisplayName(user?.subscription_plan || 'free')}</p>
            </div>
          </div>

          <div className="mb-6">
            <p className="text-gray-700 mb-4">
              You've reached the maximum number of employees ({user?.max_employees || 2}) for your current plan.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <h3 className="font-semibold text-blue-900 mb-2">Upgrade to add more employees:</h3>
              <ul className="space-y-2 text-sm text-blue-800">
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  <span><strong>Core Plan:</strong> Up to 3 employees</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  <span><strong>Pro Plan:</strong> Up to 6 employees</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  <span><strong>Pro Plus Plan:</strong> Up to 12 employees</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowLimitReachedModal(false)}
              className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl hover:bg-gray-300 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                setShowLimitReachedModal(false);
                setShowSubscriptionModal(true);
              }}
              className="flex-1 bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700 transition-colors font-medium"
            >
              View Plans
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
