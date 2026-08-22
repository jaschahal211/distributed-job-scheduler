import React, { useState, useEffect } from 'react';
import { Calendar, Plus, RefreshCw, Trash2, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { scheduleApi, queueApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

const CronSchedules = () => {
    const { currentProject } = useAuth();
    const [schedules, setSchedules] = useState([]);
    const [queues, setQueues] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newSchedule, setNewSchedule] = useState({
        name: '',
        cronExpression: '*/5 * * * *',
        queueId: '',
        type: 'SUCCESS_TASK',
        payload: '{}',
        priority: 5,
    });

    const fetchSchedules = async () => {
        if (!currentProject) return;
        setLoading(true);
        try {
            const res = await scheduleApi.list({ projectId: currentProject.id });
            if (res.success) setSchedules(res.data);

            const qRes = await queueApi.list(currentProject.id);
            if (qRes.success) {
                setQueues(qRes.data);
                if (qRes.data.length > 0 && !newSchedule.queueId) {
                    setNewSchedule(s => ({ ...s, queueId: qRes.data[0].id }));
                }
            }
        } catch (err) {
            console.error('Error fetching schedules:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSchedules();
    }, [currentProject]);

    const handleDelete = async (id) => {
        if (!confirm('Delete this cron schedule?')) return;
        try {
            await scheduleApi.delete(id);
            fetchSchedules();
        } catch (err) {
            alert(`Delete failed: ${err.message}`);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            let parsedPayload = {};
            try {
                parsedPayload = JSON.parse(newSchedule.payload);
            } catch (e) {
                alert('Invalid JSON payload');
                return;
            }

            await scheduleApi.create({
                projectId: currentProject.id,
                queueId: newSchedule.queueId,
                name: newSchedule.name,
                cronExpression: newSchedule.cronExpression,
                type: newSchedule.type,
                payload: parsedPayload,
                priority: parseInt(newSchedule.priority, 10),
            });

            setShowCreateModal(false);
            setNewSchedule({
                name: '',
                cronExpression: '*/5 * * * *',
                queueId: queues[0]?.id || '',
                type: 'SUCCESS_TASK',
                payload: '{}',
                priority: 5,
            });
            fetchSchedules();
        } catch (err) {
            alert(`Failed to create schedule: ${err.message}`);
        }
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header Info */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-sky-400" /> Recurring Cron Schedules
                    </h2>
                    <p className="text-xs text-slate-400">Automated job generation based on Unix cron expressions</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="bg-cyan-600 hover:bg-cyan-500 text-white px-3.5 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-all shadow-md"
                >
                    <Plus className="w-4 h-4" /> Add Cron Schedule
                </button>
            </div>

            {/* Schedules Table */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl shadow-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-300">
                        <thead className="bg-slate-950/80 text-slate-400 uppercase font-mono text-[10px] tracking-wider border-b border-slate-800">
                            <tr>
                                <th className="py-3 px-4">Schedule Name</th>
                                <th className="py-3 px-4">Cron Expression</th>
                                <th className="py-3 px-4">Target Queue</th>
                                <th className="py-3 px-4">Job Type</th>
                                <th className="py-3 px-4">Next Run At</th>
                                <th className="py-3 px-4">Last Run At</th>
                                <th className="py-3 px-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 font-mono">
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="py-8 text-center text-slate-500 text-xs">
                                        Loading cron schedules...
                                    </td>
                                </tr>
                            ) : schedules.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="py-8 text-center text-slate-500 text-xs">
                                        No active cron schedules configured. Click "Add Cron Schedule" above.
                                    </td>
                                </tr>
                            ) : (
                                schedules.map((sch) => (
                                    <tr key={sch.id} className="hover:bg-slate-800/40 transition-colors">
                                        <td className="py-3 px-4">
                                            <div className="font-bold text-slate-100 font-sans text-xs">{sch.name}</div>
                                            <div className="text-[10px] text-slate-500">{sch.id}</div>
                                        </td>
                                        <td className="py-3 px-4 text-sky-400 font-bold">
                                            {sch.cron_expression}
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className="bg-slate-800 px-2 py-0.5 rounded text-[11px] font-sans">
                                                {sch.queue_name || 'default'}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-slate-200">
                                            {sch.type}
                                        </td>
                                        <td className="py-3 px-4 text-emerald-400 font-bold">
                                            {new Date(sch.next_run_at).toLocaleString()}
                                        </td>
                                        <td className="py-3 px-4 text-slate-400 text-[11px]">
                                            {sch.last_run_at ? new Date(sch.last_run_at).toLocaleString() : 'Never'}
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            <button
                                                onClick={() => handleDelete(sch.id)}
                                                className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
                                                title="Delete Schedule"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <form onSubmit={handleCreate} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-md w-full shadow-2xl space-y-4">
                        <h3 className="text-base font-bold text-slate-100">Create Cron Schedule</h3>
                        <div>
                            <label className="text-xs text-slate-400 font-medium block mb-1">Schedule Name</label>
                            <input
                                type="text"
                                required
                                placeholder="e.g. Nightly Database Cleanup"
                                value={newSchedule.name}
                                onChange={(e) => setNewSchedule({ ...newSchedule, name: e.target.value })}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 font-medium block mb-1">Cron Expression (e.g. */5 * * * *)</label>
                            <input
                                type="text"
                                required
                                value={newSchedule.cronExpression}
                                onChange={(e) => setNewSchedule({ ...newSchedule, cronExpression: e.target.value })}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-cyan-400 focus:outline-none focus:border-cyan-500 font-mono"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs text-slate-400 font-medium block mb-1">Target Queue</label>
                                <select
                                    value={newSchedule.queueId}
                                    onChange={(e) => setNewSchedule({ ...newSchedule, queueId: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                                >
                                    {queues.map(q => (
                                        <option key={q.id} value={q.id}>{q.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 font-medium block mb-1">Job Handler Type</label>
                                <select
                                    value={newSchedule.type}
                                    onChange={(e) => setNewSchedule({ ...newSchedule, type: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                                >
                                    <option value="SUCCESS_TASK">SUCCESS_TASK</option>
                                    <option value="DATA_PROCESS_TASK">DATA_PROCESS_TASK</option>
                                    <option value="HTTP_REQUEST">HTTP_REQUEST</option>
                                    <option value="FAIL_TASK">FAIL_TASK</option>
                                </select>
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
                                Create Schedule
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default CronSchedules;
