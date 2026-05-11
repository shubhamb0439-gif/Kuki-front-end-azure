import React from 'react';

interface ProfileWithStatusRingProps {
  name: string;
  photo?: string;
  status?: string;
  showStatus?: boolean;
  statusText?: string;
  statusColor?: string;
  size?: 'small' | 'medium' | 'large';
  onClick?: () => void;
}

const STATUS_COLORS = {
  looking_for_job: '#16a34a',
  working: '#9333ea',
  looking_for_helper: '#2563eb',
  personal: '#6b7280',
  at_risk: '#dc2626'
};

const STATUS_LABELS = {
  looking_for_job: 'Looking For Job',
  working: 'Working',
  looking_for_helper: 'Looking For Helper',
  personal: 'Personal'
};

export function ProfileWithStatusRing({
  name,
  photo,
  status,
  showStatus,
  statusText,
  statusColor,
  size = 'medium',
  onClick
}: ProfileWithStatusRingProps) {
  const sizeClasses = {
    small: { container: 'w-16 h-16', ring: 'w-16 h-16' },
    medium: { container: 'w-20 h-20', ring: 'w-20 h-20' },
    large: { container: 'w-36 h-36', ring: 'w-36 h-36' }
  };

  const currentSize = sizeClasses[size];
  const displayColor = statusColor || (status ? STATUS_COLORS[status as keyof typeof STATUS_COLORS] : STATUS_COLORS.personal);
  const shouldShowStatus = showStatus;

  const ProfilePhoto = () => {
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
      <div className="w-full h-full bg-gradient-to-br from-emerald-400 to-blue-400 rounded-full flex items-center justify-center">
        <span className="text-white font-semibold text-lg">
          {name.charAt(0).toUpperCase()}
        </span>
      </div>
    );
  };

  return (
    <div
      className="relative inline-flex items-center justify-center cursor-pointer"
      onClick={onClick}
    >
      <div
        className={`${currentSize.container} rounded-full overflow-hidden bg-white relative`}
        style={shouldShowStatus ? {
          border: `5px solid ${displayColor}`,
          padding: '0'
        } : {}}
      >
        <ProfilePhoto />
      </div>
    </div>
  );
}
