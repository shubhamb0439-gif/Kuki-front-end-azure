import React, { useState, useEffect } from 'react';
import { CreditCard as Edit, Plus, QrCode } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import { employees, profiles, attendance, wages, messages, admin, qrTransactions } from '../../lib/api';
import { QRScanner } from '../common/QRScanner';
import { Header } from '../common/Header';
import { ProfileWithStatusRing } from '../common/ProfileWithStatusRing';
import { AdPlayer } from '../common/AdPlayer';
import { SubscriptionModal } from '../common/SubscriptionModal';
import { getEmployerStatusForEmployee, getEmployeeOwnStatus } from '../../lib/statusRingHelper';
import { useSwipeGesture } from '../../hooks/useSwipeGesture';
import { getPlanDisplayName } from '../../lib/subscriptionHelper';

interface EmployerData {
  id: string;
  name: string;
  email: string;
  profile_photo?: string;
  job_status?: string;
  show_status_ring?: boolean;
  profession?: string;
}

interface EmployeeHomeProps {
  onReferFriend: () => void;
  onMessages: () => void;
}

export function EmployeeHome({ onReferFriend, onMessages }: EmployeeHomeProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { showSuccess, showError, showWarning } = useToast();
  const [showScanner, setShowScanner] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [linkedEmployers, setLinkedEmployers] = useState<EmployerData[]>([]);
  const [loading, setLoading] = useState(false);
  const [employerStatuses, setEmployerStatuses] = useState<Record<string, {showRing: boolean; color: string; text: string}>>({});
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [employeeStatus, setEmployeeStatus] = useState<{showRing: boolean; color: string; text: string}>({ showRing: false, color: '', text: '' });
  const [employeeRating, setEmployeeRating] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [adsEnabled, setAdsEnabled] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<'free' | 'core' | 'pro' | 'pro_plus'>('free');

  const handleMessages = () => {
    window.location.hash = '#/messages';
  };

  useSwipeGesture({
    onSwipeLeft: () => {
      window.location.hash = '#/messages';
    }
  });

  const handleReferFriend = () => {
    setShowScanner(true);
  };

  const handleEditProfile = () => {
    window.location.hash = '#/edit-profile';
  };

  useEffect(() => {
    if (user) {
      Promise.all([
        checkLinkedEmployer(),
        fetchUnreadMessages(),
        loadEmployeeStatus(),
        loadAdsStatus()
      ]).then(() => {
        setIsLoading(false);
        setInitialLoadComplete(true);
      }).catch(() => {
        setIsLoading(false);
        setInitialLoadComplete(true);
      });

      subscribeToEmployerConnection();
      subscribeToJobPostings();
      subscribeToJobApplications();
    }
  }, [user]);

  useEffect(() => {
    if (linkedEmployers.length > 0 && user?.profession) {
      loadEmployerStatuses();
    }
  }, [linkedEmployers, user?.profession]);

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

  const loadEmployerStatuses = async () => {
    if (linkedEmployers.length === 0) return;
    const statuses: Record<string, {showRing: boolean; color: string; text: string}> = {};
    linkedEmployers.forEach(employer => {
      statuses[employer.id] = { showRing: false, color: '', text: '' };
    });
    setEmployerStatuses(statuses);
  };

  const loadEmployeeStatus = async () => {
    if (!user) return;
    const status = await getEmployeeOwnStatus(user.id);
    setEmployeeStatus(status);

    const { data: ratings } = await admin.ratings.listByEmployee(user.id);
    if (ratings && ratings.length > 0) {
      const avgRating = ratings.reduce((sum: number, r: any) => sum + r.rating, 0) / ratings.length;
      setEmployeeRating(Math.round(avgRating));
    } else {
      setEmployeeRating(5);
    }
  };

  const checkLinkedEmployer = async () => {
    if (!user) return;

    const { data, error } = await employees.list();
    if (error || !data) {
      console.error('Error checking linked employer:', error);
      return;
    }

    if (data.length > 0) {
      const employerList = await Promise.all(
        data
          .filter((emp: any) => emp.employer_id)
          .map(async (emp: any) => {
            const { data: profile } = await profiles.get(emp.employer_id);
            return {
              id: emp.employer_id,
              name: profile?.name || 'Employer',
              email: profile?.email || '',
              profile_photo: profile?.profile_photo || null,
              job_status: profile?.job_status || null,
              show_status_ring: profile?.show_status_ring || false,
              profession: profile?.profession || ''
            };
          })
      );
      setLinkedEmployers(employerList.filter((e: any) => e.id));
    }
  };

  const subscribeToEmployerConnection = () => {
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

  const handleQRScan = async (data: string) => {
    setShowScanner(false);

    if (data.startsWith('employer:')) {
      await linkToEmployer(data);
    } else {
      await processQRTransaction(data);
    }
  };

  const processQRTransaction = async (qrCode: string) => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error, status } = await qrTransactions.process({ qr_code: qrCode });

      if (status === 404) {
        showError('Invalid QR Code', 'Invalid QR code');
        return;
      }
      if (status === 409) {
        showError('Already Used', 'This QR has already been used');
        return;
      }
      if (error || !data?.success) {
        showError('Transaction Failed', error || 'Invalid or already used QR code');
        return;
      }

      const type = data.transaction_type;
      const action = data.action;

      if (type === 'attendance' && action === 'clock_in') {
        showSuccess('Clock In Successful', 'Clocked in successfully');
      } else if (type === 'attendance' && action === 'clock_out') {
        const hours = data.hours_worked != null ? ` — ${parseFloat(data.hours_worked).toFixed(2)} hours worked` : '';
        showSuccess('Clock Out Successful', `Clocked out successfully${hours}`);
      } else if (type === 'attendance' && action === 'regularized') {
        const date = data.attendance_date ? ` for ${data.attendance_date}` : '';
        showSuccess('Attendance Regularized', `Attendance regularized${date}`);
      } else if (type === 'loan') {
        showSuccess('Loan Received', 'Loan received successfully');
      } else if (type === 'wage_payment') {
        showSuccess('Wages Received', 'Wages received');
      } else {
        showSuccess('Transaction Completed', 'Transaction completed successfully');
      }
    } catch (error: any) {
      showError('Transaction Failed', error.message || 'Invalid or already used QR code');
    } finally {
      setLoading(false);
    }
  };

  const handleWagePayment = async (employeeId: string, employerId: string) => {
    const paymentDate = new Date().toISOString();
    const paymentDateDisplay = new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    const { data: wageList, error: wageError } = await wages.list(employeeId);
    if (wageError) throw new Error(wageError);

    const wage = (wageList || []).sort((a: any, b: any) =>
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    )[0];

    if (wage) {
      const { error: updateError } = await wages.update(wage.id, {
        payment_date: paymentDate,
        updated_at: paymentDate
      });
      if (updateError) throw new Error(updateError);

      const { error: statementError } = await wages.statements.create({
        user_id: user?.id,
        message: `WAGE PAYMENT CONFIRMATION\n\nPayment Date: ${paymentDateDisplay}\nMonthly Wage: ${wage.currency} ${parseFloat(wage.monthly_wage).toFixed(2)}\nCurrency: ${wage.currency}\nStatus: Paid\n\nYour wages have been paid successfully.\n\n- Statement Personnel`
      });
      if (statementError) throw new Error(statementError);
    } else {
      throw new Error('No wage record found for this employee');
    }
  };

  const handleLoanSettlement = async (employeeId: string, employerId: string) => {
    const { data: loanList } = await wages.loans.list(employeeId);
    const activeLoans = (loanList || []).filter((l: any) => l.status === 'active');
    for (const loan of activeLoans) {
      await wages.loans.update(loan.id, {
        status: 'closed',
        foreclosure_date: new Date().toISOString()
      });
    }
  };

  const handleLoanForeclosure = async (employeeId: string, employerId: string, metadata: any) => {
    const loanIds = metadata?.loan_ids || [];
    if (loanIds.length === 0) {
      throw new Error('No loans specified for foreclosure');
    }

    const foreclosureDate = new Date().toISOString();
    const foreclosureDateDisplay = new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    let totalAmount = 0;
    let currency = 'USD';

    const { data: loanList } = await wages.loans.list(employeeId);
    for (const loanId of loanIds) {
      const loan = (loanList || []).find((l: any) => l.id === loanId);
      if (loan) {
        totalAmount += loan.remaining_amount || loan.total_amount;
        currency = loan.currency || 'USD';
        await wages.loans.update(loanId, {
          status: 'paid',
          foreclosure_date: foreclosureDate,
          remaining_amount: 0
        });
      }
    }

    await wages.statements.create({
      user_id: user?.id,
      message: `LOAN FORECLOSURE CONFIRMATION\n\nForeclosure Date: ${foreclosureDateDisplay}\nTotal Amount Settled: ${currency} ${totalAmount.toFixed(2)}\nNumber of Loans Closed: ${loanIds.length}\nStatus: Paid in Full\n\nAll selected loans have been successfully foreclosed and paid.\n\nThank you for your prompt settlement!\n\n- Statement Personnel`
    });
  };

  const handleLoanGrant = async (employeeId: string, employerId: string, metadata: any) => {
    const loanDate = new Date().toISOString();
    const loanDateDisplay = new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    const { amount, interest_rate, total_amount, monthly_deduction, currency, employee_user_id, employee_name } = metadata;

    const tenureMonths = Math.ceil(total_amount / monthly_deduction);

    // Create the loan record
    const { error: loanError } = await wages.loans.create({
      employee_id: employeeId,
      employer_id: employerId,
      amount,
      interest_rate,
      total_amount,
      remaining_amount: total_amount,
      paid_amount: 0,
      status: 'active',
      currency,
      loan_date: loanDate,
      monthly_deduction,
      tenure_months: tenureMonths
    });

    if (loanError) throw new Error('Failed to create loan: ' + loanError);

    // Create the statement
    const { error: statementError } = await wages.statements.create({
      user_id: employee_user_id,
      message: `LOAN AGREEMENT

Date: ${loanDateDisplay}
Employee: ${employee_name}
Loan Amount: ${currency} ${amount.toFixed(2)}
Interest Rate: ${interest_rate}%
Total to Repay: ${currency} ${total_amount.toFixed(2)}
Monthly Deduction: ${currency} ${monthly_deduction.toFixed(2)}
Tenure: ${tenureMonths} months
Status: Active

Please ensure timely repayment as per agreement.

- Statement Personnel`
      });

    if (statementError) throw new Error('Failed to create statement: ' + statementError);
  };

  const handleContractWagePayment = async (employeeId: string, employerId: string, metadata: any) => {
    const paymentDate = new Date().toISOString();
    const paymentDateDisplay = new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    const { amount, currency, employee_user_id } = metadata;

    // Create statement for employee
    const { error: statementError } = await wages.statements.create({
      user_id: employee_user_id,
      message: `CONTRACT WAGE PAYMENT

Payment Date: ${paymentDateDisplay}
Amount Paid: ${currency} ${amount.toFixed(2)}
Status: Completed

Your contract wage has been paid successfully.

- Statement Personnel`
      });

    if (statementError) throw new Error('Failed to create statement: ' + statementError);
  };

  const handleAttendance = async (employeeId: string, employerId: string, specificDate?: string | null) => {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const attendanceDate = specificDate || today;
    const scannedAt = new Date().toISOString();
    const isPastDate = attendanceDate !== today;

    const { data: attList } = await attendance.list({ employee_id: employeeId, from: attendanceDate, to: attendanceDate });
    const existingRecord = (attList || []).find(
      (r: any) => r.attendance_date === attendanceDate && r.employer_id === employerId
    );

    if (existingRecord?.login_time && existingRecord?.logout_time) {
      throw new Error('Attendance already completed for this date');
    }

    if (isPastDate) {
      const pastRecord = {
        employee_id: employeeId,
        employer_id: employerId,
        attendance_date: attendanceDate,
        status: 'present',
        scanned_at: scannedAt,
        login_time: `${attendanceDate}T09:00:00`,
        logout_time: `${attendanceDate}T17:00:00`,
        total_hours: 8
      };

      if (existingRecord) {
        const { error: err } = await attendance.clockOut(existingRecord.id);
        if (err) throw new Error(err);
      } else {
        const { error: err } = await attendance.manualEntry(pastRecord);
        if (err) throw new Error(err);
      }
      return;
    }

    // Today: clock in
    const { error } = await attendance.clockIn({
      employee_id: employeeId,
      employer_id: employerId,
      attendance_date: attendanceDate,
      status: 'present',
      scanned_at: scannedAt
    });

    if (error) throw new Error(error);
  };

  const linkToEmployer = async (qrData?: string) => {
    const dataToUse = qrData || manualCode;
    if (!user || !dataToUse) return;

    setLoading(true);
    try {
      const parts = dataToUse.split(':');
      if ((parts.length < 3 || parts.length > 5) || parts[0] !== 'employer') {
        throw new Error('Invalid QR code format');
      }

      const employerId = parts[1];
      const employmentType = parts.length >= 4 ? parts[3] : 'full_time';
      let partTimeConfig = null;

      if (parts.length === 5 && parts[4] && parts[4].trim() !== '') {
        try {
          const decodedConfig = decodeURIComponent(parts[4]);
          partTimeConfig = JSON.parse(decodedConfig);
        } catch (e) {
          console.error('Error parsing part-time config:', e);
        }
      }

      // Link employee to employer via dedicated endpoint (employee JWT, no user_id in body)
      const linkData: any = {
        employer_id: employerId,
        employment_type: employmentType,
        wage_amount: 0,
        wage_type: 'monthly',
      };

      if (partTimeConfig) {
        linkData.working_hours_per_day = partTimeConfig.workingHoursPerDay;
        linkData.working_days_per_month = partTimeConfig.workingDaysPerMonth;
      }

      const { data: linkResult, error } = await employees.link(linkData);
      if (error) throw new Error(error);
      // 200 (already_linked / reactivated) and 201 (newly linked) are both success

      await checkLinkedEmployer();
      setManualCode('');
      setShowManualInput(false);

    } catch (error: any) {
      showError('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEmployer = () => {
    setShowScanner(true);
  };

  const handleManualSubmit = () => {
    if (manualCode.trim()) {
      linkToEmployer(manualCode);
    }
  };

  const ProfilePhoto = ({ name, photo }: { name: string; photo?: string }) => {
    if (photo) {
      return (
        <img
          src={photo}
          alt={name}
          className="w-full h-full object-cover rounded-full"
        />
      );
    }

    return (
      <div className="w-full h-full bg-gradient-to-br from-blue-400 to-emerald-400 rounded-full flex items-center justify-center">
        <span className="text-white font-semibold text-lg">
          {name.charAt(0).toUpperCase()}
        </span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white">
      <Header
        onReferFriend={onReferFriend}
        onMessages={onMessages}
        unreadCount={unreadMessages}
        onUpgradePlan={() => setShowSubscriptionModal(true)}
        currentPlan={currentPlan}
        hideUpgradeAndLinked
      />

      {/* Loading Overlay with Blur Effect */}
      {isLoading && !initialLoadComplete && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-white/80 backdrop-blur-sm" style={{ paddingTop: 'calc(67px + env(safe-area-inset-top))' }}>
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-600 font-medium">Loading...</p>
          </div>
        </div>
      )}

      {showScanner && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Scan Employer QR Code</h2>
              <button
                onClick={() => setShowScanner(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <QRScanner onScan={handleQRScan} onClose={() => setShowScanner(false)} />
            <button
              onClick={() => {
                setShowScanner(false);
                setShowManualInput(true);
              }}
              className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
            >
              Enter Code Manually
            </button>
          </div>
        </div>
      )}

      {showManualInput && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Enter Employer Code</h2>
              <button
                onClick={() => {
                  setShowManualInput(false);
                  setManualCode('');
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Paste employer code here"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-4"
            />
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowManualInput(false);
                  setShowScanner(true);
                }}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium transition-colors"
              >
                Scan Instead
              </button>
              <button
                onClick={handleManualSubmit}
                disabled={!manualCode.trim() || loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-3 px-4 rounded-lg font-medium transition-colors"
              >
                {loading ? 'Connecting...' : 'Connect'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={`max-w-md mx-auto bg-white pb-24 overflow-y-auto transition-all duration-300 ${isLoading && !initialLoadComplete ? 'blur-sm' : 'blur-0'}`} style={{ paddingTop: 'calc(67px + env(safe-area-inset-top))', minHeight: '100vh' }}>
        {/* Profile Header */}
        <div className="bg-blue-600 text-white px-4 py-6 relative overflow-hidden bg-cover bg-center shadow-lg -mt-[calc(env(safe-area-inset-top))]" style={{ backgroundImage: 'url(/waves 4.png)', paddingTop: 'calc(1.5rem + env(safe-area-inset-top))' }}>
          <div className="relative z-10">
            {/* Profile Section */}
            <div className="text-center pb-20">
              <div className="w-36 h-36 mx-auto mb-4 relative">
                <ProfileWithStatusRing
                  name={user?.name || ''}
                  photo={user?.profile_photo}
                  showStatus={employeeStatus.showRing}
                  statusText={employeeStatus.text}
                  statusColor={employeeStatus.color}
                  size="large"
                />
                <button
                  onClick={handleEditProfile}
                  className="absolute bottom-0 right-0 w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-lg hover:bg-gray-100 transition-colors z-20"
                >
                  <Edit className="w-4 h-4 text-blue-600" />
                </button>
              </div>
              <p className="text-white text-base mb-1">Welcome</p>
              <h2 className="text-2xl font-bold text-white mb-3">{user?.name}</h2>
              <div className="flex justify-center space-x-1 mb-3">
                {[...Array(5)].map((_, i) => (
                  <svg
                    key={i}
                    className={`w-5 h-5 ${i < employeeRating ? 'text-yellow-400' : 'text-white/30'} fill-current`}
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                ))}
              </div>

              <div className="flex justify-center items-center gap-2">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border border-white/30 bg-white/10 text-white backdrop-blur-sm`}>
                  {user?.subscription_plan === 'core' ? 'Employee Account' : `${getPlanDisplayName(user?.subscription_plan || 'bronze')} Plan`}
                </span>
              </div>
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

        {/* Employers Grid */}
        <div className="px-6 -mt-16 relative z-20 mb-6">
          <div className="grid grid-cols-4 gap-4">
            {linkedEmployers.slice(0, 3).map((employer) => {
              const status = employerStatuses[employer.id] || { showRing: false, color: '', text: '' };
              return (
                <div key={employer.id} className="flex justify-center">
                  <ProfileWithStatusRing
                    name={employer.name}
                    photo={employer.profile_photo}
                    showStatus={status.showRing}
                    statusText={status.text}
                    statusColor={status.color}
                    size="medium"
                  />
                </div>
              );
            })}

            {/* Add Employer Button */}
            <button
              onClick={handleAddEmployer}
              className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center shadow-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-10 h-10 text-white" />
            </button>

            {/* Additional Employers */}
            {linkedEmployers.slice(3, 11).map((employer) => {
              const status = employerStatuses[employer.id] || { showRing: false, color: '', text: '' };
              return (
                <div key={employer.id} className="flex justify-center">
                  <ProfileWithStatusRing
                    name={employer.name}
                    photo={employer.profile_photo}
                    showStatus={status.showRing}
                    statusText={status.text}
                    statusColor={status.color}
                    size="medium"
                  />
                </div>
              );
            })}

            {/* Placeholder slots if less than 11 employers */}
            {linkedEmployers.length < 11 && [...Array(Math.max(0, 11 - linkedEmployers.length))].map((_, i) => (
              <div key={`empty-${i}`} className="w-20 h-20 rounded-full bg-gray-100 border-2 border-gray-200"></div>
            ))}
          </div>

          {linkedEmployers.length === 0 && (
            <div className="text-center py-8">
              <QrCode className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">No employers yet</p>
              <p className="text-sm text-gray-500">Tap the + button to scan employer QR</p>
            </div>
          )}
        </div>

        {/* Scan QR Button - Positioned between grid and bottom nav */}
        {linkedEmployers.length > 0 && (
          <div className="px-6 mt-8 mb-6">
            <div className="max-w-md mx-auto flex space-x-3">
              <button
                onClick={() => setShowScanner(true)}
                className="flex-1 bg-gradient-to-r from-blue-500 to-emerald-500 hover:from-blue-600 hover:to-emerald-600 text-white py-4 px-6 rounded-full font-semibold flex items-center justify-center shadow-lg transition-all transform hover:scale-105"
              >
                <QrCode className="w-5 h-5 mr-2" />
                Scan QR Code
              </button>
              <button
                onClick={() => setShowManualInput(true)}
                className="bg-white hover:bg-gray-50 text-blue-600 py-4 px-6 rounded-full font-semibold shadow-lg transition-all transform hover:scale-105 border-2 border-blue-500"
              >
                Manual Entry
              </button>
            </div>
          </div>
        )}
      </div>

      {user && <AdPlayer userId={user.id} adsEnabled={adsEnabled} />}

      {/* Subscription Modal */}
      {showSubscriptionModal && (
        <SubscriptionModal
          onClose={() => setShowSubscriptionModal(false)}
          onSelectPlan={(tier) => {
            setShowSubscriptionModal(false);
          }}
        />
      )}
    </div>
  );
}
