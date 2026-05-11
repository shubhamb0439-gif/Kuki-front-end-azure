import React from 'react';
import { ProfileWithStatusRing } from '../common/ProfileWithStatusRing';

interface EmployeeCardProps {
  employee: {
    id: string;
    name: string;
    profile_photo?: string;
  };
  status: {
    showRing: boolean;
    color: string;
    text: string;
  };
  onClick: () => void;
}

export const EmployeeCard = React.memo(({ employee, status, onClick }: EmployeeCardProps) => {
  return (
    <div className="flex justify-center">
      <ProfileWithStatusRing
        name={employee.name}
        photo={employee.profile_photo}
        showStatus={status.showRing}
        statusText={status.text}
        statusColor={status.color}
        onClick={onClick}
      />
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison to prevent unnecessary re-renders
  return (
    prevProps.employee.id === nextProps.employee.id &&
    prevProps.employee.name === nextProps.employee.name &&
    prevProps.employee.profile_photo === nextProps.employee.profile_photo &&
    prevProps.status.showRing === nextProps.status.showRing &&
    prevProps.status.color === nextProps.status.color &&
    prevProps.status.text === nextProps.status.text
  );
});

EmployeeCard.displayName = 'EmployeeCard';
