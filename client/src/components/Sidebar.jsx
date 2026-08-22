import React from 'react';
import {
    LayoutDashboard,
    ListOrdered,
    Layers,
    Cpu,
    AlertTriangle,
    Calendar,
    PlusCircle,
    Folder,
    LogOut,
    Zap
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Sidebar = ({ activeTab, setActiveTab, onOpenCreateModal }) => {
    const { user, projects, currentProject, setCurrentProject, logout } = useAuth();

    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'jobs', label: 'Job Explorer', icon: ListOrdered },
        { id: 'queues', label: 'Queues', icon: Layers },
        { id: 'workers', label: 'Worker Fleet', icon: Cpu },
        { id: 'dlq', label: 'Dead Letter Queue', icon: AlertTriangle, badge: 'DLQ' },
        { id: 'schedules', label: 'Cron Schedules', icon: Calendar },
    ];

    return (
        <aside className="w-64 bg-slate-900/90 border-r border-slate-800 flex flex-col h-screen sticky top-0 backdrop-blur-md z-30 select-none">
            {/* Brand Header */}
            <div className="p-4 border-b border-slate-800 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                    <Zap className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h1 className="font-bold text-slate-100 text-sm tracking-wide">PulseScheduler</h1>
                    <span className="text-[10px] uppercase font-semibold text-cyan-400 tracking-wider bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/40">
                        Distributed v1.0
                    </span>
                </div>
            </div>

            {/* Project Selector */}
            <div className="p-3 border-b border-slate-800/80 bg-slate-950/40">
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Folder className="w-3 h-3 text-cyan-400" /> Current Project
                </label>
                <select
                    value={currentProject?.id || ''}
                    onChange={(e) => {
                        const selected = projects.find(p => p.id === e.target.value);
                        if (selected) setCurrentProject(selected);
                    }}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors cursor-pointer"
                >
                    {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                            {p.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* Quick Action Button */}
            <div className="p-3">
                <button
                    onClick={onOpenCreateModal}
                    className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs py-2 px-3 rounded-lg shadow-md shadow-cyan-600/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                >
                    <PlusCircle className="w-4 h-4" /> Create New Job
                </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
                <div className="px-2 pb-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Navigation</div>
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${isActive
                                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-sm'
                                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                                }`}
                        >
                            <div className="flex items-center gap-2.5">
                                <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                                <span>{item.label}</span>
                            </div>
                            {item.badge && (
                                <span className="bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] px-1.5 py-0.5 rounded font-mono font-bold">
                                    {item.badge}
                                </span>
                            )}
                        </button>
                    );
                })}
            </nav>

            {/* User Footer */}
            <div className="p-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
                <div className="flex items-center gap-2 overflow-hidden">
                    <div className="w-7 h-7 rounded-full bg-slate-800 text-slate-300 font-bold text-xs flex items-center justify-center border border-slate-700">
                        {user?.name ? user.name[0].toUpperCase() : 'U'}
                    </div>
                    <div className="truncate">
                        <p className="text-xs font-medium text-slate-200 truncate">{user?.name || 'Developer'}</p>
                        <p className="text-[10px] text-slate-500 truncate">{user?.email || 'admin@scheduler.io'}</p>
                    </div>
                </div>
                <button
                    onClick={logout}
                    title="Logout"
                    className="text-slate-400 hover:text-rose-400 p-1.5 rounded-md hover:bg-slate-800 transition-colors"
                >
                    <LogOut className="w-4 h-4" />
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
