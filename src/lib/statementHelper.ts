import { LanguageCode, getTranslation } from './translations';
import { getCurrencySymbol } from './currencyHelper';

export interface WageData {
  monthly_wage: number;
  currency: string;
  payment_date?: string;
  updated_at: string;
}

export interface LoanData {
  amount: number;
  remaining_amount: number;
  currency: string;
  created_at: string;
  foreclosure_date?: string;
  deduction_amount?: number;
}

export interface BonusData {
  amount: number;
  currency: string;
  comment?: string;
  created_at: string;
}

export interface StatementData {
  wages: WageData[];
  loans: LoanData[];
  advances: BonusData[];
}

export const generatePDFContent = (
  data: StatementData,
  language: LanguageCode = 'en'
): string => {
  const t = (key: string) => getTranslation(key, language);

  let content = `${t('statement.title').toUpperCase()}\n\n`;
  let hasData = false;

  // Collect summary figures for net pay calculation
  let baseWage = 0;
  let currency = 'USD';
  let totalLoanDeduction = 0;
  let totalMerits = 0;
  let totalDemerits = 0;
  let totalAdvances = 0;
  // final_payable from DB (authoritative, same value shown in profile "To Be Paid")
  let dbFinalPayable: number | null = null;

  if (data.wages.length > 0) {
    hasData = true;
    content += `WAGES:\n\n`;

    data.wages.forEach((wage: any, index: number) => {
      const wageCurrency = wage.currency || 'USD';
      const symbol = getCurrencySymbol(wageCurrency);
      currency = wageCurrency;

      if (wage.is_contract_payment) {
        content += `Contract Payment${index > 0 ? ` ${index + 1}` : ''}:\n`;
        content += `  Amount: ${symbol}${Number(wage.monthly_wage).toFixed(2)}\n`;
        content += `  Payment Date: ${new Date(wage.payment_date).toLocaleDateString()}\n\n`;
        baseWage += Number(wage.monthly_wage) || 0;
      } else {
        content += `Monthly Wage:\n`;
        content += `  Base Amount: ${symbol}${Number(wage.monthly_wage).toFixed(2)}\n`;
        content += `  Currency: ${wageCurrency}\n`;
        content += `  Last Updated: ${new Date(wage.updated_at).toLocaleDateString()}\n`;
        if (wage.hourly_rate > 0) {
          content += `  Hourly Rate: ${symbol}${Number(wage.hourly_rate).toFixed(4)}\n`;
        }
        if (wage.actual_hours_worked > 0) {
          content += `  Actual Hours Worked: ${Number(wage.actual_hours_worked).toFixed(1)} hrs\n`;
        }
        content += `\n`;
        baseWage = Number(wage.monthly_wage) || 0;
        // Use the DB-computed final_payable so it matches the profile "To Be Paid"
        if (wage.final_payable != null) {
          dbFinalPayable = Number(wage.final_payable);
        }
      }
    });
  } else {
    content += `WAGES:\n  No wage record found\n\n`;
  }

  if (data.loans.length > 0) {
    hasData = true;
    content += `LOANS:\n`;

    data.loans.forEach((loan: any, index) => {
      const symbol = getCurrencySymbol(loan.currency || 'USD');
      const monthly = Number(loan.monthly_deduction) || 0;
      totalLoanDeduction += monthly;
      content += `\nLoan ${index + 1}:\n`;
      content += `  Principal: ${symbol}${Number(loan.amount).toFixed(2)}\n`;
      content += `  Total Repayable: ${symbol}${Number(loan.total_amount || loan.amount).toFixed(2)}\n`;
      content += `  Remaining: ${symbol}${Number(loan.remaining_amount).toFixed(2)}\n`;
      if (monthly > 0) content += `  Monthly Deduction: ${symbol}${monthly.toFixed(2)}\n`;
      content += `  Start Date: ${new Date(loan.created_at).toLocaleDateString()}\n`;
      if (loan.foreclosure_date) {
        content += `  Foreclosed On: ${new Date(loan.foreclosure_date).toLocaleDateString()}\n`;
      }
    });
    content += '\n';
  }

  if (data.advances.length > 0) {
    hasData = true;

    // Separate merits, demerits, advances
    const merits = (data.advances as any[]).filter(b => b.category === 'merit');
    const demerits = (data.advances as any[]).filter(b => b.category === 'demerit');
    const advances = (data.advances as any[]).filter(b => b.category === 'advance');
    const otherBonuses = (data.advances as any[]).filter(b => !['merit','demerit','advance'].includes(b.category));

    if (merits.length > 0) {
      content += `MERITS (+):\n`;
      merits.forEach((b: any, i) => {
        const symbol = getCurrencySymbol(b.currency || 'USD');
        const amt = Math.abs(Number(b.amount));
        totalMerits += amt;
        content += `\nMerit ${i + 1}:\n`;
        content += `  Amount: +${symbol}${amt.toFixed(2)}\n`;
        content += `  Date: ${new Date(b.created_at).toLocaleDateString()}\n`;
        if (b.comment) content += `  Reason: ${b.comment}\n`;
      });
      content += '\n';
    }

    if (demerits.length > 0) {
      content += `DEMERITS (−):\n`;
      demerits.forEach((b: any, i) => {
        const symbol = getCurrencySymbol(b.currency || 'USD');
        const amt = Math.abs(Number(b.amount));
        totalDemerits += amt;
        content += `\nDemerit ${i + 1}:\n`;
        content += `  Amount: −${symbol}${amt.toFixed(2)}\n`;
        content += `  Date: ${new Date(b.created_at).toLocaleDateString()}\n`;
        if (b.comment) content += `  Reason: ${b.comment}\n`;
      });
      content += '\n';
    }

    if (advances.length > 0) {
      content += `ADVANCES DEDUCTED (−):\n`;
      advances.forEach((b: any, i) => {
        const symbol = getCurrencySymbol(b.currency || 'USD');
        const amt = Math.abs(Number(b.amount));
        totalAdvances += amt;
        content += `\nAdvance ${i + 1}:\n`;
        content += `  Amount: −${symbol}${amt.toFixed(2)}\n`;
        content += `  Date: ${new Date(b.created_at).toLocaleDateString()}\n`;
      });
      content += '\n';
    }

    if (otherBonuses.length > 0) {
      content += `OTHER ADJUSTMENTS:\n`;
      otherBonuses.forEach((b: any, i) => {
        const symbol = getCurrencySymbol(b.currency || 'USD');
        content += `\nAdjustment ${i + 1}:\n`;
        content += `  Amount: ${symbol}${Number(b.amount).toFixed(2)}\n`;
        content += `  Date: ${new Date(b.created_at).toLocaleDateString()}\n`;
        if (b.comment) content += `  Reason: ${b.comment}\n`;
      });
      content += '\n';
    }
  }

  if (!hasData) {
    content += `\nNo data found for the selected period.\n`;
    return content;
  }

  // Net pay summary — use DB final_payable when available so it matches the profile "To Be Paid"
  const symbol = getCurrencySymbol(currency);
  const netPay = dbFinalPayable !== null
    ? dbFinalPayable
    : Math.max(baseWage + totalMerits - totalLoanDeduction - totalDemerits - totalAdvances, 0);
  content += `─────────────────────────────────────────\n`;
  content += `PAYMENT SUMMARY:\n\n`;
  content += `  Base Wage:              ${symbol}${baseWage.toFixed(2)}\n`;
  if (totalMerits > 0)        content += `  Merits (+):             ${symbol}${totalMerits.toFixed(2)}\n`;
  if (totalLoanDeduction > 0) content += `  Loan Deduction (−):     ${symbol}${totalLoanDeduction.toFixed(2)}\n`;
  if (totalDemerits > 0)      content += `  Demerits (−):           ${symbol}${totalDemerits.toFixed(2)}\n`;
  if (totalAdvances > 0)      content += `  Advances Deducted (−):  ${symbol}${totalAdvances.toFixed(2)}\n`;
  content += `  ─────────────────────────────────────\n`;
  content += `  Net To Be Paid:         ${symbol}${netPay.toFixed(2)}\n`;

  return content;
};

export const generateStatementSummary = (
  startMonth: string,
  startYear: string,
  endMonth: string,
  endYear: string,
  language: LanguageCode = 'en'
): string => {
  const months = [
    { value: '1', label: getTranslation('calendar.today', language) },
    { value: '2', label: 'February' },
    { value: '3', label: 'March' },
    { value: '4', label: 'April' },
    { value: '5', label: 'May' },
    { value: '6', label: 'June' },
    { value: '7', label: 'July' },
    { value: '8', label: 'August' },
    { value: '9', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' }
  ];

  const t = (key: string) => getTranslation(key, language);
  const startMonthLabel = months[parseInt(startMonth) - 1]?.label || startMonth;
  const endMonthLabel = months[parseInt(endMonth) - 1]?.label || endMonth;

  return `${t('statement.title')}\n\n${t('statement.period')}: ${startMonthLabel} ${startYear} - ${endMonthLabel} ${endYear}`;
};

export const translateMonths = (language: LanguageCode = 'en'): Array<{ value: string; label: string }> => {
  const monthKeys = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return monthKeys.map((month, index) => ({
    value: (index + 1).toString(),
    label: month
  }));
};
