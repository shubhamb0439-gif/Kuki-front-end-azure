interface SubscriptionFeatures {
  maxEmployees: number;
  canTrackAttendance: boolean;
  canAccessFullStatements: boolean;
  isMultiUser: boolean;
  supportsContractors: boolean; // Only Pro Plus supports contract employment type
  reportingLevel: 'basic' | 'standard' | 'advanced';
  adLevel: 'multiple' | 'single' | 'none';
}

export interface StatementAccessLevel {
  hasFilters: boolean;
  allowedMonths: 'current_and_last' | 'current_year' | 'all_years';
  canEmailStatements: boolean;
  maxYearsBack: number;
}

export function getSubscriptionFeatures(
  plan: string,
  isPaidCore?: boolean,
  maxEmployees?: number,
  canTrackAttendance?: boolean,
  canAccessFullStatements?: boolean,
  isMultiUser?: boolean,
  supportsContractors?: boolean,
  reportingLevel?: 'basic' | 'standard' | 'advanced',
  adLevel?: 'multiple' | 'single' | 'none'
): SubscriptionFeatures {
  if (
    maxEmployees !== undefined &&
    canTrackAttendance !== undefined &&
    canAccessFullStatements !== undefined &&
    isMultiUser !== undefined &&
    supportsContractors !== undefined &&
    reportingLevel !== undefined &&
    adLevel !== undefined
  ) {
    return {
      maxEmployees,
      canTrackAttendance,
      canAccessFullStatements,
      isMultiUser,
      supportsContractors,
      reportingLevel,
      adLevel
    };
  }

  switch (plan) {
    case 'free':
      return {
        maxEmployees: 1,
        canTrackAttendance: false,
        canAccessFullStatements: false,
        isMultiUser: false,
        supportsContractors: false,
        reportingLevel: 'basic',
        adLevel: 'multiple'
      };
    case 'core':
      return {
        maxEmployees: 3,
        canTrackAttendance: true,
        canAccessFullStatements: true,
        isMultiUser: false,
        supportsContractors: false,
        reportingLevel: 'standard',
        adLevel: 'multiple'
      };
    case 'pro':
      return {
        maxEmployees: 6,
        canTrackAttendance: true,
        canAccessFullStatements: true,
        isMultiUser: true,
        supportsContractors: false,
        reportingLevel: 'standard',
        adLevel: 'single'
      };
    case 'pro_plus':
      return {
        maxEmployees: 12,
        canTrackAttendance: true,
        canAccessFullStatements: true,
        isMultiUser: true,
        supportsContractors: true,
        reportingLevel: 'advanced',
        adLevel: 'none'
      };
    default:
      return {
        maxEmployees: 1,
        canTrackAttendance: false,
        canAccessFullStatements: false,
        isMultiUser: false,
        supportsContractors: false,
        reportingLevel: 'basic',
        adLevel: 'multiple'
      };
  }
}

export function canAddMoreEmployees(currentCount: number, maxEmployees: number): boolean {
  return currentCount < maxEmployees;
}

export function getEmployeeLimit(plan: string, isPaidCore?: boolean): number {
  const features = getSubscriptionFeatures(plan, isPaidCore);
  return features.maxEmployees;
}

export function getPlanDisplayName(plan: string): string {
  switch (plan) {
    case 'free':
      return 'Free';
    case 'core':
      return 'Core';
    case 'pro':
      return 'Pro';
    case 'pro_plus':
      return 'Pro Plus';
    default:
      return 'Free';
  }
}

export function getTierDisplayName(tier: string): string {
  switch (tier) {
    case 'core':
      return 'Core Account';
    case 'plus':
      return 'Plus Account';
    default:
      return 'Unknown';
  }
}

export function getPlanBadgeColor(plan: string): string {
  switch (plan) {
    case 'free':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    case 'core':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'pro':
      return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'pro_plus':
      return 'bg-purple-100 text-purple-800 border-purple-300';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export function getTierBadgeColor(tier: string): string {
  return 'bg-blue-100 text-blue-800 border-blue-200';
}

export function isFeatureBlocked(
  feature: 'attendance' | 'full_statements' | 'multi_user' | 'contractors' | 'advanced_reporting',
  canTrackAttendance: boolean,
  canAccessFullStatements: boolean,
  isMultiUser?: boolean,
  supportsContractors?: boolean,
  reportingLevel?: string
): boolean {
  switch (feature) {
    case 'attendance':
      return !canTrackAttendance;
    case 'full_statements':
      return !canAccessFullStatements;
    case 'multi_user':
      return !isMultiUser;
    case 'contractors':
      return !supportsContractors;
    case 'advanced_reporting':
      return reportingLevel !== 'advanced';
    default:
      return false;
  }
}

export function getPlanPrice(plan: string): string {
  switch (plan) {
    case 'free':
      return 'Free';
    case 'core':
      return '$4.95/month';
    case 'pro':
      return '$19.95/month';
    case 'pro_plus':
      return '$29.95/month';
    default:
      return 'Free';
  }
}

export function getAdDisplayLevel(adLevel: 'multiple' | 'single' | 'none'): string {
  switch (adLevel) {
    case 'multiple':
      return 'Multiple Adverts';
    case 'single':
      return 'Single Advert';
    case 'none':
      return 'No Adverts';
    default:
      return 'Multiple Adverts';
  }
}

export function canUseContractEmployment(plan: string): boolean {
  return plan === 'pro_plus';
}

export function getAllowedEmploymentTypes(plan: string): ('full_time' | 'part_time' | 'contract')[] {
  if (plan === 'pro_plus') {
    return ['full_time', 'part_time', 'contract'];
  }
  return ['full_time', 'part_time'];
}

export function getStatementAccessLevel(plan: string): StatementAccessLevel {
  switch (plan) {
    case 'free':
      return {
        hasFilters: false,
        allowedMonths: 'current_and_last',
        canEmailStatements: false,
        maxYearsBack: 0
      };
    case 'core':
      return {
        hasFilters: false,
        allowedMonths: 'current_and_last',
        canEmailStatements: false,
        maxYearsBack: 0
      };
    case 'pro':
      return {
        hasFilters: true,
        allowedMonths: 'current_year',
        canEmailStatements: false,
        maxYearsBack: 0
      };
    case 'pro_plus':
      return {
        hasFilters: true,
        allowedMonths: 'all_years',
        canEmailStatements: true,
        maxYearsBack: 10
      };
    default:
      return {
        hasFilters: false,
        allowedMonths: 'current_and_last',
        canEmailStatements: false,
        maxYearsBack: 0
      };
  }
}
