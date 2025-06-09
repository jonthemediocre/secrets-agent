import React from 'react';

interface DashboardCardProps {
  title: string;
  value: string | number;
  icon: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  gradient: string;
  className?: string;
}

export function DashboardCard({ 
  title, 
  value, 
  icon, 
  trend, 
  gradient,
  className = ""
}: DashboardCardProps) {
  return (
    <div className={`bg-gradient-to-r ${gradient} rounded-2xl p-6 text-white ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white/80 text-sm font-medium">{title}</p>
          <p className="text-4xl font-bold mt-1">{value}</p>
          {trend && (
            <div className={`flex items-center mt-2 text-sm ${
              trend.isPositive ? 'text-green-200' : 'text-red-200'
            }`}>
              <span className="mr-1">
                {trend.isPositive ? '↗️' : '↘️'}
              </span>
              {Math.abs(trend.value)}%
            </div>
          )}
        </div>
        <div className="text-6xl opacity-20">
          {icon}
        </div>
      </div>
    </div>
  );
}

export default DashboardCard; 