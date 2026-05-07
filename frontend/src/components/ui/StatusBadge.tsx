import React from 'react';

interface StatusBadgeProps {
  status: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const getStatusStyles = (status: string) => {
    switch (status.toUpperCase()) {
      case 'PENDING':
      case 'PENDING_ADMIN':
      case 'PENDING_MANAGER':
        return 'bg-amber-500/10 border-amber-500/20 text-amber-500';
      case 'APPROVED':
        return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500';
      case 'REJECTED':
        return 'bg-rose-500/10 border-rose-500/20 text-rose-500';
      case 'NEEDS_REVISION':
      case 'RETURNED':
        return 'bg-amber-500/10 border-amber-500/20 text-amber-500 font-black';
      default:
        return 'bg-zinc-500/10 border-zinc-500/20 text-zinc-400';
    }
  };

  return (
    <div className={`px-2.5 py-1 rounded text-[9px] font-black uppercase tracking-widest border ${getStatusStyles(status)}`}>
      {status.replace('_', ' ')}
    </div>
  );
};

export default StatusBadge;
