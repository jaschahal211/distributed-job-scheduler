import React, { useState, useEffect } from 'react';
import { X, Plus, Layers, Zap, Clock, Calendar, CheckCircle2 } from 'lucide-react';
import { jobApi, queueApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

const getFutureDatetimeString = (minutesToAdd = 10) => {
    const date = new Date(Date.now() + minutesToAdd * 60 * 1000);
    date.setSeconds(0, 0);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const mins = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${mins}`;
};

const CreateJobModal = ({ onClose, onJobCreated }) => {
    const { currentProject } = useAuth();
    const [queues, setQueues] = useState([]);
    const [mode, setMode] = useState('single'); // 'single' or 'batch'
    const [executionType, setExecutionType] = useState('immediate'); // 'immediate', 'delayed', 'scheduled'
    const [scheduleError, setScheduleError] = useState('');

    // Single Job Form
    const [jobForm, setJobForm] = useState({
        name: 'Send Customer Email',
        queueId: '',
        type: 'SUCCESS_TASK',
        priority: 5,
        delaySeconds: 10,
        scheduledAt: getFutureDatetimeString(10),
        payload: JSON.stringify({ userId: 'usr_102', email: 'user@example.com' }, null, 2),
        idempotencyKey: '',
    });

    // Batch Job Form
    const [batchCount, setBatchCount] = useState(10);
    const [batchType, setBatchType] = useState('SUCCESS_TASK');

    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (currentProject) {
            queueApi.list(currentProject.id).then((res) => {
                if (res.success && res.data.length > 0) {
                    setQueues(res.data);
                    setJobForm((f) => ({ ...f, queueId: res.data[0].id }));
                }
            });
        }
    }, [currentProject]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setScheduleError('');
        setSubmitting(true);

        try {
            if (mode === 'single') {
                let parsedPayload = {};
                try {
                    parsedPayload = JSON.parse(jobForm.payload);
                } catch (err) {
                    alert('Invalid JSON payload');
                    setSubmitting(false);
                    return;
                }

                const payload = {
                    name: jobForm.name,
                    type: jobForm.type,
                    priority: parseInt(jobForm.priority, 10),
                    payload: parsedPayload,
                    idempotencyKey: jobForm.idempotencyKey || undefined,
                };

                if (executionType === 'delayed') {
                    payload.delaySeconds = parseInt(jobForm.delaySeconds, 10);
                } else if (executionType === 'scheduled') {
                    const scheduledDate = new Date(jobForm.scheduledAt);
                    if (!jobForm.scheduledAt || isNaN(scheduledDate.getTime()) || scheduledDate <= new Date()) {
                        setScheduleError('Scheduled execution time must be a valid future date & time.');
                        setSubmitting(false);
                        return;
                    }
                    payload.scheduledAt = scheduledDate.toISOString();
                }

                await jobApi.create(jobForm.queueId, payload);
            } else {
                // Batch Creation
                const jobs = Array.from({ length: batchCount }, (_, i) => ({
                    projectId: currentProject.id,
                    queueId: jobForm.queueId,
                    name: `Batch Job ${i + 1}/${batchCount}`,
                    type: batchType,
                    priority: Math.floor(Math.random() * 10) + 1,
                    payload: { batchIndex: i + 1, total: batchCount },
                }));

                await jobApi.batchCreate({ jobs });
            }

            if (onJobCreated) onJobCreated();
            onClose();
        } catch (err) {
            alert(`Job submission failed: ${err.message}`);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-xl w-full shadow-2xl space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
                            <Zap className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-slate-100">Create New Job</h2>
                            <p className="text-xs text-slate-400">Submit immediate, delayed, scheduled, or batch work requests</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Mode Selector Tabs */}
                <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-mono">
                    <button
                        type="button"
                        onClick={() => setMode('single')}
                        className={`flex-1 py-1.5 rounded-md font-semibold transition-all ${mode === 'single' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                            }`}
                    >
                        Single Job
                    </button>
                    <button
                        type="button"
                        onClick={() => setMode('batch')}
                        className={`flex-1 py-1.5 rounded-md font-semibold transition-all ${mode === 'batch' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                            }`}
                    >
                        ⚡ Batch Submit (Mass Simulation)
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 text-xs font-mono">
                    {mode === 'single' ? (
                        <>
                            <div>
                                <label className="text-slate-400 block mb-1 font-sans">Job Name</label>
                                <input
                                    type="text"
                                    required
                                    value={jobForm.name}
                                    onChange={(e) => setJobForm({ ...jobForm, name: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-slate-400 block mb-1 font-sans">Target Queue</label>
                                    <select
                                        value={jobForm.queueId}
                                        onChange={(e) => setJobForm({ ...jobForm, queueId: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 font-sans"
                                    >
                                        {queues.map((q) => (
                                            <option key={q.id} value={q.id}>
                                                {q.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-slate-400 block mb-1 font-sans">Job Type / Handler</label>
                                    <select
                                        value={jobForm.type}
                                        onChange={(e) => setJobForm({ ...jobForm, type: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                                    >
                                        <option value="SUCCESS_TASK">SUCCESS_TASK (Instant Success)</option>
                                        <option value="DELAY_TASK">DELAY_TASK (Sleep Simulation)</option>
                                        <option value="FAIL_TASK">FAIL_TASK (Triggers Retry & DLQ)</option>
                                        <option value="RANDOM_FAIL_TASK">RANDOM_FAIL_TASK (50% Flaky)</option>
                                        <option value="DATA_PROCESS_TASK">DATA_PROCESS_TASK (CPU Work)</option>
                                        <option value="HTTP_REQUEST">HTTP_REQUEST (Fetch Simulation)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-slate-400 block mb-1 font-sans">Priority (1-100)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="100"
                                        value={jobForm.priority}
                                        onChange={(e) => setJobForm({ ...jobForm, priority: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-slate-400 block mb-1 font-sans">Execution Timing</label>
                                    <select
                                        value={executionType}
                                        onChange={(e) => {
                                            setExecutionType(e.target.value);
                                            setScheduleError('');
                                        }}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 font-sans"
                                    >
                                        <option value="immediate">Immediate Queueing</option>
                                        <option value="delayed">Delayed Queueing (Backoff)</option>
                                        <option value="scheduled">Scheduled Execution (Date/Time)</option>
                                    </select>
                                </div>
                            </div>

                            {executionType === 'delayed' && (
                                <div>
                                    <label className="text-amber-400 block mb-1 font-sans">Delay Duration (Seconds)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="3600"
                                        value={jobForm.delaySeconds}
                                        onChange={(e) => setJobForm({ ...jobForm, delaySeconds: e.target.value })}
                                        className="w-full bg-slate-950 border border-amber-500/50 text-amber-300 rounded-lg px-3 py-2 focus:outline-none"
                                    />
                                </div>
                            )}

                            {executionType === 'scheduled' && (
                                <div>
                                    <label className="text-sky-400 block mb-1 font-sans">Scheduled Date & Time</label>
                                    <input
                                        type="datetime-local"
                                        value={jobForm.scheduledAt}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setJobForm({ ...jobForm, scheduledAt: val });
                                            if (new Date(val) <= new Date()) {
                                                setScheduleError('Scheduled execution time must be in the future.');
                                            } else {
                                                setScheduleError('');
                                            }
                                        }}
                                        className="w-full bg-slate-950 border border-sky-500/50 text-sky-300 rounded-lg px-3 py-2 focus:outline-none"
                                    />
                                    {scheduleError && (
                                        <p className="text-rose-400 text-[11px] mt-1 font-sans font-medium flex items-center gap-1">
                                            ⚠️ {scheduleError}
                                        </p>
                                    )}
                                </div>
                            )}

                            <div>
                                <label className="text-slate-400 block mb-1 font-sans">Payload JSON</label>
                                <textarea
                                    rows="4"
                                    value={jobForm.payload}
                                    onChange={(e) => setJobForm({ ...jobForm, payload: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-cyan-300 focus:outline-none focus:border-cyan-500"
                                />
                            </div>

                            <div>
                                <label className="text-slate-400 block mb-1 font-sans">Idempotency Key (Optional)</label>
                                <input
                                    type="text"
                                    placeholder="e.g. key_tx_9482941"
                                    value={jobForm.idempotencyKey}
                                    onChange={(e) => setJobForm({ ...jobForm, idempotencyKey: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-300 focus:outline-none"
                                />
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Batch Mode Form */}
                            <div className="bg-cyan-950/40 p-4 rounded-xl border border-cyan-800/40 space-y-2 text-slate-300 font-sans text-xs">
                                <p className="font-bold text-cyan-400">Concurrency Load Simulator</p>
                                <p>Generate a bulk batch of jobs to test atomic claiming, queue concurrency limits, and execution throughput across worker nodes.</p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-slate-400 block mb-1 font-sans">Batch Size (Job Count)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="100"
                                        value={batchCount}
                                        onChange={(e) => setBatchCount(parseInt(e.target.value, 10))}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="text-slate-400 block mb-1 font-sans">Batch Handler Type</label>
                                    <select
                                        value={batchType}
                                        onChange={(e) => setBatchType(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono"
                                    >
                                        <option value="SUCCESS_TASK">SUCCESS_TASK</option>
                                        <option value="RANDOM_FAIL_TASK">RANDOM_FAIL_TASK (50% Fail Rate)</option>
                                        <option value="DELAY_TASK">DELAY_TASK</option>
                                        <option value="DATA_PROCESS_TASK">DATA_PROCESS_TASK</option>
                                    </select>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Form Controls */}
                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800 font-sans">
                        <button
                            type="button"
                            onClick={onClose}
                            className="bg-slate-800 text-slate-400 px-4 py-2 rounded-lg text-xs font-medium hover:bg-slate-700"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="bg-cyan-600 hover:bg-cyan-500 text-white px-5 py-2 rounded-lg text-xs font-medium shadow-md transition-all disabled:opacity-50"
                        >
                            {submitting ? 'Submitting...' : mode === 'single' ? 'Submit Job' : `Enqueue ${batchCount} Batch Jobs`}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateJobModal;
