import React, { useState, useEffect } from 'react';
import { Users, Trash2, DollarSign, Gift, X, CreditCard, XCircle, Plus, Minus, TrendingUp, TrendingDown, Clock } from 'lucide-react';
import QRCode from 'react-qr-code';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { employees as employeesApi, profiles, wages, qrTransactions } from '../../lib/api';
import { Header } from '../common/Header';
import { useSwipeGesture } from '../../hooks/useSwipeGesture';
import { ConfirmModal } from '../common/ConfirmModal';

interface Employee {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string;
  profile_photo?: string;
  status: string;
  created_at: string;
  employment_type: 'full_time' | 'part_time' | 'contract';
  hourly_rate: number;
  working_hours_per_day: number;
  working_days_per_month: number;
}

interface Loan {
  id: string;
  amount: number;
  interest_rate: number;
  total_amount: number;
  remaining_amount: number;
  status: string;
}

interface Adjustment {
  merits: number;
  demerits: number;
  advances: number;
  loanDeductions: number;
}

type ActionType = 'wages' | 'loan' | 'merit' | 'demerit' | 'advance' | 'loan_deduction' | 'foreclose' | 'delete';

interface ManageEmployeesPageProps {
  onReferFriend: () => void;
  onMessages: () => void;
}

export function ManageEmployeesPage({ onReferFriend, onMessages }: ManageEmployeesPageProps) {
  const { user } = useAuth();
  const toast = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [actionType, setActionType] = useState<ActionType | null>(null);

  const [currency, setCurrency] = useState('USD');
  const [currentCurrency, setCurrentCurrency] = useState('USD');
  const [wageAmount, setWageAmount] = useState('');
  const [loanAmount, setLoanAmount] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [tenureMonths, setTenureMonths] = useState('');
  const [adjustmentAmount, setAdjustmentAmount] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');

  const [employeeLoans, setEmployeeLoans] = useState<Loan[]>([]);
  const [totalLoanBalance, setTotalLoanBalance] = useState(0);
  const [monthlyLoanDeduction, setMonthlyLoanDeduction] = useState(0);
  const [adjustments, setAdjustments] = useState<Adjustment>({ merits: 0, demerits: 0, advances: 0, loanDeductions: 0 });
  const [showQRCode, setShowQRCode] = useState(false);
  const [qrCodeValue, setQrCodeValue] = useState('');

  const [loading, setLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const [hasExistingWage, setHasExistingWage] = useState(false);
  const [existingWageId, setExistingWageId] = useState<string | null>(null);
  const [wageInfo, setWageInfo] = useState<{
    hourlyRate: number;
    actualHoursWorked: number;
    finalPayable: number;
    deductions: number;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<'full_time' | 'part_time' | 'contract'>('full_time');

  const handleMessages = () => {
    window.location.hash = '#/messages';
  };

  useSwipeGesture({
    onSwipeLeft: () => {
      window.location.hash = '#/messages';
    }
  });

  const handleReferFriend = () => {
    toast.showInfo('Coming Soon', 'Refer a friend feature coming soon!');
  };

  const handleBack = () => {
    window.history.back();
  };

  useEffect(() => {
    if (user) {
      fetchEmployees();
      subscribeToEmployees();
    }
  }, [user]);

  useEffect(() => {
    if (selectedEmployee) {
      fetchEmployeeData();
    }
  }, [selectedEmployee]);

  const fetchEmployees = async () => {
    if (!user) return;

    const { data, error } = await employeesApi.list();

    if (error || !data) {
      console.error('Error fetching employees:', error);
      return;
    }

    const formattedEmployees = data.map((emp: any) => ({
      id: emp.id,
      user_id: emp.user_id,
      name: emp.name || emp.email || emp.phone || 'Unknown',
      email: emp.email,
      phone: emp.phone,
      profile_photo: emp.photo_url || emp.profile_photo,
      status: emp.status,
      created_at: emp.created_at,
      employment_type: emp.employment_type || 'full_time',
      hourly_rate: emp.hourly_rate || 0,
      working_hours_per_day: emp.working_hours_per_day || 0,
      working_days_per_month: emp.working_days_per_month || 0
    }));

    setEmployees(formattedEmployees);
    if (formattedEmployees.length > 0 && !selectedEmployee) {
      const firstOfActiveTab = formattedEmployees.find(e => e.employment_type === activeTab) || formattedEmployees[0];
      setSelectedEmployee(firstOfActiveTab);
      setActiveTab(firstOfActiveTab.employment_type);
    }
  };

  const fetchEmployeeData = async () => {
    if (!selectedEmployee || !user) return;

    // Currency from profile if linked employee
    let employeeCurrency = 'USD';
    const isLinked = Boolean(
      selectedEmployee.user_id &&
      String(selectedEmployee.user_id).trim() !== '' &&
      String(selectedEmployee.user_id).trim() !== 'null' &&
      String(selectedEmployee.user_id).trim() !== 'undefined'
    );
    if (isLinked) {
      const { data: profileData } = await profiles.get(selectedEmployee.user_id);
      if (profileData?.currency) employeeCurrency = profileData.currency;
    }
    setCurrency(employeeCurrency);
    setCurrentCurrency(employeeCurrency);

    // Wages
    const { data: wageList } = await wages.list(selectedEmployee.id);
    const wageData = (wageList || []).find((w: any) => w.employer_id === user.id);
    if (wageData) {
      setWageAmount(wageData.monthly_wage?.toString() || '');
      setHasExistingWage(true);
      setExistingWageId(wageData.id);
      setWageInfo({
        hourlyRate: wageData.hourly_rate || 0,
        actualHoursWorked: wageData.actual_hours_worked || 0,
        finalPayable: wageData.final_payable || 0,
        deductions: wageData.deductions || 0
      });
    } else {
      setWageAmount('');
      setHasExistingWage(false);
      setExistingWageId(null);
      setWageInfo(null);
    }

    // Loans
    const { data: loansData } = await wages.loans.list(selectedEmployee.id);
    const activeLoans = (loansData || []).filter((l: any) => l.status === 'active');
    setEmployeeLoans(activeLoans);
    const total = activeLoans.reduce((sum: number, loan: any) => sum + (loan.remaining_amount || loan.total_amount), 0);
    setTotalLoanBalance(total);
    const monthlyDeduction = activeLoans.reduce((sum: number, loan: any) => sum + (loan.monthly_deduction || 0), 0);
    setMonthlyLoanDeduction(monthlyDeduction);

    // Adjustments for current month
    const currentMonth = new Date().toISOString().slice(0, 7);
    const { data: bonusData } = await wages.bonuses.list(selectedEmployee.id);
    const monthBonuses = (bonusData || []).filter((b: any) =>
      b.employer_id === user.id &&
      b.bonus_date && b.bonus_date.substring(0, 7) === currentMonth
    );
    const adj: Adjustment = {
      merits: monthBonuses.filter((a: any) => a.category === 'merit').reduce((sum: number, a: any) => sum + a.amount, 0),
      demerits: monthBonuses.filter((a: any) => a.category === 'demerit').reduce((sum: number, a: any) => sum + a.amount, 0),
      advances: monthBonuses.filter((a: any) => a.category === 'advance').reduce((sum: number, a: any) => sum + a.amount, 0),
      loanDeductions: monthBonuses.filter((a: any) => a.category === 'loan_deduction').reduce((sum: number, a: any) => sum + a.amount, 0)
    };
    setAdjustments(adj);
  };

  const subscribeToEmployees = () => {
    if (!user) return;
    return () => {};
  };

  const openActionModal = (action: ActionType) => {
    if (!selectedEmployee) return;
    setActionType(action);
    setLoanAmount('');
    setInterestRate('');
    setTenureMonths('');
    setAdjustmentAmount('');
    setAdjustmentReason('');
  };

  const closeModal = () => {
    setActionType(null);
    setLoanAmount('');
    setInterestRate('');
    setTenureMonths('');
    setAdjustmentAmount('');
    setAdjustmentReason('');
    setShowQRCode(false);
    setQrCodeValue('');
    setShowDirectPayment(false);
  };

  const handleSetWages = async () => {
    if (!selectedEmployee || !wageAmount) {
      toast.showWarning('Missing Information', 'Please enter wage amount');
      return;
    }

    setLoading(true);
    try {
      const paymentAmount = parseFloat(wageAmount);

      // Contract employee - generate QR code for payment
      if (selectedEmployee.employment_type === 'contract') {
        const qrCode = crypto.randomUUID();

        const { error: qrError } = await qrTransactions.create({
          qr_code: qrCode,
          transaction_type: 'wage_payment',
          employee_id: selectedEmployee.id,
          amount: paymentAmount,
          status: 'pending',
          metadata: { currency }
        });

        if (qrError) throw new Error(qrError);

        setQrCodeValue(qrCode);
        setShowQRCode(true);
        setLoading(false);
        return;
      }

      // Full-time and Part-time employees - set monthly wage
      const monthlyWage = paymentAmount;
      const workingHoursPerDay = selectedEmployee.working_hours_per_day || 8;
      const workingDaysPerMonth = selectedEmployee.working_days_per_month || 22;

      const hourlyRate = selectedEmployee.employment_type === 'part_time'
        ? monthlyWage / (workingHoursPerDay * workingDaysPerMonth)
        : 0;

      console.log('Setting wage with hourly rate:', {
        employmentType: selectedEmployee.employment_type,
        monthlyWage,
        workingHoursPerDay,
        workingDaysPerMonth,
        calculatedHourlyRate: hourlyRate
      });

      const wagePayload = {
        employee_id: selectedEmployee.id,
        employer_id: user?.id,
        monthly_wage: monthlyWage,
        currency: currency,
        hourly_rate: hourlyRate,
        working_hours_per_day: workingHoursPerDay,
        total_working_days: workingDaysPerMonth,
        updated_at: new Date().toISOString()
      };

      if (existingWageId) {
        const { error } = await wages.update(existingWageId, wagePayload);
        if (error) throw new Error(error);
      } else {
        const { error } = await wages.create(wagePayload);
        if (error) throw new Error(error);
      }

      if (selectedEmployee.employment_type === 'part_time' && hourlyRate > 0) {
        await employeesApi.update(selectedEmployee.id, { hourly_rate: hourlyRate });
      }

      toast.showSuccess('Success', hasExistingWage ? 'Wage updated successfully!' : 'Wage set successfully!');
      setHasExistingWage(true);
      closeModal();
      fetchEmployeeData();
    } catch (error: any) {
      console.error('Wage operation error:', error);
      toast.showError('Error', 'Error setting wage: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGiveLoan = async () => {
    if (!selectedEmployee || !loanAmount || !interestRate || !tenureMonths) {
      toast.showWarning('Missing Information', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const amount = parseFloat(loanAmount);
      const rate = parseFloat(interestRate);
      const tenure = parseInt(tenureMonths);

      const hasApp = Boolean(
        selectedEmployee.user_id &&
        String(selectedEmployee.user_id).trim() !== '' &&
        String(selectedEmployee.user_id).trim() !== 'null' &&
        String(selectedEmployee.user_id).trim() !== 'undefined'
      );

      if (hasApp) {
        // Linked employee — backend auto-creates the loan when the QR is scanned
        const qrCode = crypto.randomUUID();
        const { error: qrError } = await qrTransactions.create({
          employee_id: selectedEmployee.id,
          transaction_type: 'loan',
          amount,
          status: 'pending',
          qr_code: qrCode,
          metadata: {
            tenure_months: tenure,
            interest_rate: rate,
            currency: currentCurrency,
            employer_id: user?.id,
          }
        });
        if (qrError) throw new Error(qrError);
        setQrCodeValue(qrCode);
        setShowQRCode(true);
      } else {
        // Non-app employee — create loan record directly, no QR needed
        const totalAmount = amount + (amount * rate / 100);
        const { error: loanError } = await wages.loans.create({
          employee_id: selectedEmployee.id,
          employer_id: user?.id,
          amount,
          interest_rate: rate,
          total_amount: totalAmount,
          remaining_amount: totalAmount,
          paid_amount: 0,
          status: 'pending',
          currency: currentCurrency,
          tenure_months: tenure,
          monthly_deduction: totalAmount / tenure,
          loan_date: new Date().toISOString()
        });
        if (loanError) throw new Error(loanError);
        toast.showSuccess('Loan Granted', 'Loan granted successfully!');
        closeModal();
        fetchEmployeeData();
      }
    } catch (error: any) {
      toast.showError('Error', 'Error granting loan: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAdjustment = async (category: 'merit' | 'demerit' | 'advance' | 'loan_deduction') => {
    if (!selectedEmployee || !adjustmentAmount) {
      toast.showWarning('Missing Information', 'Please enter amount');
      return;
    }

    setLoading(true);
    try {
      const { error: bonusError } = await wages.bonuses.create({
        employee_id: selectedEmployee.id,
        employer_id: user?.id,
        amount: parseFloat(adjustmentAmount),
        currency: currentCurrency,
        type: category,
        category: category,
        reason: adjustmentReason || undefined
      });
      if (bonusError) throw new Error(bonusError);

      toast.showSuccess('Success', `${category.replace('_', ' ')} added successfully!`);
      closeModal();
      fetchEmployeeData();
    } catch (error: any) {
      toast.showError('Error', 'Error adding adjustment: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForecloseLoan = async () => {
    if (!selectedEmployee) return;

    setLoading(true);
    try {
      for (const loan of employeeLoans) {
        await wages.loans.update(loan.id, { status: 'paid' });
      }

      const isLinkedEmployee = Boolean(
        selectedEmployee.user_id &&
        String(selectedEmployee.user_id).trim() !== '' &&
        String(selectedEmployee.user_id).trim() !== 'null' &&
        String(selectedEmployee.user_id).trim() !== 'undefined'
      );
      if (isLinkedEmployee) {
        await wages.statements.create({
          user_id: selectedEmployee.user_id,
          message: `LOAN SETTLEMENT CONFIRMATION\n\nDate: ${new Date().toLocaleDateString()}\nEmployee: ${selectedEmployee.name}\nTotal Amount Settled: ${currentCurrency} ${totalLoanBalance.toFixed(2)}\n\nAll loans have been successfully closed and paid in full.\n\nThank you for your prompt payment!\n- Statement Personnel`
        });
      }

      toast.showSuccess('Success', 'Loan settled successfully!');
      closeModal();
      fetchEmployeeData();
    } catch (error: any) {
      toast.showError('Error', 'Error settling loan: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveEmployee = () => {
    if (!selectedEmployee) return;
    setConfirmAction({
      message: `Are you sure you want to remove ${selectedEmployee.name}?`,
      onConfirm: async () => {
        setConfirmAction(null);
        setLoading(true);
        try {
          const { error: removeError } = await employeesApi.remove(selectedEmployee.id);
          if (removeError) throw new Error(removeError);
          toast.showSuccess('Success', 'Employee removed successfully!');
          setSelectedEmployee(null);
          closeModal();
          fetchEmployees();
        } catch (error: any) {
          toast.showError('Error', error.message);
        } finally {
          setLoading(false);
        }
      }
    });
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

  const calculateTotalLoanPayable = () => {
    if (!loanAmount || !interestRate) return 0;
    const amount = parseFloat(loanAmount);
    const rate = parseFloat(interestRate);
    return amount + (amount * rate / 100);
  };

  const calculateFinalPayable = () => {
    // For part-time employees with hourly rate
    if (selectedEmployee?.employment_type === 'part_time' && wageInfo && wageInfo.hourlyRate > 0) {
      const baseWage = wageInfo.hourlyRate * wageInfo.actualHoursWorked;
      const calculated = baseWage + adjustments.merits + adjustments.advances - adjustments.demerits - adjustments.loanDeductions - monthlyLoanDeduction;
      console.log('Part-time calculation:', {
        hourlyRate: wageInfo.hourlyRate,
        actualHoursWorked: wageInfo.actualHoursWorked,
        baseWage,
        adjustments,
        monthlyLoanDeduction,
        calculated
      });
      return calculated;
    }

    // For full-time employees, calculate from base salary
    const base = parseFloat(wageAmount) || 0;
    const calculated = base + adjustments.merits + adjustments.advances - adjustments.demerits - adjustments.loanDeductions - monthlyLoanDeduction;
    console.log('Full-time calculation:', {
      base,
      adjustments,
      monthlyLoanDeduction,
      calculated
    });
    return calculated;
  };

  const filteredEmployees = employees.filter(e => e.employment_type === activeTab);

  return (
    <>
    <div className="min-h-screen bg-gray-50 pb-20">
      <Header
        onReferFriend={onReferFriend}
        onMessages={onMessages}
        unreadCount={0}
      />

      <div className="max-w-md mx-auto bg-white min-h-screen pt-[75px]">
        <div className="bg-blue-600 text-white px-4 py-4 flex items-center justify-between">
          <button onClick={handleBack} className="p-2 hover:bg-white/20 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-semibold">Manage Employees</h1>
          <div className="w-10"></div>
        </div>

        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('full_time')}
            className={`flex-1 py-3 px-4 font-medium transition-colors ${activeTab === 'full_time' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            Full-time ({employees.filter(e => e.employment_type === 'full_time').length})
          </button>
          <button
            onClick={() => setActiveTab('part_time')}
            className={`flex-1 py-3 px-4 font-medium transition-colors ${activeTab === 'part_time' ? 'text-green-600 border-b-2 border-green-600 bg-green-50' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            Part-time ({employees.filter(e => e.employment_type === 'part_time').length})
          </button>
          <button
            onClick={() => setActiveTab('contract')}
            className={`flex-1 py-3 px-4 font-medium transition-colors ${activeTab === 'contract' ? 'text-amber-600 border-b-2 border-amber-600 bg-amber-50' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            Contract ({employees.filter(e => e.employment_type === 'contract').length})
          </button>
        </div>

        <div className="p-6">
          {filteredEmployees.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">No {activeTab.replace('_', '-')} employees</p>
              <p className="text-sm text-gray-500">Add employees from your home page</p>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Select Employee
                </label>
                <select
                  value={selectedEmployee?.id || ''}
                  onChange={(e) => {
                    const emp = filteredEmployees.find(employee => employee.id === e.target.value);
                    setSelectedEmployee(emp || null);
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                  {filteredEmployees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} - {emp.email || emp.phone}
                    </option>
                  ))}
                </select>
              </div>

              {selectedEmployee && (
                <>
                  <div className="flex items-center space-x-4 mb-4 p-4 bg-gray-50 rounded-lg">
                    <div className="w-16 h-16">
                      <ProfilePhoto name={selectedEmployee.name} photo={selectedEmployee.profile_photo} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{selectedEmployee.name}</h3>
                      <p className="text-sm text-gray-600">{selectedEmployee.email || selectedEmployee.phone}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                          selectedEmployee.employment_type === 'full_time' ? 'bg-blue-100 text-blue-700' :
                          selectedEmployee.employment_type === 'part_time' ? 'bg-green-100 text-green-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {selectedEmployee.employment_type.replace('_', '-').toUpperCase()}
                        </span>
                        {selectedEmployee.employment_type === 'part_time' && selectedEmployee.hourly_rate > 0 && (
                          <span className="text-xs text-gray-600 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {currency} {selectedEmployee.hourly_rate.toFixed(2)}/hr
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Only show "To Be Paid" summary for non-contract employees */}
                  {selectedEmployee?.employment_type !== 'contract' && wageAmount && (
                    <div className="mb-6 p-4 bg-gradient-to-r from-emerald-50 to-blue-50 rounded-lg border border-emerald-200">
                      <div className="space-y-2">
                        {/* Show different breakdown for part-time vs full-time */}
                        {selectedEmployee?.employment_type === 'part_time' && wageInfo && wageInfo.hourlyRate > 0 ? (
                          <>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Hourly Rate:</span>
                              <span className="font-semibold text-gray-900">{currency} {wageInfo.hourlyRate.toFixed(2)}/hr</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Hours Worked This Month:</span>
                              <span className="font-semibold text-gray-900">{wageInfo.actualHoursWorked.toFixed(2)} hrs</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Calculated Wage:</span>
                              <span className="font-semibold text-gray-900">{currency} {(wageInfo.hourlyRate * wageInfo.actualHoursWorked).toFixed(2)}</span>
                            </div>
                            {wageInfo.deductions > 0 && (
                              <div className="flex justify-between text-sm">
                                <span className="text-orange-600 flex items-center gap-1">
                                  <Minus className="w-3 h-3" /> Deductions:
                                </span>
                                <span className="font-semibold text-orange-600">-{currency} {wageInfo.deductions.toFixed(2)}</span>
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Base Salary:</span>
                              <span className="font-semibold text-gray-900">{currency} {parseFloat(wageAmount).toFixed(2)}</span>
                            </div>
                            {adjustments.merits > 0 && (
                              <div className="flex justify-between text-sm">
                                <span className="text-emerald-600 flex items-center gap-1">
                                  <Plus className="w-3 h-3" /> Merits:
                                </span>
                                <span className="font-semibold text-emerald-600">+{currency} {adjustments.merits.toFixed(2)}</span>
                              </div>
                            )}
                            {adjustments.advances > 0 && (
                              <div className="flex justify-between text-sm">
                                <span className="text-blue-600 flex items-center gap-1">
                                  <Plus className="w-3 h-3" /> Advances:
                                </span>
                                <span className="font-semibold text-blue-600">+{currency} {adjustments.advances.toFixed(2)}</span>
                              </div>
                            )}
                            {adjustments.demerits > 0 && (
                              <div className="flex justify-between text-sm">
                                <span className="text-red-600 flex items-center gap-1">
                                  <Minus className="w-3 h-3" /> Demerits:
                                </span>
                                <span className="font-semibold text-red-600">-{currency} {adjustments.demerits.toFixed(2)}</span>
                              </div>
                            )}
                            {adjustments.loanDeductions > 0 && (
                              <div className="flex justify-between text-sm">
                                <span className="text-orange-600 flex items-center gap-1">
                                  <Minus className="w-3 h-3" /> Loan Deductions:
                                </span>
                                <span className="font-semibold text-orange-600">-{currency} {adjustments.loanDeductions.toFixed(2)}</span>
                              </div>
                            )}
                            {monthlyLoanDeduction > 0 && (
                              <div className="flex justify-between text-sm">
                                <span className="text-orange-600 flex items-center gap-1">
                                  <Minus className="w-3 h-3" /> Monthly Loan:
                                </span>
                                <span className="font-semibold text-orange-600">-{currency} {monthlyLoanDeduction.toFixed(2)}</span>
                              </div>
                            )}
                          </>
                        )}
                        <div className="pt-2 border-t border-gray-300">
                          <div className="flex justify-between">
                            <span className="font-bold text-gray-900">To Be Paid:</span>
                            <span className="font-bold text-emerald-600 text-lg">{currency} {calculateFinalPayable().toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3 mb-6">
                    {/* Contract employees only show Pay Wage button */}
                    {selectedEmployee?.employment_type === 'contract' ? (
                      <>
                        <button
                          onClick={() => openActionModal('wages')}
                          className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-4 px-6 rounded-lg font-semibold transition-colors flex items-center justify-center space-x-2 shadow-lg"
                        >
                          <DollarSign className="w-6 h-6" />
                          <span>Pay Wage</span>
                        </button>

                        <button
                          onClick={() => openActionModal('delete')}
                          className="w-full bg-red-50 hover:bg-red-100 text-red-600 py-3 px-4 rounded-lg font-semibold transition-colors border border-red-200 flex items-center justify-center space-x-2"
                        >
                          <Trash2 className="w-5 h-5" />
                          <span>Remove Employee</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => openActionModal('wages')}
                          className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center space-x-2"
                        >
                          <DollarSign className="w-5 h-5" />
                          <span>{hasExistingWage ? 'Update Wage' : 'Set Wage'}{wageAmount ? ` : ${currency} ${parseFloat(wageAmount).toFixed(2)}` : ''}</span>
                        </button>

                        {/* Wage calculation details for part-time employees */}
                        {wageInfo && wageInfo.hourlyRate > 0 && selectedEmployee?.employment_type === 'part_time' && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-700">Hourly Rate:</span>
                              <span className="font-semibold text-gray-900">{currency} {wageInfo.hourlyRate.toFixed(2)}/hr</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-700">Hours Worked:</span>
                              <span className="font-semibold text-gray-900">{wageInfo.actualHoursWorked.toFixed(2)} hrs</span>
                            </div>
                            {wageInfo.deductions > 0 && (
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-700">Deductions:</span>
                                <span className="font-semibold text-red-600">-{currency} {wageInfo.deductions.toFixed(2)}</span>
                              </div>
                            )}
                            <div className="pt-2 border-t border-blue-300">
                              <div className="flex justify-between">
                                <span className="font-bold text-gray-900">Amount to Pay:</span>
                                <span className="font-bold text-emerald-600">{currency} {wageInfo.finalPayable.toFixed(2)}</span>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                          <button
                            onClick={() => openActionModal('merit')}
                            className="bg-green-500 hover:bg-green-600 text-white py-3 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center space-x-2"
                          >
                            <TrendingUp className="w-4 h-4" />
                            <span>Merit</span>
                          </button>

                          <button
                            onClick={() => openActionModal('demerit')}
                            className="bg-red-500 hover:bg-red-600 text-white py-3 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center space-x-2"
                          >
                            <TrendingDown className="w-4 h-4" />
                            <span>Demerit</span>
                          </button>

                          <button
                            onClick={() => openActionModal('advance')}
                            className="bg-blue-500 hover:bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center space-x-2"
                          >
                            <DollarSign className="w-4 h-4" />
                            <span>Advance</span>
                          </button>

                          <button
                            onClick={() => openActionModal('loan_deduction')}
                            className="bg-orange-500 hover:bg-orange-600 text-white py-3 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center space-x-2"
                          >
                            <Minus className="w-4 h-4" />
                            <span>Deduction</span>
                          </button>
                        </div>

                        <button
                          onClick={() => openActionModal('loan')}
                          className="w-full bg-purple-500 hover:bg-purple-600 text-white py-3 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center space-x-2"
                        >
                          <CreditCard className="w-5 h-5" />
                          <span>Give Loan{totalLoanBalance > 0 ? ` : ${currentCurrency} ${totalLoanBalance.toFixed(2)}` : ''}</span>
                        </button>

                        {totalLoanBalance > 0 && (
                          <button
                            onClick={() => openActionModal('foreclose')}
                            className="w-full bg-indigo-500 hover:bg-indigo-600 text-white py-3 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center space-x-2"
                          >
                            <XCircle className="w-5 h-5" />
                            <span>Foreclose Loan</span>
                          </button>
                        )}

                        <button
                          onClick={() => openActionModal('delete')}
                          className="w-full bg-red-50 hover:bg-red-100 text-red-600 py-3 px-4 rounded-lg font-semibold transition-colors border border-red-200 flex items-center justify-center space-x-2"
                        >
                          <Trash2 className="w-5 h-5" />
                          <span>Remove Employee</span>
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Modals */}
        {actionType && selectedEmployee && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm max-h-[90vh] overflow-y-auto">

              {actionType === 'wages' && (
                <>
                  {selectedEmployee.employment_type === 'contract' ? (
                    <>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Pay Contract Wage</h3>
                      <p className="text-sm text-gray-600 mb-4">for {selectedEmployee.name}</p>

                      {!showQRCode ? (
                        <>
                          <div className="space-y-4 mb-6">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Payment Amount ({currency})
                              </label>
                              <input
                                type="number"
                                value={wageAmount}
                                onChange={(e) => setWageAmount(e.target.value)}
                                placeholder="Enter payment amount"
                                step="0.01"
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                              />
                            </div>
                          </div>

                          <div className="flex space-x-3">
                            <button
                              onClick={closeModal}
                              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 px-4 rounded-lg font-medium transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleSetWages}
                              disabled={loading || !wageAmount || parseFloat(wageAmount) <= 0}
                              className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-3 px-4 rounded-lg font-medium transition-colors disabled:opacity-50"
                            >
                              {loading ? 'Generating...' : 'Generate QR'}
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-center mb-4">
                            <p className="text-sm text-gray-600 mb-2">Payment Amount</p>
                            <p className="text-2xl font-bold text-emerald-600">{currency} {parseFloat(wageAmount).toFixed(2)}</p>
                          </div>

                          <div className="bg-white p-4 rounded-lg border-2 border-gray-200 mb-4">
                            <div className="bg-white p-4 flex items-center justify-center">
                              <QRCode value={qrCodeValue} size={220} />
                            </div>
                          </div>

                          <p className="text-xs text-gray-600 text-center mb-4">
                            Ask the employee to scan this QR code to complete the payment
                          </p>

                          <button
                            onClick={closeModal}
                            className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 px-4 rounded-lg font-medium transition-colors"
                          >
                            Close
                          </button>
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">{hasExistingWage ? 'Update Monthly Wage' : 'Set Monthly Wage'}</h3>
                      <p className="text-sm text-gray-600 mb-4">for {selectedEmployee.name}</p>

                      <div className="space-y-4 mb-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Currency
                          </label>
                          <select
                            value={currency}
                            onChange={(e) => setCurrency(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                          >
                            <option value="USD">USD - US Dollar</option>
                            <option value="EUR">EUR - Euro</option>
                            <option value="GBP">GBP - British Pound</option>
                            <option value="INR">INR - Indian Rupee</option>
                            <option value="JPY">JPY - Japanese Yen</option>
                            <option value="CNY">CNY - Chinese Yuan</option>
                            <option value="KES">KES - Kenyan Shilling</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Monthly Wage
                          </label>
                          <input
                            type="number"
                            value={wageAmount}
                            onChange={(e) => setWageAmount(e.target.value)}
                            placeholder="Enter monthly wage"
                            step="0.01"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                          />
                        </div>
                      </div>

                      <div className="flex space-x-3">
                        <button
                          onClick={closeModal}
                          className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 px-4 rounded-lg font-medium transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSetWages}
                          disabled={loading}
                          className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-3 px-4 rounded-lg font-medium transition-colors disabled:opacity-50"
                        >
                          {loading ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                    </>
                  )}
                </>
              )}

              {actionType === 'loan' && !showQRCode && (
                <>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Grant Loan</h3>
                  <p className="text-sm text-gray-600 mb-4">to {selectedEmployee.name}</p>

                  <div className="space-y-4 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Loan Amount ({currentCurrency})
                      </label>
                      <input
                        type="number"
                        value={loanAmount}
                        onChange={(e) => setLoanAmount(e.target.value)}
                        placeholder="Enter loan amount"
                        step="0.01"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Interest Rate (%)
                      </label>
                      <input
                        type="number"
                        value={interestRate}
                        onChange={(e) => setInterestRate(e.target.value)}
                        placeholder="Enter interest rate"
                        step="0.1"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tenure (Months)
                      </label>
                      <input
                        type="number"
                        value={tenureMonths}
                        onChange={(e) => setTenureMonths(e.target.value)}
                        placeholder="Enter tenure in months"
                        step="1"
                        min="1"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      />
                    </div>

                    {loanAmount && interestRate && tenureMonths && (
                      <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                        <p className="text-sm font-medium text-gray-700">
                          Total to repay: <span className="text-purple-600 font-bold">
                            {currentCurrency} {calculateTotalLoanPayable().toFixed(2)}
                          </span>
                        </p>
                        <p className="text-sm font-medium text-gray-700 mt-2">
                          Monthly deduction: <span className="text-purple-600 font-bold">
                            {currentCurrency} {(calculateTotalLoanPayable() / parseInt(tenureMonths)).toFixed(2)}
                          </span>
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex space-x-3">
                    <button
                      onClick={closeModal}
                      className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 px-4 rounded-lg font-medium transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleGiveLoan}
                      disabled={loading}
                      className="flex-1 bg-purple-500 hover:bg-purple-600 text-white py-3 px-4 rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                      {loading ? 'Processing...' : 'Grant Loan'}
                    </button>
                  </div>
                </>
              )}

              {actionType === 'loan' && showQRCode && (
                <>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Loan QR Code</h3>
                  <p className="text-sm text-gray-600 mb-4">Ask {selectedEmployee.name} to scan this to receive the loan</p>

                  <div className="bg-white p-4 rounded-lg border-2 border-purple-200 mb-4">
                    <div className="w-48 h-48 mx-auto flex items-center justify-center">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(qrCodeValue)}&size=200x200`}
                        alt="QR Code"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </div>

                  <p className="text-xs text-gray-500 text-center mb-6">
                    Employee scans this QR to confirm loan receipt
                  </p>

                  <button
                    onClick={() => { closeModal(); fetchEmployeeData(); }}
                    className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 px-4 rounded-lg font-medium transition-colors"
                  >
                    Close
                  </button>
                </>
              )}

{(actionType === 'merit' || actionType === 'demerit' || actionType === 'advance' || actionType === 'loan_deduction') && (
                <>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 capitalize">{actionType.replace('_', ' ')}</h3>
                  <p className="text-sm text-gray-600 mb-4">for {selectedEmployee.name}</p>

                  <div className="space-y-4 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Amount ({currentCurrency})
                      </label>
                      <input
                        type="number"
                        value={adjustmentAmount}
                        onChange={(e) => setAdjustmentAmount(e.target.value)}
                        placeholder="Enter amount"
                        step="0.01"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Reason (Optional)
                      </label>
                      <textarea
                        value={adjustmentReason}
                        onChange={(e) => setAdjustmentReason(e.target.value)}
                        placeholder="Enter reason"
                        rows={3}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="flex space-x-3">
                    <button
                      onClick={closeModal}
                      className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 px-4 rounded-lg font-medium transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleAddAdjustment(actionType as 'merit' | 'demerit' | 'advance' | 'loan_deduction')}
                      disabled={loading}
                      className={`flex-1 ${
                        actionType === 'merit' ? 'bg-green-500 hover:bg-green-600' :
                        actionType === 'demerit' ? 'bg-red-500 hover:bg-red-600' :
                        actionType === 'advance' ? 'bg-blue-500 hover:bg-blue-600' :
                        'bg-orange-500 hover:bg-orange-600'
                      } text-white py-3 px-4 rounded-lg font-medium transition-colors disabled:opacity-50`}
                    >
                      {loading ? 'Processing...' : 'Add'}
                    </button>
                  </div>
                </>
              )}

              {actionType === 'foreclose' && !showQRCode && (
                <>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Foreclose Loan</h3>
                  <p className="text-sm text-gray-600 mb-4">for {selectedEmployee.name}</p>

                  <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200 mb-6">
                    <p className="text-sm text-gray-700 mb-2">Outstanding Loan Balance:</p>
                    <p className="text-2xl font-bold text-indigo-600">{currentCurrency} {totalLoanBalance.toFixed(2)}</p>

                    {employeeLoans.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <p className="text-xs font-semibold text-gray-600">Loan Details:</p>
                        {employeeLoans.map((loan, index) => (
                          <div key={loan.id} className="text-xs text-gray-600">
                            <span className="font-medium">Loan {index + 1}:</span> {currentCurrency} {(loan.remaining_amount || loan.total_amount).toFixed(2)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <p className="text-sm text-gray-600 mb-6">
                    Click "Generate QR" to create a payment QR code for the employee to scan and authenticate the payment.
                  </p>

                  <div className="flex space-x-3">
                    <button
                      onClick={closeModal}
                      className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 px-4 rounded-lg font-medium transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={async () => {
                        if (!user || !selectedEmployee) return;
                        const qrCode = crypto.randomUUID();
                        const { error } = await qrTransactions.create({
                          employee_id: selectedEmployee.id,
                          transaction_type: 'loan',
                          qr_code: qrCode,
                          amount: totalLoanBalance,
                          status: 'pending',
                          metadata: { loan_ids: employeeLoans.map(l => l.id) }
                        });
                        if (!error) {
                          setQrCodeValue(qrCode);
                          setShowQRCode(true);
                        } else {
                          toast.showError('Error', 'Error generating QR code');
                        }
                      }}
                      className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white py-3 px-4 rounded-lg font-medium transition-colors"
                    >
                      Generate QR
                    </button>
                  </div>
                </>
              )}

              {actionType === 'foreclose' && showQRCode && (
                <>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Scan to Pay</h3>
                  <p className="text-sm text-gray-600 mb-4">Amount: {currentCurrency} {totalLoanBalance.toFixed(2)}</p>

                  <div className="bg-white rounded-lg p-6 border-2 border-indigo-200 mb-6">
                    <div className="w-48 h-48 mx-auto bg-gray-100 rounded-lg flex items-center justify-center">
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

                  <p className="text-xs text-gray-500 text-center mb-6">
                    Employee scans this QR code to authenticate and complete the payment
                  </p>

                  <div className="flex space-x-3">
                    <button
                      onClick={closeModal}
                      className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 px-4 rounded-lg font-medium transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleForecloseLoan}
                      disabled={loading}
                      className="flex-1 bg-green-500 hover:bg-green-600 text-white py-3 px-4 rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                      {loading ? 'Processing...' : 'Confirm Payment'}
                    </button>
                  </div>
                </>
              )}

              {actionType === 'delete' && (
                <>
                  <div className="text-center mb-6">
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Trash2 className="w-6 h-6 text-red-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Remove Employee</h3>
                    <p className="text-sm text-gray-600">
                      Are you sure you want to remove {selectedEmployee.name}? This action cannot be undone.
                    </p>
                  </div>

                  <div className="flex space-x-3">
                    <button
                      onClick={closeModal}
                      className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 px-4 rounded-lg font-medium transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleRemoveEmployee}
                      disabled={loading}
                      className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 px-4 rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                      {loading ? 'Removing...' : 'Remove'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>

    {confirmAction && (
      <ConfirmModal
        message={confirmAction.message}
        onConfirm={confirmAction.onConfirm}
        onCancel={() => setConfirmAction(null)}
      />
    )}
    </>
  );
}
