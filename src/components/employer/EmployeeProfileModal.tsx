import React, { useState, useEffect } from 'react';
import { X, DollarSign, CreditCard, Gift, Trash2, XCircle, Star } from 'lucide-react';
import QRCode from 'react-qr-code';
import { employees, profiles, wages, admin, qrTransactions } from '../../lib/api';
import { Employee } from '../../types/auth';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import { Modal } from '../common/Modal';
import { ConfirmModal } from '../common/ConfirmModal';

interface EmployeeProfileModalProps {
  employee: Employee;
  onClose: () => void;
  onUpdate: () => void;
}

interface Loan {
  id: string;
  amount: number;
  interest_rate: number;
  total_amount: number;
  remaining_amount: number;
  status: string;
}

type ActionType = 'wages' | 'loan' | 'bonus' | 'advance' | 'foreclose';

export function EmployeeProfileModal({ employee, onClose, onUpdate }: EmployeeProfileModalProps) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { showSuccess, showError, showWarning } = useToast();
  const [actionType, setActionType] = useState<ActionType | null>(null);

  // True only for employees who registered via the app (have a real user account).
  // Robust against null, undefined, "", "null", "undefined" from backend.
  const isLinkedEmployee = Boolean(
    employee.user_id &&
    String(employee.user_id).trim() !== '' &&
    String(employee.user_id).trim() !== 'null' &&
    String(employee.user_id).trim() !== 'undefined'
  );

  const [currentWage, setCurrentWage] = useState<number | null>(null);
  const [wageInfo, setWageInfo] = useState<{
    hourlyRate: number;
    actualHoursWorked: number;
    finalPayable: number;
  } | null>(null);
  const [employeeCurrency, setEmployeeCurrency] = useState<string>('USD');
  const [wageAmount, setWageAmount] = useState('');
  const [loanAmount, setLoanAmount] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [monthlyDeduction, setMonthlyDeduction] = useState('');
  const [bonusAmount, setBonusAmount] = useState('');
  const [bonusType, setBonusType] = useState<'positive' | 'negative'>('positive');
  const [bonusComment, setBonusComment] = useState('');
  const [advanceAmount, setAdvanceAmount] = useState('');

  const [employeeLoans, setEmployeeLoans] = useState<Loan[]>([]);
  const [selectedLoans, setSelectedLoans] = useState<string[]>([]);
  const [totalLoanBalance, setTotalLoanBalance] = useState(0);
  const [monthlyLoanDeduction, setMonthlyLoanDeduction] = useState(0);
  const [totalBonuses, setTotalBonuses] = useState(0);
  const [totalAdvances, setTotalAdvances] = useState(0);
  const [showQRCode, setShowQRCode] = useState(false);
  const [qrCodeValue, setQrCodeValue] = useState('');
  const [averageRating, setAverageRating] = useState(0);
  const [ratingCount, setRatingCount] = useState(0);
  const [contractTotalPaid, setContractTotalPaid] = useState<number | null>(null);

  const [loading, setLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ message: string; onConfirm: () => void } | null>(null);

  useEffect(() => {
    fetchEmployeeData();
    fetchPerformanceRating();
  }, [employee.id]);

  const fetchPerformanceRating = async () => {
    if (!isLinkedEmployee || !employee.user_id) return;
    const { data: ratings } = await admin.ratings.listByEmployee(employee.user_id);
    if (ratings && ratings.length > 0) {
      const avg = ratings.reduce((sum: number, r: any) => sum + r.rating, 0) / ratings.length;
      setAverageRating(Math.round(avg * 10) / 10);
      setRatingCount(ratings.length);
    }
  };

  const fetchEmployeeData = async () => {
    // Fetch currency from employee's profile, or fall back to employer's
    const profileId = employee.user_id || employee.employer_id;
    if (profileId) {
      const { data: profileData } = await profiles.get(profileId);
      if (profileData?.currency) setEmployeeCurrency(profileData.currency);
    }

    // Fetch wage record
    const { data: wageList } = await wages.list(employee.id);
    const wageData = wageList?.[0] ?? null;

    if (wageData) {
      setCurrentWage(wageData.monthly_wage);
      setWageAmount(wageData.monthly_wage.toString());
      setWageInfo({
        hourlyRate: wageData.hourly_rate || 0,
        actualHoursWorked: wageData.actual_hours_worked || 0,
        finalPayable: wageData.final_payable || wageData.monthly_wage || 0
      });
    } else {
      setWageInfo(null);
    }

    // Fetch active loans
    const { data: loansData } = await wages.loans.list(employee.id);
    const activeLoans = (loansData || []).filter((l: any) => l.status === 'active');
    setEmployeeLoans(activeLoans);
    setTotalLoanBalance(activeLoans.reduce((s: number, l: any) => s + (l.remaining_amount || l.total_amount || 0), 0));
    setMonthlyLoanDeduction(activeLoans.reduce((s: number, l: any) => s + (l.monthly_deduction || 0), 0));

    // Fetch bonuses / merits / demerits / advances
    const { data: bonusData } = await wages.bonuses.list(employee.id);
    if (bonusData) {
      const merits  = bonusData.filter((b: any) => b.category === 'merit').reduce((s: number, b: any) => s + Math.abs(b.amount), 0);
      const demerits = bonusData.filter((b: any) => b.category === 'demerit').reduce((s: number, b: any) => s + Math.abs(b.amount), 0);
      setTotalBonuses(merits - demerits);
      setTotalAdvances(bonusData.filter((b: any) => b.category === 'advance').reduce((s: number, b: any) => s + Math.abs(b.amount), 0));
    } else {
      setTotalBonuses(0);
      setTotalAdvances(0);
    }

    // Fetch contract payments for current month
    if (employee.employment_type === 'contract') {
      const now = new Date();
      const { data: contractData } = await wages.contracts.list(employee.id);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      const thisMonth  = (contractData || []).filter((p: any) => {
        const d = new Date(p.payment_date);
        return d >= monthStart && d <= monthEnd;
      });
      setContractTotalPaid(thisMonth.reduce((s: number, p: any) => s + (p.amount || 0), 0));
    }
  };

  const openActionModal = (action: ActionType) => {
    setActionType(action);
    setLoanAmount('');
    setInterestRate('');
    setBonusAmount('');
    setAdvanceAmount('');
  };

  const closeActionModal = () => {
    setActionType(null);
    setLoanAmount('');
    setInterestRate('');
    setMonthlyDeduction('');
    setBonusAmount('');
    setBonusComment('');
    setBonusType('positive');
    setAdvanceAmount('');
    setShowQRCode(false);
    setQrCodeValue('');
    setSelectedLoans([]);
  };

  // Helper: recalculate final_payable in DB for all employee types and return updated values
  const recalculateWages = async (): Promise<{ finalPayable: number; merits: number; demerits: number; advances: number; loanDeductions: number } | null> => {
    if (employee.employment_type === 'contract') return null;
    const { data } = await wages.list(employee.id);
    if (data && data.length > 0) {
      return {
        finalPayable: data[0].final_payable,
        merits: data[0].merits,
        demerits: data[0].demerits,
        advances: data[0].advances,
        loanDeductions: data[0].loan_deductions
      };
    }
    return null;
  };

  const handleSetWages = async () => {
    if (!wageAmount) {
      showWarning('Missing Information', 'Please enter wage amount');
      return;
    }

    setLoading(true);
    try {
      const paymentAmount = parseFloat(wageAmount);

      // Contract employee payment
      if (employee.employment_type === 'contract') {
        const paymentDate = new Date();
        const paymentDateStr = paymentDate.toISOString();
        const paymentDateDisplay = paymentDate.toLocaleDateString();

        if (!isLinkedEmployee) {
          const { error: paymentError } = await wages.contracts.create({
            employee_id: employee.id,
            employer_id: user?.id,
            amount: paymentAmount,
            currency: employeeCurrency,
            payment_date: paymentDateStr
          });

          if (paymentError) throw new Error(paymentError);

          showSuccess('Payment Recorded', `Contract payment of ${employeeCurrency} ${paymentAmount.toFixed(2)} recorded successfully!`);
          closeActionModal();
          fetchEmployeeData();
          onUpdate();
          setLoading(false);
          return;
        }

        const timestamp = Date.now();
        const qrCode = `qr:pay_contract_wages:${user?.id}:${employee.id}:${timestamp}`;

        const { error: qrError } = await qrTransactions.create({
          qr_code: qrCode,
          transaction_type: 'pay_contract_wages',
          employee_id: employee.id,
          employer_id: user?.id,
          status: 'pending',
          metadata: {
            amount: paymentAmount,
            currency: employeeCurrency,
            employee_name: employee.name,
            employee_user_id: employee.user_id
          }
        });

        if (qrError) throw new Error(qrError);

        setQrCodeValue(qrCode);
        setShowQRCode(true);
        setLoading(false);
        return;
      }

      // Full-time and Part-time: set monthly wage
      const wageDateDisplay = new Date().toLocaleDateString();
      const monthlyWage = paymentAmount;
      const workingHoursPerDay = employee.working_hours_per_day || 8;
      const workingDaysPerMonth = employee.working_days_per_month || 22;
      const hourlyRate = employee.employment_type === 'part_time'
        ? monthlyWage / (workingHoursPerDay * workingDaysPerMonth)
        : 0;

      const { error: upsertError } = await wages.create({
        employee_id: employee.id,
        employer_id: employee.employer_id,
        monthly_wage: monthlyWage,
        currency: employeeCurrency,
        hourly_rate: hourlyRate,
        working_hours_per_day: workingHoursPerDay,
        total_working_days: workingDaysPerMonth,
        updated_at: new Date().toISOString()
      });

      if (upsertError) throw new Error(upsertError);

      if (employee.employment_type === 'part_time' && employee.working_hours_per_day && employee.working_days_per_month) {
        await employees.update(employee.id, {
          working_hours_per_day: workingHoursPerDay,
          working_days_per_month: workingDaysPerMonth
        });
      }

      // Recalculate final_payable for all types (full-time will use monthly_wage as base)
      const calc = await recalculateWages();
      const finalPayable = calc?.finalPayable ?? Math.max(monthlyWage - monthlyLoanDeduction - totalAdvances + totalBonuses, 0);

      if (isLinkedEmployee) {
        const typeLabel = employee.employment_type === 'part_time' ? 'Part-time' : 'Full-time';
        const deductionLines = [
          monthlyLoanDeduction > 0 ? `Loan Deduction/Month: ${employeeCurrency} ${monthlyLoanDeduction.toFixed(2)}` : null,
          (calc?.advances ?? totalAdvances) > 0 ? `Advances Deducted: ${employeeCurrency} ${(calc?.advances ?? totalAdvances).toFixed(2)}` : null,
          (calc?.demerits ?? 0) > 0 ? `Demerits Deducted: ${employeeCurrency} ${(calc?.demerits ?? 0).toFixed(2)}` : null,
          (calc?.merits ?? totalBonuses) > 0 ? `Merits Added: ${employeeCurrency} ${(calc?.merits ?? totalBonuses).toFixed(2)}` : null,
        ].filter(Boolean).join('\n');

        await wages.statements.create({
          user_id: employee.user_id,
          message: `WAGE ${currentWage !== null ? 'UPDATE' : 'SETUP'} CONFIRMATION\n\nDate: ${new Date().toLocaleDateString()}\nEmployee: ${employee.name}\nEmployment Type: ${typeLabel}\nMonthly Base Wage: ${employeeCurrency} ${monthlyWage.toFixed(2)}${employee.employment_type === 'part_time' ? `\nHourly Rate: ${employeeCurrency} ${hourlyRate.toFixed(4)}` : ''}\n${deductionLines ? `\n${deductionLines}` : ''}\n─────────────────────────────\nTotal To Be Paid: ${employeeCurrency} ${finalPayable.toFixed(2)}/month\n\nYour monthly wage has been ${currentWage !== null ? 'updated' : 'set'} successfully.\n\n- Statement Personnel`
        });
      }

      setCurrentWage(monthlyWage);
      setWageAmount(monthlyWage.toString());

      showSuccess('Wages Updated', 'Employee wages have been updated successfully!');
      closeActionModal();
      fetchEmployeeData();
      onUpdate();
    } catch (error: any) {
      showError('Update Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGiveLoan = async () => {
    if (!loanAmount || !interestRate || !monthlyDeduction) {
      showWarning('Missing Information', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const amount = parseFloat(loanAmount);
      const rate = parseFloat(interestRate);
      const deduction = parseFloat(monthlyDeduction);
      const totalAmount = amount + (amount * rate / 100);

      // Check if employee has a linked user account (QR-registered) or is manually added
      if (isLinkedEmployee) {
        // QR-registered employee: Generate QR code for employee to scan
        const qrCode = `qr:grant_loan:${user?.id}:${employee.id}:${Date.now()}`;

        const { error } = await qrTransactions.create({
          employer_id: user?.id,
          employee_id: employee.id,
          transaction_type: 'grant_loan',
          qr_code: qrCode,
          status: 'pending',
          metadata: {
            amount,
            interest_rate: rate,
            total_amount: totalAmount,
            monthly_deduction: deduction,
            currency: employeeCurrency,
            employee_user_id: employee.user_id,
            employee_name: employee.name
          }
        });

        if (!error) {
          setQrCodeValue(qrCode);
          setShowQRCode(true);
        } else {
          showError('QR Code Error', error);
        }
      } else {
        // Manually added employee: Grant loan directly without QR code
        const grantDate = new Date().toISOString();

        const { error: loanError } = await wages.loans.create({
          employee_id: employee.id,
          employer_id: user?.id,
          amount,
          interest_rate: rate,
          total_amount: totalAmount,
          remaining_amount: totalAmount,
          monthly_deduction: deduction,
          currency: employeeCurrency,
          status: 'active',
          loan_date: grantDate,
          paid_amount: 0
        });

        if (loanError) {
          showError('Loan Error', loanError);
          return;
        }

        showSuccess('Loan Granted', `Loan of ${employeeCurrency} ${amount.toFixed(2)} granted successfully to ${employee.name}!`);
        closeActionModal();
        fetchEmployeeData();
        onUpdate();
      }
    } catch (error: any) {
      showError('Loan Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGiveBonus = async () => {
    if (!bonusAmount || !bonusComment.trim()) {
      showWarning('Missing Information', 'Please enter amount and comment');
      return;
    }

    setLoading(true);
    try {
      const amount = parseFloat(bonusAmount);
      const finalAmount = bonusType === 'negative' ? -Math.abs(amount) : Math.abs(amount);

      const { error: bonusError } = await wages.bonuses.create({
        employee_id: employee.id,
        employer_id: employee.employer_id,
        amount: finalAmount,
        currency: employeeCurrency,
        type: bonusType,
        category: bonusType === 'positive' ? 'merit' : 'demerit',
        comment: bonusComment
      });

      if (bonusError) throw new Error(bonusError);

      const calc = await recalculateWages();
      const finalPayable = calc?.finalPayable ?? Math.max((currentWage ?? 0) - monthlyLoanDeduction - totalAdvances + totalBonuses + (bonusType === 'positive' ? amount : -amount), 0);

      if (isLinkedEmployee) {
        await wages.statements.create({
          user_id: employee.user_id,
          message: `${bonusType === 'positive' ? 'MERIT' : 'DEMERIT'} CONFIRMATION\n\nDate: ${new Date().toLocaleDateString()}\nEmployee: ${employee.name}\nType: ${bonusType === 'positive' ? 'Merit (+)' : 'Demerit (−)'}\nAmount: ${employeeCurrency} ${Math.abs(finalAmount).toFixed(2)}\nReason: ${bonusComment}\n─────────────────────────────\nUpdated To Be Paid: ${employeeCurrency} ${finalPayable.toFixed(2)}/month\n\n- Statement Personnel`
        });
      }

      showSuccess(`${bonusType === 'positive' ? 'Merit' : 'Demerit'} Recorded`, `${bonusType === 'positive' ? 'Merit' : 'Demerit'} has been recorded successfully!`);
      setBonusAmount('');
      setBonusComment('');
      setBonusType('positive');
      closeActionModal();
      fetchEmployeeData();
      onUpdate();
    } catch (error: any) {
      showError('Bonus Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGiveAdvance = async () => {
    if (!advanceAmount) {
      showWarning('Missing Information', 'Please enter advance amount');
      return;
    }

    setLoading(true);
    try {
      const advance = parseFloat(advanceAmount);

      const { error: advanceError } = await wages.bonuses.create({
        employee_id: employee.id,
        employer_id: employee.employer_id,
        amount: advance,
        currency: employeeCurrency,
        category: 'advance'
      });

      if (advanceError) throw new Error(advanceError);

      const calc = await recalculateWages();
      const finalPayable = calc?.finalPayable ?? Math.max((currentWage ?? 0) - monthlyLoanDeduction - totalAdvances - advance + totalBonuses, 0);

      if (isLinkedEmployee) {
        await wages.statements.create({
          user_id: employee.user_id,
          message: `SALARY ADVANCE CONFIRMATION\n\nDate: ${new Date().toLocaleDateString()}\nEmployee: ${employee.name}\nAdvance Amount: ${employeeCurrency} ${advance.toFixed(2)}\n─────────────────────────────\nUpdated To Be Paid: ${employeeCurrency} ${finalPayable.toFixed(2)}/month\n\nThis advance has been deducted from your salary.\n\n- Statement Personnel`
        });
      }

      showSuccess('Advance Granted', 'Advance has been granted successfully!');
      closeActionModal();
      fetchEmployeeData();
      onUpdate();
    } catch (error: any) {
      showError('Advance Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForecloseLoan = async () => {
    if (selectedLoans.length === 0) {
      showWarning('Selection Required', 'Please select at least one loan to foreclose');
      return;
    }

    setConfirmAction({
      message: `Are you sure you want to foreclose ${selectedLoans.length} loan(s)?`,
      onConfirm: async () => {
        setConfirmAction(null);
        handleForecloseConfirmed();
      }
    });
  };

  const handleForecloseConfirmed = async () => {
    setLoading(true);
    try {
      const foreclosureDate = new Date().toISOString();
      const foreclosureDateDisplay = new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });

      let totalAmount = 0;

      // Foreclose selected loans
      for (const loanId of selectedLoans) {
        const { data: loan } = await wages.loans.get(loanId);
        if (loan) {
          totalAmount += loan.remaining_amount || loan.total_amount;
          await wages.loans.update(loanId, {
            status: 'paid',
            foreclosure_date: foreclosureDate,
            remaining_amount: 0
          });
        }
      }

      if (isLinkedEmployee) {
        await wages.statements.create({
          user_id: employee.user_id,
          message: `LOAN FORECLOSURE CONFIRMATION\n\nForeclosure Date: ${foreclosureDateDisplay}\nTotal Amount Settled: ${employeeCurrency} ${totalAmount.toFixed(2)}\nNumber of Loans Closed: ${selectedLoans.length}\nStatus: Paid in Full\n\nAll selected loans have been successfully foreclosed and paid.\n\nThank you for your prompt settlement!\n\n- Statement Personnel`
        });
      }

      showSuccess('Loan Foreclosed', 'Loan(s) have been foreclosed successfully!');
      closeActionModal();
      fetchEmployeeData();
      onUpdate();
    } catch (error: any) {
      showError('Foreclose Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveEmployee = () => {
    setConfirmAction({
      message: `Are you sure you want to remove ${employee.name}?`,
      onConfirm: async () => {
        setConfirmAction(null);
        setLoading(true);
        try {
          await employees.remove(employee.id);
          showSuccess('Employee Removed', 'Employee has been removed successfully!');
          onUpdate();
          onClose();
        } catch (error: any) {
          showError('Remove Error', error.message);
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const calculateTotalLoanPayable = () => {
    if (!loanAmount || !interestRate) return 0;
    const amount = parseFloat(loanAmount);
    const rate = parseFloat(interestRate);
    return amount + (amount * rate / 100);
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
      <div className={`w-full h-full bg-gradient-to-br ${colors.gradientFrom} ${colors.gradientTo} rounded-full flex items-center justify-center`}>
        <span className="text-white font-semibold text-3xl">
          {name.charAt(0).toUpperCase()}
        </span>
      </div>
    );
  };

  return (
    <>
      <Modal isOpen={true} onClose={onClose} size="md">
        <div className="bg-white rounded-2xl flex flex-col shadow-xl h-full">
          <div className="flex-shrink-0 bg-white rounded-t-2xl border-b border-gray-200 p-4 flex items-center justify-between">
            <h3 className="text-xl font-bold text-gray-900">
              {employee.employment_type === 'full_time' ? 'Manage Full-time Employee' :
               employee.employment_type === 'part_time' ? 'Manage Part-time Employee' :
               employee.employment_type === 'contract' ? 'Manage Contract Employee' :
               'Manage Employee'}
            </h3>
            <button
              onClick={onClose}
              className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors flex-shrink-0"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          <div className="p-5 pb-6 space-y-4 overflow-y-auto flex-1 overscroll-contain">
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 mb-3">
                <ProfilePhoto name={employee.name} photo={employee.profile_photo} />
              </div>
              <h4 className="text-lg font-bold text-gray-900">{employee.name}</h4>
              <p className="text-xs text-gray-600">{employee.email || employee.phone}</p>
              {employee.profession && (
                <p className="text-xs text-gray-500">{employee.profession}</p>
              )}
              {employee.employment_type && (
                <span className={`mt-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
                  employee.employment_type === 'full_time' ? `${colors.primaryLight} ${colors.text}` :
                  employee.employment_type === 'part_time' ? 'bg-green-100 text-green-700' :
                  'bg-amber-100 text-amber-700'
                }`}>
                  {employee.employment_type === 'full_time' ? 'Full-time' :
                   employee.employment_type === 'part_time' ? 'Part-time' :
                   'Contract'}
                </span>
              )}
              {ratingCount > 0 && (
                <div className="flex items-center mt-1.5 bg-yellow-50 px-2.5 py-0.5 rounded-full">
                  <Star className="w-3.5 h-3.5 text-yellow-400 fill-current mr-1" />
                  <span className="text-xs font-semibold text-yellow-700">{averageRating.toFixed(1)}</span>
                  <span className="text-xs text-yellow-600 ml-0.5">({ratingCount} reviews)</span>
                </div>
              )}
              <div className="mt-2 flex flex-col items-center gap-1">
                {employee.employment_type === 'contract' ? (
                  contractTotalPaid !== null && (
                    <p className="text-sm text-emerald-600 font-semibold">
                      Paid This Month: {employeeCurrency} {contractTotalPaid.toFixed(2)}
                    </p>
                  )
                ) : (
                  currentWage !== null && (
                    <>
                      <p className="text-sm text-emerald-600 font-semibold">
                        Base Wage: {employeeCurrency} {(currentWage ?? 0).toFixed(2)}/month
                      </p>
                      <p className="text-sm font-bold text-emerald-700">
                        To Be Paid: {employeeCurrency} {
                          wageInfo && wageInfo.finalPayable > 0
                            ? Math.max(wageInfo.finalPayable, 0).toFixed(2)
                            : Math.max((currentWage ?? 0) - monthlyLoanDeduction - totalAdvances + totalBonuses, 0).toFixed(2)
                        }/month
                      </p>
                    </>
                  )
                )}
              </div>
            </div>

            <div className="space-y-2">
              {/* Contract employees only show Pay Wage button */}
              {employee.employment_type === 'contract' ? (
                <>
                  <button
                    onClick={() => openActionModal('wages')}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3.5 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center space-x-2 shadow-md"
                  >
                    <DollarSign className="w-5 h-5" />
                    <span>Pay Wage</span>
                  </button>

                  <button
                    onClick={handleRemoveEmployee}
                    className="w-full bg-red-50 hover:bg-red-100 text-red-600 py-2.5 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2 border border-red-200"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Remove Employee</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => openActionModal('wages')}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-2.5 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
                  >
                    <DollarSign className="w-4 h-4" />
                    <span>{currentWage !== null ? 'Update Wage' : 'Set Wages'}{currentWage !== null ? ` : ${employeeCurrency} ${currentWage.toFixed(2)}` : ''}</span>
                  </button>

                  <button
                    onClick={() => openActionModal('loan')}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2.5 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Give Loan{totalLoanBalance > 0 ? ` : ${employeeCurrency} ${totalLoanBalance.toFixed(2)}` : ''}</span>
                  </button>

                  <button
                    onClick={() => openActionModal('bonus')}
                    className="w-full bg-purple-500 hover:bg-purple-600 text-white py-2.5 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
                  >
                    <Gift className="w-4 h-4" />
                    <span>Merits/Demerits{totalBonuses !== 0 ? ` : ${employeeCurrency} ${totalBonuses.toFixed(2)}` : ''}</span>
                  </button>

                  <button
                    onClick={() => openActionModal('advance')}
                    className={`w-full ${colors.primary} ${colors.primaryHover} text-white py-2.5 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2`}
                  >
                    <DollarSign className="w-4 h-4" />
                    <span>Give Advance{totalAdvances !== 0 ? ` : ${employeeCurrency} ${totalAdvances.toFixed(2)}` : ''}</span>
                  </button>

                  {totalLoanBalance > 0 && (
                    <button
                      onClick={() => openActionModal('foreclose')}
                      className="w-full bg-indigo-500 hover:bg-indigo-600 text-white py-2.5 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Foreclose Loan</span>
                    </button>
                  )}

                  <button
                    onClick={handleRemoveEmployee}
                    className="w-full bg-red-50 hover:bg-red-100 text-red-600 py-2.5 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2 border border-red-200"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Remove Employee</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </Modal>

      {actionType && (
        <Modal isOpen={true} onClose={() => setActionType(null)} size="sm">
          <div className="bg-white rounded-2xl flex flex-col shadow-xl h-full">
            <div className="p-6 pb-4 overflow-y-auto flex-1 overscroll-contain">
            {actionType === 'wages' && (
              <>
                {employee.employment_type === 'contract' ? (
                  <>
                    {!showQRCode ? (
                      <>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Pay Contract Wage</h3>
                        <p className="text-sm text-gray-600 mb-4">for {employee.name}</p>

                        <div className="space-y-4 mb-6">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Payment Amount ({employeeCurrency})
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
                      </>
                    ) : (
                      <>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Contract Payment QR Code</h3>
                        <p className="text-sm text-gray-600 mb-4">for {employee.name}</p>

                        <div className="text-center mb-4">
                          <p className="text-sm text-gray-600 mb-2">Payment Amount</p>
                          <p className="text-2xl font-bold text-emerald-600">{employeeCurrency} {parseFloat(wageAmount).toFixed(2)}</p>
                        </div>

                        <div className="bg-white p-4 rounded-lg border-2 border-gray-200 mb-4">
                          <div className="bg-white p-4 flex items-center justify-center">
                            <QRCode value={qrCodeValue} size={200} />
                          </div>
                        </div>

                        <p className="text-xs text-gray-600 text-center mb-6">
                          Ask {employee.name} to scan this QR code to complete the payment
                        </p>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Set Monthly Wages</h3>
                    <p className="text-sm text-gray-600 mb-4">for {employee.name}</p>

                    <div className="space-y-4 mb-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Currency
                        </label>
                        <div className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-700">
                          {employeeCurrency}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Employee's preferred currency (set in profile)</p>
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
                  </>
                )}
              </>
            )}

            {actionType === 'loan' && !showQRCode && (
              <>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Grant Loan</h3>
                <p className="text-sm text-gray-600 mb-4">to {employee.name}</p>

                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Currency
                    </label>
                    <div className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-700">
                      {employeeCurrency}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Employee's preferred currency</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Loan Amount
                    </label>
                    <input
                      type="number"
                      value={loanAmount}
                      onChange={(e) => setLoanAmount(e.target.value)}
                      placeholder="Enter loan amount"
                      step="0.01"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
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
                      className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 ${colors.ring.replace('ring-', 'focus:ring-')} focus:border-orange-500`}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Monthly Deduction
                    </label>
                    <input
                      type="number"
                      value={monthlyDeduction}
                      onChange={(e) => setMonthlyDeduction(e.target.value)}
                      placeholder="Enter monthly deduction"
                      step="0.01"
                      className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 ${colors.ring.replace('ring-', 'focus:ring-')} focus:border-orange-500`}
                    />
                  </div>

                  {loanAmount && interestRate && monthlyDeduction && (
                    <div className="bg-orange-50 rounded-lg p-4 border border-orange-200 space-y-2">
                      <p className="text-sm font-medium text-gray-700">
                        Total to repay: <span className="text-orange-600 font-bold">
                          {employeeCurrency} {calculateTotalLoanPayable().toFixed(2)}
                        </span>
                      </p>
                      <p className="text-sm font-medium text-gray-700">
                        Tenure: <span className="text-orange-600 font-bold">
                          {Math.ceil(calculateTotalLoanPayable() / parseFloat(monthlyDeduction))} months
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}

            {actionType === 'loan' && showQRCode && (
              <>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Loan Grant QR Code</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Employee must scan this QR code to confirm receipt of loan
                </p>

                <div className="bg-white rounded-lg p-6 border-2 border-orange-200 mb-4">
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
                  Once the employee scans this code, the loan will be granted and a statement will be generated
                </p>
              </>
            )}

            {actionType === 'bonus' && (
              <>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Merits and Demerits</h3>
                <p className="text-sm text-gray-600 mb-4">for {employee.name}</p>

                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Type
                    </label>
                    <select
                      value={bonusType}
                      onChange={(e) => setBonusType(e.target.value as 'positive' | 'negative')}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    >
                      <option value="positive">Positive (+) - Reward</option>
                      <option value="negative">Negative (−) - Penalty</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Currency
                    </label>
                    <div className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-700">
                      {employeeCurrency}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Employee's preferred currency</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Amount
                    </label>
                    <input
                      type="number"
                      value={bonusAmount}
                      onChange={(e) => setBonusAmount(e.target.value)}
                      placeholder="Enter amount"
                      step="0.01"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reason / Comment
                    </label>
                    <textarea
                      value={bonusComment}
                      onChange={(e) => setBonusComment(e.target.value)}
                      placeholder="Enter reason for merit or demerit"
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
                    />
                  </div>
                </div>
              </>
            )}

            {actionType === 'advance' && (
              <>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Give Advance</h3>
                <p className="text-sm text-gray-600 mb-4">to {employee.name}</p>

                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Currency
                    </label>
                    <div className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-700">
                      {employeeCurrency}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Employee's preferred currency</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Advance Amount
                    </label>
                    <input
                      type="number"
                      value={advanceAmount}
                      onChange={(e) => setAdvanceAmount(e.target.value)}
                      placeholder="Enter advance amount"
                      step="0.01"
                      className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 ${colors.ring}`}
                    />
                  </div>
                </div>
              </>
            )}

            {actionType === 'foreclose' && (
              <>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Foreclose Loan</h3>
                <p className="text-sm text-gray-600 mb-4">for {employee.name}</p>

                <div className="space-y-3 mb-6">
                  <p className="text-sm font-semibold text-gray-700">Select loans to foreclose:</p>
                  {employeeLoans.length > 0 ? (
                    employeeLoans.map((loan, index) => (
                      <div key={loan.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <input
                          type="checkbox"
                          id={`loan-${loan.id}`}
                          checked={selectedLoans.includes(loan.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedLoans([...selectedLoans, loan.id]);
                            } else {
                              setSelectedLoans(selectedLoans.filter(id => id !== loan.id));
                            }
                          }}
                          className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                        />
                        <label htmlFor={`loan-${loan.id}`} className="flex-1 cursor-pointer">
                          <div className="text-sm font-medium text-gray-900">Loan {index + 1}</div>
                          <div className="text-xs text-gray-600">
                            Remaining: {employeeCurrency} {(loan.remaining_amount || loan.total_amount).toFixed(2)}
                          </div>
                        </label>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">No active loans</p>
                  )}
                </div>

                {selectedLoans.length > 0 && (
                  <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200 mb-6">
                    <p className="text-sm text-gray-700">Total Amount to Foreclose:</p>
                    <p className="text-2xl font-bold text-indigo-600">
                      {employeeCurrency} {employeeLoans
                        .filter(loan => selectedLoans.includes(loan.id))
                        .reduce((sum, loan) => sum + (loan.remaining_amount || loan.total_amount), 0)
                        .toFixed(2)}
                    </p>
                  </div>
                )}

                <p className="text-sm text-gray-600 mb-6">
                  Select loans and click "Foreclose" to immediately close the selected loans. The employee will receive a statement confirming the closure.
                </p>
              </>
            )}
            </div>

            <div className="flex-shrink-0 p-6 pt-4 border-t border-gray-200 bg-white rounded-b-2xl">
              {actionType === 'wages' && (
                <div className="flex space-x-3">
                  <button onClick={closeActionModal} className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 px-4 rounded-lg font-medium transition-colors">
                    {showQRCode ? 'Close' : 'Cancel'}
                  </button>
                  {!showQRCode && (
                    <button
                      onClick={handleSetWages}
                      disabled={loading || !wageAmount || parseFloat(wageAmount) <= 0}
                      className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-3 px-4 rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                      {loading
                        ? (employee.employment_type === 'contract' && isLinkedEmployee ? 'Generating...' : employee.employment_type === 'contract' ? 'Processing...' : 'Saving...')
                        : (employee.employment_type === 'contract' && isLinkedEmployee ? 'Generate QR' : employee.employment_type === 'contract' ? 'Record Payment' : 'Save')
                      }
                    </button>
                  )}
                </div>
              )}
              {actionType === 'loan' && !showQRCode && (
                <div className="flex space-x-3">
                  <button onClick={closeActionModal} className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 px-4 rounded-lg font-medium transition-colors">Cancel</button>
                  <button onClick={handleGiveLoan} disabled={loading} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-3 px-4 rounded-lg font-medium transition-colors disabled:opacity-50">
                    {loading ? 'Processing...' : (isLinkedEmployee ? 'Generate QR' : 'Grant Loan')}
                  </button>
                </div>
              )}
              {actionType === 'loan' && showQRCode && (
                <div className="flex space-x-3">
                  <button onClick={closeActionModal} className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 px-4 rounded-lg font-medium transition-colors">Close</button>
                  <button onClick={() => navigator.share && navigator.share({ text: qrCodeValue })} className={`flex-1 ${colors.primary} ${colors.primaryHover} text-white py-3 px-4 rounded-lg font-medium transition-colors`}>Share</button>
                </div>
              )}
              {actionType === 'bonus' && (
                <div className="flex space-x-3">
                  <button onClick={closeActionModal} className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 px-4 rounded-lg font-medium transition-colors">Cancel</button>
                  <button onClick={handleGiveBonus} disabled={loading} className={`flex-1 ${bonusType === 'positive' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'} text-white py-3 px-4 rounded-lg font-medium transition-colors disabled:opacity-50`}>{loading ? 'Processing...' : (bonusType === 'positive' ? 'Add Merit' : 'Add Demerit')}</button>
                </div>
              )}
              {actionType === 'advance' && (
                <div className="flex space-x-3">
                  <button onClick={closeActionModal} className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 px-4 rounded-lg font-medium transition-colors">Cancel</button>
                  <button onClick={handleGiveAdvance} disabled={loading} className={`flex-1 ${colors.primary} ${colors.primaryHover} text-white py-3 px-4 rounded-lg font-medium transition-colors disabled:opacity-50`}>{loading ? 'Processing...' : 'Give Advance'}</button>
                </div>
              )}
              {actionType === 'foreclose' && (
                <div className="flex space-x-3">
                  <button onClick={closeActionModal} className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 px-4 rounded-lg font-medium transition-colors">Cancel</button>
                  <button onClick={handleForecloseLoan} disabled={loading || selectedLoans.length === 0} className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white py-3 px-4 rounded-lg font-medium transition-colors disabled:opacity-50">{loading ? 'Processing...' : 'Foreclose'}</button>
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

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
