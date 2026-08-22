import React, { useState, useEffect } from 'react';
import { Layers, Pause, Play, Plus, RefreshCw, BarChart2, Zap } from 'lucide-react';
import { queueApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';

const QueueManager = () => {
    const { currentProject } = useAuth();
    const [queues, setQueues] = useState([]);
    const [selectedQueueStats, setSelectedQueueStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newQueue, setNewQueue] = useState({ name: '', priority: 5, concurrencyLimit: 5 });

    const fetchQueues = async () => {
        if (!currentProject) return;
        setLoading(true);
        try {
            const res = await queueApi.list(currentProject.id);
            if (res.success) setQueues(res.data);
        } catch (err) {
            console.error('Error fetching queues:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchQueues();
    }, [currentProject]);

    const handlePause = async (id) => {
        try {
            await queueApi.pause(id);
            fetchQueues();
        } catch (err) {
            alert(`Pause failed: ${err.message}`);
        }
    };

    const handleResume = async (id) => {
        try {
            await queueApi.resume(id);
            fetchQueues();
        } catch (err) {
            alert(`Resume failed: ${err.message}`);
        }
    };

    const handleInspectStats = async (id) => {
        try {
            const res = await queueApi.getStats(id);
            if (res.success) setSelectedQueueStats(res.data);
        } catch (err) {
            alert(`Failed to load queue stats: ${err.message}`);
        }
    };

    const handleCreateQueue = async (e) => {
        e.preventDefault();
        try {
            await queueApi.create(currentProject.id, newQueue);
            setShowCreateModal(false);
            setNewQueue({ name: '', priority: 5, concurrencyLimit: 5 });
            fetchQueues();
        } catch (err) {
            alert(`Failed to create queue: ${err.message}`);
        }
    };

    return (
        <div className="p-6 space-y-6">
            {/* Action Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-bold text-slate-100">Queue Management</h2>
                    <p className="text-xs text-slate-400">Configure priorities, concurrency limits, and active states</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="bg-cyan-600 hover:bg-cyan-500 text-white px-3.5 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-all shadow-md"
                >
                    <Plus className="w-4 h-4" /> Create New Queue
                </button>
            </div>

            {/* Queue Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading ? (
                    <div className="col-span-full py-12 text-center text-slate-500 font-mono text-xs">
                        Loading project queues...
                    </div>
                ) : queues.length === 0 ? (
                    <div className="col-span-full py-12 text-center text-slate-500 font-mono text-xs">
                        No queues found in project. Click "Create New Queue" above.
                    </div>
                ) : (
                    queues.map((q) => (
                        <div key={q.id} className="bg-slate-900/80 border border-slate-800 p-5 rounded-xl shadow-lg space-y-4 hover:border-slate-700 transition-colors flex flex-col justify-between">
                            <div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Layers className="w-4 h-4 text-cyan-400" />
                                        <h3 className="font-bold text-slate-100 text-sm">{q.name}</h3>
                                    </div>
                                    <StatusBadge status={q.status} size="sm" />
                                </div>

                                <div className="grid grid-cols-2 gap-2 mt-4 text-xs font-mono">
                                    <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                                        <span className="text-slate-500 block text-[10px] uppercase">Priority</span>
                                        <span className="font-bold text-slate-200">{q.priority}</span>
                                    </div>
                                    <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                                        <span className="text-slate-500 block text-[10px] uppercase">Concurrency</span>
                                        <span className="font-bold text-slate-200">{q.concurrency_limit} Jobs</span>
                                    </div>
                                </div>

                                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
                                    <span className="text-amber-400 font-semibold">{q.queued_jobs || 0} Queued</span>
                                    <span className="text-blue-400 font-semibold">{q.running_jobs || 0} Running</span>
                                    <span className="text-emerald-400 font-semibold">{q.completed_jobs || 0} Completed</span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                                <button
                                    onClick={() => handleInspectStats(q.id)}
                                    className="text-xs text-slate-400 hover:text-cyan-400 font-medium flex items-center gap-1 transition-colors"
                                >
                                    <BarChart2 className="w-3.5 h-3.5" /> Statistics
                                </button>

                                {q.status === 'active' ? (
                                    <button
                                        onClick={() => handlePause(q.id)}
                                        className="bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 px-3 py-1 rounded text-xs font-medium flex items-center gap-1 transition-colors"
                                    >
                                        <Pause className="w-3 h-3" /> Pause
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => handleResume(q.id)}
                                        className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 px-3 py-1 rounded text-xs font-medium flex items-center gap-1 transition-colors"
                                    >
                                        <Play className="w-3 h-3" /> Resume
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Queue Statistics Modal */}
            {selectedQueueStats && (
                <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-lg w-full shadow-2xl space-y-4 font-mono">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <h3 className="text-sm font-bold text-slate-100 font-sans">
                                Queue Stats: <span className="text-cyan-400">{selectedQueueStats.queueName}</span>
                            </h3>
                            <button
                                onClick={() => setSelectedQueueStats(null)}
                                className="text-slate-400 hover:text-slate-200 text-sm font-bold"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs">
                            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                                <span className="text-slate-500 block">Total Jobs</span>
                                <span className="text-lg font-bold text-slate-100">{selectedQueueStats.totalJobs}</span>
                            </div>
                            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                                <span className="text-slate-500 block">Success Rate</span>
                                <span className="text-lg font-bold text-emerald-400">{selectedQueueStats.successRate}%</span>
                            </div>
                            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                                <span className="text-slate-500 block">Queued</span>
                                <span className="text-lg font-bold text-amber-400">{selectedQueueStats.queuedJobs}</span>
                            </div>
                            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                                <span className="text-slate-500 block">Running</span>
                                <span className="text-lg font-bold text-blue-400">{selectedQueueStats.runningJobs}</span>
                            </div>
                            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                                <span className="text-slate-500 block">Avg Duration</span>
                                <span className="text-lg font-bold text-cyan-400">{selectedQueueStats.avgExecutionTimeMs} ms</span>
                            </div>
                            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                                <span className="text-slate-500 block">DLQ Entries</span>
                                <span className="text-lg font-bold text-rose-400">{selectedQueueStats.dlqJobs}</span>
                            </div>
                        </div>

                        <div className="pt-2 text-right">
                            <button
                                onClick={() => setSelectedQueueStats(null)}
                                className="bg-slate-800 text-slate-200 px-4 py-1.5 rounded-lg text-xs font-sans font-medium hover:bg-slate-700"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Queue Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <form onSubmit={handleCreateQueue} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-md w-full shadow-2xl space-y-4">
                        <h3 className="text-base font-bold text-slate-100">Create Queue</h3>
                        <div>
                            <label className="text-xs text-slate-400 font-medium block mb-1">Queue Name</label>
                            <input
                                type="text"
                                required
                                placeholder="e.g. email-delivery"
                                value={newQueue.name}
                                onChange={(e) => setNewQueue({ ...newQueue, name: e.target.value })}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs text-slate-400 font-medium block mb-1">Priority (1 - 100)</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="100"
                                    value={newQueue.priority}
                                    onChange={(e) => setNewQueue({ ...newQueue, priority: parseInt(e.target.value, 10) })}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 font-medium block mb-1">Max Concurrency</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="50"
                                    value={newQueue.concurrencyLimit}
                                    onChange={(e) => setNewQueue({ ...newQueue, concurrencyLimit: parseInt(e.target.value, 10) })}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                                />
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setShowCreateModal(false)}
                                className="bg-slate-800 text-slate-400 px-4 py-2 rounded-lg text-xs font-medium hover:bg-slate-700"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="bg-cyan-600 text-white px-4 py-2 rounded-lg text-xs font-medium hover:bg-cyan-500"
                            >
                                Create Queue
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default QueueManager;
