import React, { useState, useEffect } from 'react';
import { Cpu, RefreshCw, Activity, Server, Clock, CheckCircle2 } from 'lucide-react';
import { workerApi } from '../services/api';
import StatusBadge from '../components/StatusBadge';

const WorkerMonitor = () => {
    const [workers, setWorkers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedWorkerHeartbeats, setSelectedWorkerHeartbeats] = useState(null);

    const fetchWorkers = async () => {
        setLoading(true);
        try {
            const res = await workerApi.list();
            if (res.success) setWorkers(res.data);
        } catch (err) {
            console.error('Error fetching workers:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWorkers();
        const timer = setInterval(fetchWorkers, 3000);
        return () => clearInterval(timer);
    }, []);

    const handleInspectHeartbeats = async (workerId) => {
        try {
            const res = await workerApi.getHeartbeats(workerId);
            if (res.success) setSelectedWorkerHeartbeats(res.data);
        } catch (err) {
            alert(`Failed to load heartbeats: ${err.message}`);
        }
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header Info */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-bold text-slate-100">Worker Node Fleet</h2>
                    <p className="text-xs text-slate-400">Real-time status, heartbeat freshness, and capacity utilization</p>
                </div>
                <button
                    onClick={fetchWorkers}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 border border-slate-700 transition-colors"
                >
                    <RefreshCw className="w-3.5 h-3.5" /> Refresh Fleet
                </button>
            </div>

            {/* Workers Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading && workers.length === 0 ? (
                    <div className="col-span-full py-12 text-center text-slate-500 font-mono text-xs">
                        Scanning active worker nodes...
                    </div>
                ) : workers.length === 0 ? (
                    <div className="col-span-full py-12 text-center text-slate-500 font-mono text-xs">
                        No worker nodes currently registered. Run <code className="text-cyan-400">npm run worker</code> to start a worker instance.
                    </div>
                ) : (
                    workers.map((w) => {
                        const isFresh = new Date() - new Date(w.last_heartbeat_at) < 15000;
                        const utilizationPercent = Math.round((w.current_job_count / (w.concurrency_limit || 1)) * 100);

                        return (
                            <div
                                key={w.id}
                                className="bg-slate-900/80 border border-slate-800 p-5 rounded-xl shadow-lg space-y-4 hover:border-slate-700 transition-colors flex flex-col justify-between"
                            >
                                <div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                <Cpu className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-slate-100 text-sm">{w.name}</h3>
                                                <span className="text-[10px] font-mono text-slate-500 block truncate w-36">
                                                    ID: {w.id}
                                                </span>
                                            </div>
                                        </div>
                                        <StatusBadge status={w.status} size="sm" />
                                    </div>

                                    {/* Utilization Bar */}
                                    <div className="mt-4 space-y-1.5">
                                        <div className="flex justify-between text-xs font-mono">
                                            <span className="text-slate-400">Concurrency Load</span>
                                            <span className="text-slate-200 font-bold">
                                                {w.current_job_count} / {w.concurrency_limit} ({utilizationPercent}%)
                                            </span>
                                        </div>
                                        <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                                            <div
                                                className={`h-full rounded-full transition-all duration-300 ${utilizationPercent > 80 ? 'bg-rose-500' : utilizationPercent > 40 ? 'bg-blue-500' : 'bg-emerald-500'
                                                    }`}
                                                style={{ width: `${Math.max(5, utilizationPercent)}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Timestamps */}
                                    <div className="mt-4 pt-3 border-t border-slate-800/80 text-xs font-mono space-y-1">
                                        <div className="flex justify-between items-center text-slate-400">
                                            <span>Heartbeat:</span>
                                            <span className={`font-semibold flex items-center gap-1 ${isFresh ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                <Activity className="w-3 h-3" />
                                                {new Date(w.last_heartbeat_at).toLocaleTimeString()}
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-slate-500 text-[11px]">
                                            <span>Started At:</span>
                                            <span>{new Date(w.started_at).toLocaleTimeString()}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-3 border-t border-slate-800 text-right">
                                    <button
                                        onClick={() => handleInspectHeartbeats(w.id)}
                                        className="text-xs text-cyan-400 hover:text-cyan-300 font-mono font-medium"
                                    >
                                        View Heartbeat History →
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Heartbeat History Modal */}
            {selectedWorkerHeartbeats && (
                <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-lg w-full shadow-2xl space-y-4 font-mono">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <h3 className="text-sm font-bold text-slate-100 font-sans">
                                Heartbeat History
                            </h3>
                            <button
                                onClick={() => setSelectedWorkerHeartbeats(null)}
                                className="text-slate-400 hover:text-slate-200 text-sm font-bold"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                            {selectedWorkerHeartbeats.length === 0 ? (
                                <div className="text-center py-6 text-slate-500 text-xs">No heartbeat records found.</div>
                            ) : (
                                selectedWorkerHeartbeats.map((hb) => (
                                    <div key={hb.id} className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between text-xs">
                                        <div>
                                            <StatusBadge status={hb.status} size="sm" />
                                            <span className="text-slate-400 ml-2">{hb.current_job_count} active jobs</span>
                                        </div>
                                        <span className="text-slate-500 text-[11px]">{new Date(hb.timestamp).toLocaleTimeString()}</span>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="pt-2 text-right">
                            <button
                                onClick={() => setSelectedWorkerHeartbeats(null)}
                                className="bg-slate-800 text-slate-200 px-4 py-1.5 rounded-lg text-xs font-sans font-medium hover:bg-slate-700"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WorkerMonitor;
