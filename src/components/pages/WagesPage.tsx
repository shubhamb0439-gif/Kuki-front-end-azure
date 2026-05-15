import React, { useState, useEffect } from 'react';
import { FileText, Download, Lock, Mail } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import { employees as employeesApi, profiles, attendance, wages, messages, admin, emails } from '../../lib/api';
import { Header } from '../common/Header';
import { useSwipeGesture } from '../../hooks/useSwipeGesture';
import { generatePDFContent, generateStatementSummary } from '../../lib/statementHelper';
import { getCurrencySymbol } from '../../lib/currencyHelper';
import { getStatementAccessLevel } from '../../lib/subscriptionHelper';

interface Employee {
  id: string;
  name: string | null;
  email: string | null;
  phone?: string | null;
  profiles?: {
    name: string | null;
  } | null;
}

interface StatementData {
  wages: any[];
  loans: any[];
  advances: any[];
}

interface WagesPageProps {
  onReferFriend: () => void;
  onMessages: () => void;
}

export function WagesPage({ onReferFriend, onMessages }: WagesPageProps) {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const toast = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [startMonth, setStartMonth] = useState('');
  const [startYear, setStartYear] = useState('');
  const [endMonth, setEndMonth] = useState('');
  const [endYear, setEndYear] = useState('');
  const [filterAll, setFilterAll] = useState(true);
  const [filterWages, setFilterWages] = useState(false);
  const [filterLoans, setFilterLoans] = useState(false);
  const [filterAdvances, setFilterAdvances] = useState(false);
  const [filterMeritsDemerits, setFilterMeritsDemerits] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sendEmail, setSendEmail] = useState(false);
  const [userPlan, setUserPlan] = useState('free');

  const statementAccess = getStatementAccessLevel(userPlan);

  const months = [
    { value: '01', label: 'January' },
    { value: '02', label: 'February' },
    { value: '03', label: 'March' },
    { value: '04', label: 'April' },
    { value: '05', label: 'May' },
    { value: '06', label: 'June' },
    { value: '07', label: 'July' },
    { value: '08', label: 'August' },
    { value: '09', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' }
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - i);

  useEffect(() => {
    if (user?.role === 'employer') {
      fetchEmployees();
    }
    fetchUserPlan();
    setDefaultDates();
  }, [user]);

  const fetchUserPlan = async () => {
    if (!user) return;
    const { data } = await profiles.get(user.id);
    if (data) setUserPlan(data.subscription_plan || 'free');
  };

  const setDefaultDates = () => {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = String(now.getFullYear());
    setStartMonth(month);
    setStartYear(year);
    setEndMonth(month);
    setEndYear(year);
  };

  const fetchEmployees = async () => {
    if (!user) return;
    const { data, error } = await employeesApi.list();
    if (!error && data) {
      const formatted = (data as any[]).map(emp => ({
        id: emp.id,
        name: emp.name || 'Unknown Employee',
        email: emp.email || emp.phone
      }));
      setEmployees(formatted);
      if (formatted.length > 0) setSelectedEmployeeId(formatted[0].id);
    }
  };

  const handleFilterChange = (filter: string) => {
    if (filter === 'all') {
      setFilterAll(!filterAll);
      if (!filterAll) {
        setFilterWages(false);
        setFilterLoans(false);
        setFilterAdvances(false);
        setFilterMeritsDemerits(false);
      }
    } else {
      setFilterAll(false);
      if (filter === 'wages') setFilterWages(!filterWages);
      if (filter === 'loans') setFilterLoans(!filterLoans);
      if (filter === 'advances') setFilterAdvances(!filterAdvances);
      if (filter === 'merits_demerits') setFilterMeritsDemerits(!filterMeritsDemerits);
    }
  };

  const generateStatement = async () => {
    if (user?.role === 'employer' && !selectedEmployeeId) {
      toast.showError('Error', 'Please select an employee');
      return;
    }

    if (!startMonth || !startYear || !endMonth || !endYear) {
      toast.showError('Error', 'Please select start and end dates');
      return;
    }

    if (!filterAll && !filterWages && !filterLoans && !filterAdvances && !filterMeritsDemerits) {
      toast.showError('Error', 'Please select at least one filter option');
      return;
    }

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYearNum = now.getFullYear();
    const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const lastMonthYear = currentMonth === 1 ? currentYearNum - 1 : currentYearNum;

    if (statementAccess.allowedMonths === 'current_and_last') {
      const selectedStartYear = parseInt(startYear);
      const selectedStartMonth = parseInt(startMonth);
      const selectedEndYear = parseInt(endYear);
      const selectedEndMonth = parseInt(endMonth);

      const isCurrentMonth = selectedStartYear === currentYearNum && selectedStartMonth === currentMonth;
      const isLastMonth = selectedStartYear === lastMonthYear && selectedStartMonth === lastMonth;

      if (!isCurrentMonth && !isLastMonth) {
        toast.showWarning('Plan Limitation', 'Free and Core plans can only generate statements for current and last month');
        return;
      }
    } else if (statementAccess.allowedMonths === 'current_year') {
      const selectedStartYear = parseInt(startYear);
      const selectedEndYear = parseInt(endYear);

      if (selectedStartYear !== currentYearNum || selectedEndYear !== currentYearNum) {
        toast.showWarning('Plan Limitation', 'Pro plan can only generate statements for the current year');
        return;
      }
    }

    setLoading(true);
    try {
      const startDate = `${startYear}-${startMonth}-01`;
      const lastDay = new Date(parseInt(endYear), parseInt(endMonth), 0).getDate();
      const endDate = `${endYear}-${endMonth}-${String(lastDay).padStart(2, '0')}`;

      // Handle "All Employees" option
      if (selectedEmployeeId === 'all_employees' && user?.role === 'employer') {
        await generateAllEmployeesStatement(startDate, endDate);
        return;
      }

      let employeeId = selectedEmployeeId;
      let employmentType = 'full_time';

      if (user?.role === 'employee') {
        const { data: empList } = await employeesApi.list();
        const empRecord = (empList || []).find((e: any) => e.user_id === user.id);
        if (!empRecord) {
          toast.showError('Error', 'Employee data not found');
          setLoading(false);
          return;
        }
        employeeId = empRecord.id;
        employmentType = empRecord.employment_type || 'full_time';
      } else {
        const { data: empList } = await employeesApi.list();
        const empRecord = (empList || []).find((e: any) => e.id === employeeId);
        if (empRecord) employmentType = empRecord.employment_type || 'full_time';
      }

      const statementData: StatementData = {
        wages: [],
        loans: [],
        advances: []
      };

      if (filterAll || filterWages) {
        const { data: wageList } = await wages.list(employeeId);
        if (wageList && wageList.length > 0) statementData.wages = [wageList[0]];

        if (employmentType === 'contract') {
          const { data: contractList } = await wages.contracts.list(employeeId);
          const contractInPeriod = (contractList || []).filter((cp: any) => {
            const d = cp.payment_date ? cp.payment_date.substring(0, 10) : '';
            return d >= startDate && d <= endDate;
          });
          if (contractInPeriod.length > 0) {
            statementData.wages = [
              ...statementData.wages,
              ...contractInPeriod.map((cp: any) => ({ ...cp, is_contract_payment: true, monthly_wage: cp.amount }))
            ];
          }
        }
      }

      if (filterAll || filterLoans) {
        const { data: loanList } = await wages.loans.list(employeeId);
        statementData.loans = (loanList || []).filter((l: any) => {
          const created = l.created_at ? l.created_at.substring(0, 10) : '';
          const foreclosed = l.foreclosure_date ? l.foreclosure_date.substring(0, 10) : '';
          return (created >= startDate && created <= endDate) || (foreclosed >= startDate && foreclosed <= endDate);
        });
      }

      if (filterAll || filterAdvances || filterMeritsDemerits) {
        const { data: bonusList } = await wages.bonuses.list(employeeId);
        statementData.advances = (bonusList || []).filter((b: any) => {
          const created = b.created_at ? b.created_at.substring(0, 10) : '';
          return created >= startDate && created <= endDate;
        });
      }

      const pdfContent = generatePDFContent(statementData, language);
      const summary = generateStatementSummary(startMonth, startYear, endMonth, endYear, language);
      const statementMessage = `${summary}\n\n${pdfContent}`;

      const { error: insertError } = await wages.statements.create({
        user_id: user?.id,
        message: statementMessage
      });

      if (insertError) {
        console.error('Insert error:', insertError);
        toast.showError('Error', insertError);
      } else {
        toast.showSuccess('Success', 'Statement generated successfully');

        if (sendEmail && user?.email) {
          const { error: emailError } = await emails.sendStatement(
            user.email,
            'Your KUKI Wage Statement',
            statementMessage
          );
          if (emailError) {
            toast.showWarning('Email Failed', 'Statement saved but email could not be sent.');
          } else {
            toast.showSuccess('Email Sent', `Statement emailed to ${user.email}`);
          }
        }
      }
    } catch (error: any) {
      console.error('Statement generation error:', error);
      toast.showError('Error', error.message || 'Failed to generate statement');
    } finally {
      setLoading(false);
    }
  };

  const generateAllEmployeesStatement = async (startDate: string, endDate: string) => {
    try {
      if (!user) return;

      const { data: employerProfile } = await profiles.get(user.id);
      let currency = employerProfile?.currency || 'USD';
      const symbol = getCurrencySymbol(currency);

      const { data: empListData, error: empError } = await employeesApi.list();
      const allEmployees = (empListData || []).filter((e: any) => e.status === 'active');

      if (empError) throw new Error(empError);
      if (!allEmployees || allEmployees.length === 0) {
        toast.showWarning('No Employees', 'No active employees found');
        setLoading(false);
        return;
      }

      interface EmployeeFinancialData {
        name: string;
        wages: number;
        totalLoanAmount: number;
        outstandingLoan: number;
        monthlyDeduction: number;
        merits: number;
        demerits: number;
        advances: number;
        netPay: number;
      }

      const employeeDataList: EmployeeFinancialData[] = [];
      let grandTotalWages = 0;
      let grandTotalLoans = 0;
      let grandTotalMerits = 0;
      let grandTotalDemerits = 0;
      let grandTotalAdvances = 0;
      let grandTotalNetPay = 0;

      for (const employee of allEmployees) {
        const employeeName = (employee as any).name || 'Unknown';
        let empWages = 0;
        let empTotalLoan = 0;
        let empOutstandingLoan = 0;
        let empMonthlyDeduction = 0;
        let empMerits = 0;
        let empDemerits = 0;
        let empAdvances = 0;

        if (filterAll || filterWages) {
          const { data: wageList } = await wages.list(employee.id);
          if (wageList && wageList.length > 0) empWages = parseFloat(wageList[0].monthly_wage) || 0;

          if ((employee as any).employment_type === 'contract') {
            const { data: contractList } = await wages.contracts.list(employee.id);
            const inPeriod = (contractList || []).filter((cp: any) => {
              const d = cp.payment_date ? cp.payment_date.substring(0, 10) : '';
              return d >= startDate && d <= endDate;
            });
            empWages += inPeriod.reduce((sum: number, cp: any) => sum + (cp.amount || 0), 0);
          }
        }

        if (filterAll || filterLoans) {
          const { data: loanList } = await wages.loans.list(employee.id);
          const activeLoans = (loanList || []).filter((l: any) => l.status === 'active');
          empTotalLoan = activeLoans.reduce((sum: number, l: any) => sum + (parseFloat(l.amount) || 0), 0);
          empOutstandingLoan = activeLoans.reduce((sum: number, l: any) => sum + (parseFloat(l.remaining_amount) || 0), 0);
          empMonthlyDeduction = activeLoans.reduce((sum: number, l: any) => sum + (parseFloat(l.monthly_deduction) || 0), 0);
        }

        if (filterAll || filterAdvances || filterMeritsDemerits) {
          const { data: bonusList } = await wages.bonuses.list(employee.id);
          const inPeriod = (bonusList || []).filter((b: any) => {
            const d = b.created_at ? b.created_at.substring(0, 10) : '';
            return d >= startDate && d <= endDate;
          });
          empMerits = inPeriod.filter((b: any) => b.category === 'merit').reduce((sum: number, b: any) => sum + Math.abs(parseFloat(b.amount) || 0), 0);
          empDemerits = inPeriod.filter((b: any) => b.category === 'demerit').reduce((sum: number, b: any) => sum + Math.abs(parseFloat(b.amount) || 0), 0);
          empAdvances = inPeriod.filter((b: any) => b.category === 'advance').reduce((sum: number, b: any) => sum + Math.abs(parseFloat(b.amount) || 0), 0);
        }

        const netPay = Math.max(empWages + empMerits - empMonthlyDeduction - empDemerits - empAdvances, 0);

        employeeDataList.push({
          name: employeeName,
          wages: empWages,
          totalLoanAmount: empTotalLoan,
          outstandingLoan: empOutstandingLoan,
          monthlyDeduction: empMonthlyDeduction,
          merits: empMerits,
          demerits: empDemerits,
          advances: empAdvances,
          netPay: netPay
        });

        grandTotalWages += empWages;
        grandTotalLoans += empMonthlyDeduction;
        grandTotalMerits += empMerits;
        grandTotalDemerits += empDemerits;
        grandTotalAdvances += empAdvances;
        grandTotalNetPay += netPay;
      }

      const summary = generateStatementSummary(startMonth, startYear, endMonth, endYear, language);

      let statementContent = `${summary}\n\n`;
      statementContent += `EMPLOYEE-WISE DETAILED STATEMENT\n`;
      statementContent += `=================================\n\n`;
      statementContent += `Total Active Employees: ${allEmployees.length}\n\n`;
      statementContent += '='.repeat(60) + '\n\n';

      employeeDataList.forEach((empData, index) => {
        statementContent += `Employee Name: ${empData.name}\n\n`;
        statementContent += `  Base Wages: ${symbol}${empData.wages.toFixed(2)}\n\n`;

        if (empData.merits > 0) {
          statementContent += `  Merits (+): ${symbol}${empData.merits.toFixed(2)}\n\n`;
        }

        if (empData.totalLoanAmount > 0 || empData.outstandingLoan > 0 || empData.monthlyDeduction > 0) {
          statementContent += `  Loan:\n`;
          statementContent += `    Total Loan: ${symbol}${empData.totalLoanAmount.toFixed(2)}\n`;
          statementContent += `    Outstanding Amount: ${symbol}${empData.outstandingLoan.toFixed(2)}\n`;
          statementContent += `    Monthly Deduction (−): ${symbol}${empData.monthlyDeduction.toFixed(2)}\n\n`;
        }

        if (empData.demerits > 0) {
          statementContent += `  Demerits (−): ${symbol}${empData.demerits.toFixed(2)}\n\n`;
        }

        if (empData.advances > 0) {
          statementContent += `  Advances Deducted (−): ${symbol}${empData.advances.toFixed(2)}\n\n`;
        }

        statementContent += `  ─────────────────────────────────\n`;
        statementContent += `  Net Pay: ${symbol}${empData.netPay.toFixed(2)}\n`;

        if (index < employeeDataList.length - 1) {
          statementContent += '\n' + '-'.repeat(60) + '\n\n';
        }
      });

      statementContent += '\n' + '='.repeat(60) + '\n\n';
      statementContent += `FINAL SUMMARY\n`;
      statementContent += `=============\n\n`;
      statementContent += `Total Base Wages (All Employees): ${symbol}${grandTotalWages.toFixed(2)}\n\n`;
      statementContent += `Total Merits Added (+): ${symbol}${grandTotalMerits.toFixed(2)}\n\n`;
      statementContent += `Total Monthly Loan Deductions (−): ${symbol}${grandTotalLoans.toFixed(2)}\n\n`;
      statementContent += `Total Demerits (−): ${symbol}${grandTotalDemerits.toFixed(2)}\n\n`;
      statementContent += `Total Advances Deducted (−): ${symbol}${grandTotalAdvances.toFixed(2)}\n\n`;
      statementContent += `Grand Total Net Payable This Month: ${symbol}${grandTotalNetPay.toFixed(2)}\n`;
      statementContent += '\n' + '='.repeat(60) + '\n';

      const { error: insertError } = await wages.statements.create({
        user_id: user.id,
        message: statementContent
      });

      if (insertError) {
        console.error('Insert error:', insertError);
        toast.showError('Error', insertError);
      } else {
        toast.showSuccess('Success', 'Statement generated successfully');
      }
    } catch (error: any) {
      console.error('All employees statement error:', error);
      toast.showError('Error', error.message || 'Failed to generate statements');
    } finally {
      setLoading(false);
    }
  };


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

  return (
    <div className="flex-1 bg-gray-50 pb-20">
      <Header
        onReferFriend={onReferFriend}
        onMessages={onMessages}
        unreadCount={0}
      />
      <div className="max-w-md mx-auto bg-white min-h-screen pt-[75px]">
        <div className="p-6">
          <div className="flex items-center space-x-3 mb-6">
            <FileText className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Generate Statement</h1>
          </div>

          <div className="space-y-6">
            {user?.role === 'employer' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Select Employee
                </label>
                <select
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                  <option value="">Choose an employee</option>
                  {employees.length > 1 && (
                    <option value="all_employees">All Employees</option>
                  )}
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} - {emp.email}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {user?.role === 'employee' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm font-medium text-blue-900">Your Personal Statement</p>
                <p className="text-xs text-blue-700 mt-1">Generating statement for your account</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Start Month
                </label>
                <select
                  value={startMonth}
                  onChange={(e) => setStartMonth(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                  {months.map(m => {
                    const now = new Date();
                    const currentMonth = now.getMonth() + 1;
                    const currentYearNum = now.getFullYear();
                    const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
                    const monthNum = parseInt(m.value);
                    const selectedStartYearNum = parseInt(startYear) || currentYearNum;

                    const isFuture = selectedStartYearNum > currentYearNum ||
                      (selectedStartYearNum === currentYearNum && monthNum > currentMonth);

                    const isPlanRestricted = statementAccess.allowedMonths === 'current_and_last' &&
                      !(monthNum === currentMonth || monthNum === lastMonth);

                    return (
                      <option
                        key={m.value}
                        value={m.value}
                        disabled={isFuture || isPlanRestricted}
                      >
                        {m.label} {isPlanRestricted ? '🔒' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Start Year
                </label>
                <select
                  value={startYear}
                  onChange={(e) => setStartYear(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                  {years.map(y => {
                    const currentYearNum = new Date().getFullYear();
                    const isAllowed = statementAccess.allowedMonths === 'all_years' ||
                      (statementAccess.allowedMonths === 'current_year' && y === currentYearNum) ||
                      (statementAccess.allowedMonths === 'current_and_last' && (y === currentYearNum || y === currentYearNum - 1));

                    return (
                      <option
                        key={y}
                        value={y}
                        disabled={!isAllowed}
                      >
                        {y} {!isAllowed ? '🔒' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  End Month
                </label>
                <select
                  value={endMonth}
                  onChange={(e) => setEndMonth(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                  {months.map(m => {
                    const now = new Date();
                    const currentMonth = now.getMonth() + 1;
                    const currentYearNum = now.getFullYear();
                    const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
                    const monthNum = parseInt(m.value);
                    const selectedEndYearNum = parseInt(endYear) || currentYearNum;

                    const isFuture = selectedEndYearNum > currentYearNum ||
                      (selectedEndYearNum === currentYearNum && monthNum > currentMonth);

                    const isPlanRestricted = statementAccess.allowedMonths === 'current_and_last' &&
                      !(monthNum === currentMonth || monthNum === lastMonth);

                    return (
                      <option
                        key={m.value}
                        value={m.value}
                        disabled={isFuture || isPlanRestricted}
                      >
                        {m.label} {isPlanRestricted ? '🔒' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  End Year
                </label>
                <select
                  value={endYear}
                  onChange={(e) => setEndYear(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                  {years.map(y => {
                    const currentYearNum = new Date().getFullYear();
                    const isAllowed = statementAccess.allowedMonths === 'all_years' ||
                      (statementAccess.allowedMonths === 'current_year' && y === currentYearNum) ||
                      (statementAccess.allowedMonths === 'current_and_last' && (y === currentYearNum || y === currentYearNum - 1));

                    return (
                      <option
                        key={y}
                        value={y}
                        disabled={!isAllowed}
                      >
                        {y} {!isAllowed ? '🔒' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            {statementAccess.allowedMonths === 'current_and_last' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
                <Lock className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <strong>Limited Access:</strong> Your plan only allows statements for current and last month. Upgrade to Pro for full year access or Pro Plus for unlimited years.
                </div>
              </div>
            )}

            {statementAccess.allowedMonths === 'current_year' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
                <Lock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <strong>Current Year Only:</strong> Your Pro plan allows statements for the current year. Upgrade to Pro Plus for unlimited year access and email delivery.
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Filter Options
              </label>
              <div className="space-y-2">
                <label className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={filterAll}
                    onChange={() => handleFilterChange('all')}
                    className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-900">All</span>
                </label>

                {statementAccess.hasFilters && (
                  <>
                    <label className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={filterWages}
                        onChange={() => handleFilterChange('wages')}
                        disabled={filterAll}
                        className="w-5 h-5 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500 disabled:opacity-50"
                      />
                      <span className="text-sm font-medium text-gray-900">Wages</span>
                    </label>

                    <label className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={filterLoans}
                        onChange={() => handleFilterChange('loans')}
                        disabled={filterAll}
                        className="w-5 h-5 text-orange-600 border-gray-300 rounded focus:ring-orange-500 disabled:opacity-50"
                      />
                      <span className="text-sm font-medium text-gray-900">Loans</span>
                    </label>

                    <label className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={filterAdvances}
                        onChange={() => handleFilterChange('advances')}
                        disabled={filterAll}
                        className="w-5 h-5 text-orange-600 border-gray-300 rounded focus:ring-orange-500 disabled:opacity-50"
                      />
                      <span className="text-sm font-medium text-gray-900">Advances</span>
                    </label>

                    {user?.role === 'employer' && (
                      <label className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          checked={filterMeritsDemerits}
                          onChange={() => handleFilterChange('merits_demerits')}
                          disabled={filterAll}
                          className="w-5 h-5 text-orange-600 border-gray-300 rounded focus:ring-orange-500 disabled:opacity-50"
                        />
                        <span className="text-sm font-medium text-gray-900">Merits and Demerits</span>
                      </label>
                    )}
                  </>
                )}

                {!statementAccess.hasFilters && (
                  <div className="bg-gray-100 border border-gray-200 rounded-lg p-3 flex items-center gap-2">
                    <Lock className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">Advanced filters available in Pro and Pro Plus plans</span>
                  </div>
                )}
              </div>
            </div>

            {statementAccess.canEmailStatements && (
              <div>
                <label className="flex items-center space-x-3 p-3 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border border-blue-200 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={sendEmail}
                    onChange={(e) => setSendEmail(e.target.checked)}
                    className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <Mail className="w-5 h-5 text-blue-600" />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-gray-900">Email Statement to {user?.email}</span>
                    <p className="text-xs text-gray-600 mt-0.5">Pro Plus exclusive feature</p>
                  </div>
                </label>
              </div>
            )}

            <button
              onClick={generateStatement}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 px-6 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-lg"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  <span>Generate Statement</span>
                </>
              )}
            </button>

            <div className="text-xs text-gray-500 text-center space-y-1">
              <p>Statement will appear in the Messages section from "Statement Personnel"</p>
              {statementAccess.canEmailStatements && sendEmail && (
                <p className="text-blue-600 font-medium">Statement will also be emailed to {user?.email}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
