import React from 'react';

export function EmployeeCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 bg-gray-200 rounded-full flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
          <div className="h-3 bg-gray-200 rounded w-1/2" />
        </div>
        <div className="w-8 h-8 bg-gray-200 rounded-lg" />
      </div>
    </div>
  );
}

export function EmployerHomeSkeletonLoader() {
  return (
    <div className="pb-20">
      {/* Header Skeleton */}
      <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white px-6 pt-6 pb-8 rounded-b-3xl shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 bg-white/20 rounded-full animate-pulse" />
            <div>
              <div className="h-5 bg-white/20 rounded w-32 mb-2 animate-pulse" />
              <div className="h-3 bg-white/20 rounded w-24 animate-pulse" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full animate-pulse" />
            <div className="w-10 h-10 bg-white/20 rounded-full animate-pulse" />
          </div>
        </div>
      </div>

      {/* Action Buttons Skeleton */}
      <div className="px-6 -mt-4 mb-6">
        <div className="bg-white rounded-2xl shadow-lg p-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="h-20 bg-gray-200 rounded-xl animate-pulse" />
            <div className="h-20 bg-gray-200 rounded-xl animate-pulse" />
          </div>
        </div>
      </div>

      {/* Employees Section Skeleton */}
      <div className="px-6">
        <div className="h-6 bg-gray-200 rounded w-32 mb-4 animate-pulse" />
        <div className="space-y-3">
          <EmployeeCardSkeleton />
          <EmployeeCardSkeleton />
          <EmployeeCardSkeleton />
        </div>
      </div>
    </div>
  );
}
