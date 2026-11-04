import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  subtext?: string;
  isLoading?: boolean;
}

export default function StatCard({
  label,
  value,
  icon: Icon,
  subtext,
  isLoading = false,
}: StatCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 tracking-wide">{label}</p>
          {isLoading ? (
            <div className="h-9 w-20 bg-gray-200 animate-pulse rounded-md mt-2" />
          ) : (
            <p className="text-3xl font-bold text-[#A22538] mt-2 tracking-tight">
              {value}
            </p>
          )}
        </div>
        {/* Gold circle icon */}
        <div className="w-12 h-12 rounded-full bg-[#FEF7E8] text-[#EEB540] border border-[#EEB540]/20 flex items-center justify-center flex-shrink-0 shadow-sm">
          <Icon className="w-6 h-6 stroke-[2.2]" />
        </div>
      </div>

      {subtext && (
        <p className="text-xs text-gray-400 mt-4 border-t border-gray-100 pt-3">
          {subtext}
        </p>
      )}
    </div>
  );
}
