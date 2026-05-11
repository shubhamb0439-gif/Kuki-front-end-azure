import React from 'react';
import { AlertCircle, Shield } from 'lucide-react';

interface ManualUpgradeBadgeProps {
  isManualUpgrade: boolean;
  manualUpgradeNote?: string;
  className?: string;
  variant?: 'badge' | 'banner';
}

export function ManualUpgradeBadge({
  isManualUpgrade,
  manualUpgradeNote,
  className = '',
  variant = 'badge'
}: ManualUpgradeBadgeProps) {
  if (!isManualUpgrade) return null;

  if (variant === 'banner') {
    return (
      <div className={`bg-red-50 border-2 border-red-300 rounded-lg p-3 ${className}`}>
        <div className="flex items-start gap-2">
          <Shield className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-semibold text-red-900 mb-1">Manual Upgrade</h4>
            {manualUpgradeNote && (
              <p className="text-sm text-red-700">{manualUpgradeNote}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 bg-red-100 text-red-800 border-2 border-red-400 rounded-full text-sm font-semibold ${className}`}
      title={manualUpgradeNote || 'Manually upgraded by admin'}
    >
      <AlertCircle className="w-4 h-4" />
      Manual Upgrade
    </span>
  );
}
