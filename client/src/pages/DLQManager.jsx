import React, { useState, useEffect } from 'react';
import { AlertTriangle, RotateCcw, Trash2, RefreshCw, Eye, AlertCircle } from 'lucide-react';
import { dlqApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

const DLQManager = () => {
    const { currentProject } = useAuth();
    const [dlqEntries, setDlqEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedEntry, setSelectedEntry] = useState(null);

    const fetchDLQ = async () => {
        setLoading(true);
        try {
            const res = await dlqApi.list();
            if (res.success) setDlqEntries(res.data);
        } catch (err) {
            console.error('Error fetching DLQ entries:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDLQ();
    }, []);

    const handleRedrive = async (id) => {
        try {
            await dlqApi.retry(id);
            fetchDLQ();
            if (selectedEntry?.id === id) setSelectedEntry(null);
        } catch (err) {
            alert(`Redrive failed: ${err.message}`);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to permanently delete this DLQ entry?')) return;
        try {
            await dlqApi.delete(id);
            fetchDLQ();
            if (selectedEntry?.id === id) setSelectedEntry(null);
        } catch (err) {
            alert(`Delete failed: ${err.message}`);
        }
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header Info */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-rose-400" /> Dead Letter Queue (DLQ)
                    </h2>
                    <p className="text-xs text-slate-400">Inspect failed jobs that exceeded retry limits, analyze root causes, and redrive jobs</p>
                </div>
                <button
                    onClick={fetchDLQ}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 border border-slate-700 transition-colors"
                >
                    <RefreshCw className="w-3.5 h-3.5" /> Refresh DLQ
                </button>
            </div>

            {/* DLQ Table */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl shadow-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-300">
                        <thead className="bg-slate-950/80 text-slate-400 uppercase font-mono text-[10px] tracking-wider border-b border-slate-800">
                            <tr>
                                <th className="py-3 px-4">Job Info</th>
                                <th className="py-3 px-4">Queue</th>
                                <th className="py-3 px-4">Reason / Failure Cause</th>
                                <th className="py-3 px-4">Attempts</th>
                                <th className="py-3 px-4">Failed At</th>
                                <th className="py-3 px-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 font-mono">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="py-8 text-center text-slate-500 text-xs">
                                        Loading DLQ entries...
                                    </td>
                                </tr>
                            ) : dlqEntries.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="py-8 text-center text-slate-500 text-xs">
                                        🎉 Dead Letter Queue is clean! No failed jobs.
                                    </td>
                                </tr>
                            ) : (
                                dlqEntries.map((entry) => (
                                    <tr key={entry.id} className="hover:bg-slate-800/40 transition-colors">
                                        <td className="py-3 px-4">
                                            <div className="font-bold text-slate-100 font-sans text-xs">{entry.job_name || 'Job'}</div>
                                            <div className="text-[10px] text-cyan-400/80">{entry.job_id}</div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className="bg-slate-800 px-2 py-0.5 rounded text-[11px] font-sans">
                                                {entry.queue_name || 'default'}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 max-w-xs">
                                            <div className="text-rose-400 font-semibold truncate">{entry.reason}</div>
                                            <div className="text-slate-400 text-[10px] truncate">{entry.error}</div>
                                        </td>
                                        <td className="py-3 px-4 font-bold text-rose-300">
                                            {entry.attempts} Max
                                        </td>
                                        <td className="py-3 px-4 text-slate-400 text-[11px]">
                                            {new Date(entry.failed_at).toLocaleString()}
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => setSelectedEntry(entry)}
                                                    className="p-1 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded transition-colors"
                                                    title="Inspect Error & Payload"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleRedrive(entry.id)}
                                                    className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded text-xs font-sans font-medium flex items-center gap-1 transition-colors"
                                                >
                                                    <RotateCcw className="w-3 h-3" /> Redrive
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(entry.id)}
                                                    className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
                                                    title="Purge DLQ Entry"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Inspect Entry Modal */}
            {selectedEntry && (
                <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-xl w-full shadow-2xl space-y-4 font-mono">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <h3 className="text-sm font-bold text-slate-100 font-sans flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-rose-400" /> DLQ Entry Inspector
                            </h3>
                            <button
                                onClick={() => setSelectedEntry(null)}
                                className="text-slate-400 hover:text-slate-200 text-sm font-bold"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="space-y-3 text-xs">
                            <div className="bg-rose-950/40 p-3 rounded-lg border border-rose-900/50 space-y-1">
                                <span className="text-rose-400 font-bold block">Failure Reason:</span>
                                <p className="text-rose-200">{selectedEntry.reason}</p>
                                <p className="text-rose-300 text-[11px] pt-1">{selectedEntry.error}</p>
                            </div>

                            <div>
                                <span className="text-slate-400 uppercase text-[10px] font-bold block mb-1">Payload JSON</span>
                                <pre className="bg-slate-950 p-3 rounded-lg text-cyan-300 text-[11px] border border-slate-800 max-h-48 overflow-y-auto">
                                    {JSON.stringify(selectedEntry.payload || {}, null, 2)}
                                </pre>
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-slate-800 font-sans">
                            <button
                                onClick={() => handleRedrive(selectedEntry.id)}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-md"
                            >
                                <RotateCcw className="w-3.5 h-3.5" /> Re-queue & Redrive Job
                            </button>
                            <button
                                onClick={() => setSelectedEntry(null)}
                                className="bg-slate-800 text-slate-300 px-4 py-2 rounded-lg text-xs font-medium hover:bg-slate-700"
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

export default DLQManager;
