import React from 'react';

const statusStyles = {
    // Job statuses
    queued: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    scheduled: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
    claimed: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    running: 'bg-blue-500/10 text-blue-400 border-blue-500/20 animate-pulse-subtle',
    completed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    failed: 'bg-rose-500/10 text-rose-400 border-rose-500/20',

    // Worker statuses
    ONLINE: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    BUSY: 'bg-blue-500/10 text-blue-400 border-blue-500/30 animate-pulse-subtle',
    OFFLINE: 'bg-slate-700/30 text-slate-400 border-slate-600/30',
    DRAINING: 'bg-orange-500/10 text-orange-400 border-orange-500/30',

    // Queue statuses
    active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    paused: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
};

const StatusBadge = ({ status, size = 'md' }) => {
    const normalized = status ? status.toLowerCase() : 'unknown';
    const style = statusStyles[status] || statusStyles[normalized] || 'bg-slate-800 text-slate-400 border-slate-700';

    const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-semibold';

    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full border ${style} ${sizeClasses} uppercase tracking-wider font-mono`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
            {status}
        </span>
    );
};

export default StatusBadge;
