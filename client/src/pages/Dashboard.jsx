import React, { useState, useEffect } from 'react';
import {
    ListOrdered,
    Clock,
    Play,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Cpu,
    TrendingUp,
    Zap,
    Layers,
    ArrowUpRight
} from 'lucide-react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell
} from 'recharts';
import { jobApi, queueApi, workerApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';

const Dashboard = ({ onSelectTab }) => {
    const { currentProject } = useAuth();
    const [stats, setStats] = useState(null);
    const [queues, setQueues] = useState([]);
    const [workers, setWorkers] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchDashboardData = async () => {
        try {
            const statsRes = await jobApi.getDashboardStats();
            if (statsRes.success) setStats(statsRes.data);

            if (currentProject) {
                const queueRes = await queueApi.list(currentProject.id);
                if (queueRes.success) setQueues(queueRes.data);
            }

            const workerRes = await workerApi.list();
            if (workerRes.success) setWorkers(workerRes.data);
        } catch (err) {
            console.error('Error fetching dashboard data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, [currentProject]);

    if (loading || !stats) {
        return (
            <div className="p-8 flex items-center justify-center min-h-[400px]">
                <div className="flex items-center gap-3 text-cyan-400 font-mono text-sm">
                    <Zap className="w-5 h-5 animate-bounce" /> Loading scheduler metrics...
                </div>
            </div>
        );
    }

    const COLORS = ['#10b981', '#f43f5e', '#3b82f6', '#f59e0b'];

    const pieData = [
        { name: 'Completed', value: stats.completed || 1 },
        { name: 'Failed / DLQ', value: (stats.failed || 0) + (stats.dlqCount || 0) },
        { name: 'Running', value: stats.running || 0 },
        { name: 'Queued', value: stats.queued || 0 },
    ];

    return (
        <div className="p-6 space-y-6">
            {/* Top Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Jobs */}
                <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl shadow-lg hover:border-slate-700 transition-colors">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Managed Jobs</span>
                        <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
                            <ListOrdered className="w-4 h-4" />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-slate-100 mt-2 font-mono">{stats.totalJobs}</p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
                        <span className="text-amber-400 font-medium">{stats.queued} Queued</span>
                        <span>•</span>
                        <span className="text-sky-400 font-medium">{stats.scheduled} Scheduled</span>
                    </div>
                </div>

                {/* Active Workers */}
                <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl shadow-lg hover:border-slate-700 transition-colors">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Worker Fleet</span>
                        <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                            <Cpu className="w-4 h-4" />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-slate-100 mt-2 font-mono">{stats.activeWorkers}</p>
                    <div className="flex items-center gap-1.5 mt-2 text-xs text-emerald-400 font-medium">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        Workers actively polling PostgreSQL
                    </div>
                </div>

                {/* Success Rate */}
                <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl shadow-lg hover:border-slate-700 transition-colors">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Success Rate</span>
                        <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                            <TrendingUp className="w-4 h-4" />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-slate-100 mt-2 font-mono">{stats.successRate}%</p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
                        <span className="text-emerald-400 font-medium">{stats.completed} Completed</span>
                        <span>•</span>
                        <span className="text-rose-400 font-medium">{stats.failed} Failed</span>
                    </div>
                </div>

                {/* Dead Letter Queue */}
                <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl shadow-lg hover:border-slate-700 transition-colors">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Dead Letter Queue</span>
                        <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
                            <AlertTriangle className="w-4 h-4" />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-rose-400 mt-2 font-mono">{stats.dlqCount}</p>
                    <div className="flex items-center justify-between mt-2 text-xs">
                        <span className="text-slate-400">Avg Execution Time</span>
                        <span className="text-slate-200 font-mono font-semibold">{stats.avgExecutionTimeMs} ms</span>
                    </div>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Time-series Throughput Chart */}
                <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 p-5 rounded-xl shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-sm font-bold text-slate-200">Execution Throughput (24h)</h3>
                            <p className="text-xs text-slate-400">Completed vs Failed job executions over time</p>
                        </div>
                        <div className="flex items-center gap-4 text-xs font-medium">
                            <span className="flex items-center gap-1.5 text-emerald-400">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Completed
                            </span>
                            <span className="flex items-center gap-1.5 text-rose-400">
                                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Failed
                            </span>
                        </div>
                    </div>
                    <div className="h-64">
                        {stats.chartData && stats.chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={stats.chartData}>
                                    <defs>
                                        <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorFailed" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                                            <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                    <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 11 }} />
                                    <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                                    />
                                    <Area type="monotone" dataKey="completed" stroke="#10b981" fillOpacity={1} fill="url(#colorCompleted)" />
                                    <Area type="monotone" dataKey="failed" stroke="#f43f5e" fillOpacity={1} fill="url(#colorFailed)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-xs text-slate-500 font-mono">
                                No recent execution time-series data available
                            </div>
                        )}
                    </div>
                </div>

                {/* State Breakdown Pie Chart */}
                <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-xl shadow-lg flex flex-col justify-between">
                    <div>
                        <h3 className="text-sm font-bold text-slate-200">State Distribution</h3>
                        <p className="text-xs text-slate-400">Current allocation across lifecycle states</p>
                    </div>
                    <div className="h-48 flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={75}
                                    paddingAngle={4}
                                    dataKey="value"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                        {pieData.map((item, idx) => (
                            <div key={item.name} className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx] }}></span>
                                <span className="text-slate-400">{item.name}:</span>
                                <span className="font-mono font-bold text-slate-200">{item.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Lower Row: Queues & Worker Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Active Queues Widget */}
                <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-xl shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Layers className="w-4 h-4 text-cyan-400" />
                            <h3 className="text-sm font-bold text-slate-200">Active Queues</h3>
                        </div>
                        <button
                            onClick={() => onSelectTab('queues')}
                            className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1"
                        >
                            Manage Queues <ArrowUpRight className="w-3 h-3" />
                        </button>
                    </div>
                    <div className="space-y-3">
                        {queues.slice(0, 4).map((q) => (
                            <div key={q.id} className="bg-slate-950/60 border border-slate-800 p-3 rounded-lg flex items-center justify-between">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-xs font-bold text-slate-200">{q.name}</span>
                                        <StatusBadge status={q.status} size="sm" />
                                    </div>
                                    <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-3 font-mono">
                                        <span>Priority: {q.priority}</span>
                                        <span>•</span>
                                        <span>Max Concurrency: {q.concurrency_limit}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 text-xs font-mono">
                                    <div className="text-right">
                                        <span className="block text-amber-400 font-bold">{q.queued_jobs || 0} queued</span>
                                        <span className="block text-blue-400">{q.running_jobs || 0} running</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Worker Fleet Health Widget */}
                <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-xl shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Cpu className="w-4 h-4 text-emerald-400" />
                            <h3 className="text-sm font-bold text-slate-200">Worker Node Status</h3>
                        </div>
                        <button
                            onClick={() => onSelectTab('workers')}
                            className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1"
                        >
                            View Fleet <ArrowUpRight className="w-3 h-3" />
                        </button>
                    </div>
                    <div className="space-y-3">
                        {workers.map((w) => (
                            <div key={w.id} className="bg-slate-950/60 border border-slate-800 p-3 rounded-lg flex items-center justify-between">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-xs font-bold text-slate-200">{w.name}</span>
                                        <StatusBadge status={w.status} size="sm" />
                                    </div>
                                    <span className="text-[10px] font-mono text-slate-500">ID: {w.id.slice(0, 18)}...</span>
                                </div>
                                <div className="text-right font-mono text-xs">
                                    <span className="block text-slate-200 font-bold">{w.current_job_count} / {w.concurrency_limit} Jobs</span>
                                    <span className="text-[10px] text-slate-400">
                                        Last HB: {new Date(w.last_heartbeat_at).toLocaleTimeString()}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
