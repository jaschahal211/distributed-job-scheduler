import React, { useState, useEffect } from 'react';
import {
    X,
    RotateCcw,
    XCircle,
    Clock,
    Cpu,
    Layers,
    FileText,
    AlertCircle,
    CheckCircle2,
    ListFilter
} from 'lucide-react';
import { jobApi, executionApi } from '../services/api';
import StatusBadge from '../components/StatusBadge';

const JobDetailDrawer = ({ jobId, onClose, onJobUpdated }) => {
    const [job, setJob] = useState(null);
    const [executions, setExecutions] = useState([]);
    const [logs, setLogs] = useState([]);
    const [logLevelFilter, setLogLevelFilter] = useState('ALL');
    const [activeTab, setActiveTab] = useState('overview');
    const [loading, setLoading] = useState(true);

    const fetchDetails = async () => {
        if (!jobId) return;
        setLoading(true);
        try {
            const jobRes = await jobApi.get(jobId);
            if (jobRes.success) setJob(jobRes.data);

            const execRes = await jobApi.getExecutions(jobId);
            if (execRes.success) setExecutions(execRes.data);

            const logsRes = await jobApi.getLogs(jobId);
            if (logsRes.success) setLogs(logsRes.data);
        } catch (err) {
            console.error('Error fetching job details:', err);
        } fontinally: {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDetails();
    }, [jobId]);

    if (!jobId) return null;

    const handleRetry = async () => {
        try {
            await jobApi.retry(jobId);
            await fetchDetails();
            if (onJobUpdated) onJobUpdated();
        } catch (err) {
            alert(`Retry failed: ${err.message}`);
        }
    };

    const handleCancel = async () => {
        try {
            await jobApi.cancel(jobId);
            await fetchDetails();
            if (onJobUpdated) onJobUpdated();
        } catch (err) {
            alert(`Cancel failed: ${err.message}`);
        }
    };

    const filteredLogs = logs.filter(log => {
        if (logLevelFilter === 'ALL') return true;
        return log.level === logLevelFilter;
    });

    return (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/70 backdrop-blur-sm flex justify-end">
            <div className="w-full max-w-2xl bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
                {/* Drawer Header */}
                <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-slate-800 border border-slate-700">
                            <FileText className="w-5 h-5 text-cyan-400" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-slate-100">{job?.name || 'Job Details'}</h2>
                            <span className="text-xs font-mono text-cyan-400/80">{jobId}</span>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Drawer Controls Bar */}
                {job && (
                    <div className="px-6 py-3 bg-slate-900 border-b border-slate-800/80 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <StatusBadge status={job.status} />
                            <span className="text-xs font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                                Priority: P-{job.priority}
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            {(job.status === 'failed' || job.status === 'completed') && (
                                <button
                                    onClick={handleRetry}
                                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-sm transition-all"
                                >
                                    <RotateCcw className="w-3.5 h-3.5" /> Retry Job
                                </button>
                            )}
                            {(job.status === 'queued' || job.status === 'scheduled' || job.status === 'running') && (
                                <button
                                    onClick={handleCancel}
                                    className="bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all"
                                >
                                    <XCircle className="w-3.5 h-3.5" /> Cancel Job
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Drawer Tabs */}
                <div className="flex border-b border-slate-800 bg-slate-950/40 px-6 font-mono text-xs">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`py-2.5 px-4 font-semibold border-b-2 transition-colors ${activeTab === 'overview'
                                ? 'border-cyan-500 text-cyan-400'
                                : 'border-transparent text-slate-400 hover:text-slate-200'
                            }`}
                    >
                        Overview & Payload
                    </button>
                    <button
                        onClick={() => setActiveTab('executions')}
                        className={`py-2.5 px-4 font-semibold border-b-2 transition-colors ${activeTab === 'executions'
                                ? 'border-cyan-500 text-cyan-400'
                                : 'border-transparent text-slate-400 hover:text-slate-200'
                            }`}
                    >
                        Executions ({executions.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('logs')}
                        className={`py-2.5 px-4 font-semibold border-b-2 transition-colors ${activeTab === 'logs'
                                ? 'border-cyan-500 text-cyan-400'
                                : 'border-transparent text-slate-400 hover:text-slate-200'
                            }`}
                    >
                        System Logs ({logs.length})
                    </button>
                </div>

                {/* Drawer Content Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {loading ? (
                        <div className="text-center py-12 text-slate-500 font-mono text-xs">
                            Loading job detail parameters...
                        </div>
                    ) : job && activeTab === 'overview' ? (
                        <>
                            {/* Metadata Grid */}
                            <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                                <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                                    <span className="text-slate-500 block text-[10px] uppercase">Job Type</span>
                                    <span className="font-bold text-slate-200">{job.type}</span>
                                </div>
                                <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                                    <span className="text-slate-500 block text-[10px] uppercase">Target Queue</span>
                                    <span className="font-bold text-slate-200">{job.queue_name || 'default'}</span>
                                </div>
                                <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                                    <span className="text-slate-500 block text-[10px] uppercase">Assigned Worker</span>
                                    <span className="font-bold text-emerald-400">{job.worker_name || 'None'}</span>
                                </div>
                                <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                                    <span className="text-slate-500 block text-[10px] uppercase">Retry Policy</span>
                                    <span className="font-bold text-slate-200">{job.retry_policy_name || 'Exponential Backoff'}</span>
                                </div>
                                <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                                    <span className="text-slate-500 block text-[10px] uppercase">Attempts Made</span>
                                    <span className="font-bold text-slate-200">{job.attempts} / {job.max_attempts}</span>
                                </div>
                                <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                                    <span className="text-slate-500 block text-[10px] uppercase">Idempotency Key</span>
                                    <span className="font-bold text-slate-400 truncate block">{job.idempotency_key || 'N/A'}</span>
                                </div>
                            </div>

                            {/* Error Alert if failed */}
                            {job.last_error && (
                                <div className="bg-rose-950/40 border border-rose-500/30 p-4 rounded-xl text-xs text-rose-300 font-mono space-y-1">
                                    <div className="font-bold flex items-center gap-1.5 text-rose-400">
                                        <AlertCircle className="w-4 h-4" /> Execution Error Detail
                                    </div>
                                    <p className="whitespace-pre-wrap text-[11px] leading-relaxed">{job.last_error}</p>
                                </div>
                            )}

                            {/* Timestamps */}
                            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-2 text-xs font-mono">
                                <h4 className="text-slate-400 uppercase text-[10px] font-bold tracking-wider mb-2">Lifecycle Timestamps</h4>
                                <div className="flex justify-between text-slate-300">
                                    <span className="text-slate-500">Created:</span>
                                    <span>{new Date(job.created_at).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-slate-300">
                                    <span className="text-slate-500">Available At:</span>
                                    <span>{new Date(job.available_at).toLocaleString()}</span>
                                </div>
                                {job.claimed_at && (
                                    <div className="flex justify-between text-slate-300">
                                        <span className="text-slate-500">Claimed At:</span>
                                        <span>{new Date(job.claimed_at).toLocaleString()}</span>
                                    </div>
                                )}
                                {job.completed_at && (
                                    <div className="flex justify-between text-emerald-400 font-bold">
                                        <span>Completed At:</span>
                                        <span>{new Date(job.completed_at).toLocaleString()}</span>
                                    </div>
                                )}
                                {job.failed_at && (
                                    <div className="flex justify-between text-rose-400 font-bold">
                                        <span>Failed At:</span>
                                        <span>{new Date(job.failed_at).toLocaleString()}</span>
                                    </div>
                                )}
                            </div>

                            {/* Payload JSON Inspector */}
                            <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-2">
                                <h4 className="text-slate-400 uppercase text-[10px] font-bold font-mono tracking-wider">Payload Data</h4>
                                <pre className="bg-slate-900 p-3 rounded-lg text-xs font-mono text-cyan-300 overflow-x-auto border border-slate-800">
                                    {JSON.stringify(job.payload || {}, null, 2)}
                                </pre>
                            </div>
                        </>
                    ) : activeTab === 'executions' ? (
                        <div className="space-y-3 font-mono">
                            {executions.length === 0 ? (
                                <div className="text-center py-8 text-slate-500 text-xs">No execution attempts recorded yet.</div>
                            ) : (
                                executions.map((ex) => (
                                    <div key={ex.id} className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl space-y-2">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="font-bold text-slate-200">Attempt #{ex.attempt_number}</span>
                                            <StatusBadge status={ex.status} size="sm" />
                                        </div>
                                        <div className="text-[11px] text-slate-400 space-y-1">
                                            <div>Worker: <span className="text-slate-200">{ex.worker_name || 'Unassigned'}</span></div>
                                            <div>Started: {new Date(ex.started_at).toLocaleString()}</div>
                                            {ex.duration_ms && <div>Duration: <span className="text-cyan-400 font-bold">{ex.duration_ms} ms</span></div>}
                                        </div>
                                        {ex.error && (
                                            <div className="bg-rose-950/40 p-2 rounded text-[11px] text-rose-400 border border-rose-900/50">
                                                {ex.error}
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    ) : (
                        /* System Logs Tab */
                        <div className="space-y-3 font-mono">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs text-slate-400">Filter Log Level:</span>
                                <select
                                    value={logLevelFilter}
                                    onChange={(e) => setLogLevelFilter(e.target.value)}
                                    className="bg-slate-950 border border-slate-800 text-xs text-slate-200 px-2 py-1 rounded"
                                >
                                    <option value="ALL">ALL LEVELS</option>
                                    <option value="INFO">INFO</option>
                                    <option value="WARN">WARN</option>
                                    <option value="ERROR">ERROR</option>
                                </select>
                            </div>

                            {filteredLogs.length === 0 ? (
                                <div className="text-center py-8 text-slate-500 text-xs">No log entries found.</div>
                            ) : (
                                filteredLogs.map((log) => (
                                    <div key={log.id} className="bg-slate-950/80 p-3 rounded-lg border border-slate-800/80 text-xs space-y-1">
                                        <div className="flex items-center justify-between text-[10px]">
                                            <span className={`font-bold ${log.level === 'ERROR' ? 'text-rose-400' : log.level === 'WARN' ? 'text-amber-400' : 'text-cyan-400'}`}>
                                                [{log.level}]
                                            </span>
                                            <span className="text-slate-500">{new Date(log.created_at).toLocaleTimeString()}</span>
                                        </div>
                                        <p className="text-slate-200 text-[11px]">{log.message}</p>
                                        {log.metadata && Object.keys(log.metadata).length > 0 && (
                                            <pre className="text-[10px] text-slate-400 bg-slate-900 p-1.5 rounded overflow-x-auto mt-1">
                                                {JSON.stringify(log.metadata, null, 2)}
                                            </pre>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default JobDetailDrawer;
