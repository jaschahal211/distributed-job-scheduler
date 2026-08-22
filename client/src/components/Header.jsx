import React from 'react';
import { RefreshCw, Activity, Server, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Header = ({ title, subtitle, onRefresh, autoRefresh, setAutoRefresh, lastRefreshed }) => {
    const { currentProject } = useAuth();

    return (
        <header className="bg-slate-900/60 border-b border-slate-800 px-6 py-4 flex items-center justify-between backdrop-blur-md sticky top-0 z-20">
            <div>
                <div className="flex items-center gap-2">
                    <h1 className="text-xl font-bold text-slate-100 tracking-tight">{title}</h1>
                    {currentProject && (
                        <span className="bg-slate-800 text-slate-300 text-xs px-2.5 py-0.5 rounded-full font-medium border border-slate-700">
                            {currentProject.name}
                        </span>
                    )}
                </div>
                {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
            </div>

            <div className="flex items-center gap-3">
                {/* Real-time Polling Toggle */}
                <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/80 text-xs">
                    <Activity className={`w-3.5 h-3.5 ${autoRefresh ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
                    <span className="text-slate-300 font-medium">Auto-poll (3s)</span>
                    <button
                        onClick={() => setAutoRefresh(!autoRefresh)}
                        className={`w-8 h-4 rounded-full transition-colors relative ${autoRefresh ? 'bg-cyan-600' : 'bg-slate-700'
                            }`}
                    >
                        <span
                            className={`w-3 h-3 rounded-full bg-white absolute top-0.5 transition-transform ${autoRefresh ? 'right-0.5' : 'left-0.5'
                                }`}
                        />
                    </button>
                </div>

                {/* Manual Refresh Button */}
                <button
                    onClick={onRefresh}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 p-2 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all active:scale-95"
                    title="Manual Refresh"
                >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Refresh</span>
                </button>

                {lastRefreshed && (
                    <span className="text-[11px] font-mono text-slate-500 hidden md:flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {lastRefreshed.toLocaleTimeString()}
                    </span>
                )}
            </div>
        </header>
    );
};

export default Header;
