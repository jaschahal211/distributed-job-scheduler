import React, { useState, useEffect } from 'react';
import {
    Search,
    Filter,
    RefreshCw,
    Eye,
    RotateCcw,
    XCircle,
    ChevronLeft,
    ChevronRight,
    Clock,
    Layers,
    Cpu
} from 'lucide-react';
import { jobApi, queueApi, workerApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';

const JobExplorer = ({ onSelectJob }) => {
    const { currentProject } = useAuth();
    const [jobs, setJobs] = useState([]);
    const [queues, setQueues] = useState([]);
    const [workers, setWorkers] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, limit: 15, totalPages: 1, totalCount: 0 });

    // Filters
    const [statusFilter, setStatusFilter] = useState('');
    const [queueFilter, setQueueFilter] = useState('');
    const [workerFilter, setWorkerFilter] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);

    const fetchJobs = async () => {
        setLoading(true);
        try {
            const res = await jobApi.list({
                projectId: currentProject?.id,
                queueId: queueFilter || undefined,
                status: statusFilter || undefined,
                workerId: workerFilter || undefined,
                search: searchQuery || undefined,
                page: pagination.page,
                limit: pagination.limit,
            });

            if (res.success) {
                setJobs(res.data);
                if (res.pagination) setPagination(res.pagination);
            }
        } catch (err) {
            console.error('Error fetching jobs:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchJobs();
    }, [currentProject, queueFilter, statusFilter, workerFilter, pagination.page]);

    useEffect(() => {
        if (currentProject) {
            queueApi.list(currentProject.id).then(res => res.success && setQueues(res.data));
            workerApi.list().then(res => res.success && setWorkers(res.data));
        }
    }, [currentProject]);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        setPagination(p => ({ ...p, page: 1 }));
        fetchJobs();
    };

    const handleRetry = async (e, jobId) => {
        e.stopPropagation();
        try {
            await jobApi.retry(jobId);
            fetchJobs();
        } catch (err) {
            alert(`Retry failed: ${err.message}`);
        }
    };

    const handleCancel = async (e, jobId) => {
        e.stopPropagation();
        try {
            await jobApi.cancel(jobId);
            fetchJobs();
        } catch (err) {
            alert(`Cancel failed: ${err.message}`);
        }
    };

    return (
        <div className="p-6 space-y-4">
            {/* Filter & Search Bar */}
            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
                {/* Search */}
                <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by Job ID or Name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700/80 rounded-lg pl-9 pr-4 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                    />
                </form>

                {/* Filter Dropdowns */}
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    {/* Status Filter */}
                    <select
                        value={statusFilter}
                        onChange={(e) => { setStatusFilter(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
                        className="bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                    >
                        <option value="">All Statuses</option>
                        <option value="queued">QUEUED</option>
                        <option value="scheduled">SCHEDULED</option>
                        <option value="claimed">CLAIMED</option>
                        <option value="running">RUNNING</option>
                        <option value="completed">COMPLETED</option>
                        <option value="failed">FAILED</option>
                    </select>

                    {/* Queue Filter */}
                    <select
                        value={queueFilter}
                        onChange={(e) => { setQueueFilter(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
                        className="bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                    >
                        <option value="">All Queues</option>
                        {queues.map(q => (
                            <option key={q.id} value={q.id}>{q.name}</option>
                        ))}
                    </select>

                    {/* Worker Filter */}
                    <select
                        value={workerFilter}
                        onChange={(e) => { setWorkerFilter(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
                        className="bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                    >
                        <option value="">All Workers</option>
                        {workers.map(w => (
                            <option key={w.id} value={w.id}>{w.name}</option>
                        ))}
                    </select>

                    <button
                        onClick={fetchJobs}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-colors"
                        title="Refresh Jobs"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Jobs Table */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl shadow-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-300">
                        <thead className="bg-slate-950/80 text-slate-400 uppercase font-mono text-[10px] tracking-wider border-b border-slate-800">
                            <tr>
                                <th className="py-3 px-4">Job Details</th>
                                <th className="py-3 px-4">Queue</th>
                                <th className="py-3 px-4">Status</th>
                                <th className="py-3 px-4">Priority</th>
                                <th className="py-3 px-4">Attempts</th>
                                <th className="py-3 px-4">Worker</th>
                                <th className="py-3 px-4">Created At</th>
                                <th className="py-3 px-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 font-mono">
                            {loading ? (
                                <tr>
                                    <td colSpan="8" className="py-8 text-center text-slate-500 text-xs">
                                        Loading jobs...
                                    </td>
                                </tr>
                            ) : jobs.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="py-8 text-center text-slate-500 text-xs">
                                        No jobs match the specified criteria.
                                    </td>
                                </tr>
                            ) : (
                                jobs.map((job) => (
                                    <tr
                                        key={job.id}
                                        onClick={() => onSelectJob(job.id)}
                                        className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                                    >
                                        <td className="py-3 px-4">
                                            <div className="font-bold text-slate-100 font-sans text-xs">{job.name}</div>
                                            <div className="text-[10px] text-cyan-400/80 font-mono">{job.id}</div>
                                        </td>
                                        <td className="py-3 px-4 text-slate-300">
                                            <span className="bg-slate-800 px-2 py-0.5 rounded text-[11px] font-sans">
                                                {job.queue_name || 'default'}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4">
                                            <StatusBadge status={job.status} size="sm" />
                                        </td>
                                        <td className="py-3 px-4 text-slate-300 font-bold">
                                            P-{job.priority}
                                        </td>
                                        <td className="py-3 px-4 text-slate-300">
                                            {job.attempts} / {job.max_attempts}
                                        </td>
                                        <td className="py-3 px-4 text-slate-400 text-[11px]">
                                            {job.worker_name ? (
                                                <span className="text-emerald-400 flex items-center gap-1">
                                                    <Cpu className="w-3 h-3" /> {job.worker_name}
                                                </span>
                                            ) : (
                                                <span className="text-slate-500 italic">Unassigned</span>
                                            )}
                                        </td>
                                        <td className="py-3 px-4 text-slate-400 text-[11px]">
                                            {new Date(job.created_at).toLocaleString()}
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onSelectJob(job.id); }}
                                                    className="p-1 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded transition-colors"
                                                    title="View Details & Logs"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                {(job.status === 'failed' || job.status === 'completed') && (
                                                    <button
                                                        onClick={(e) => handleRetry(e, job.id)}
                                                        className="p-1 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded transition-colors"
                                                        title="Re-queue Job"
                                                    >
                                                        <RotateCcw className="w-4 h-4" />
                                                    </button>
                                                )}
                                                {(job.status === 'queued' || job.status === 'scheduled' || job.status === 'running') && (
                                                    <button
                                                        onClick={(e) => handleCancel(e, job.id)}
                                                        className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
                                                        title="Cancel Job"
                                                    >
                                                        <XCircle className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Bar */}
                <div className="p-3 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
                    <span>
                        Page {pagination.page} of {pagination.totalPages} ({pagination.totalCount} total jobs)
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            disabled={!pagination.hasPrev}
                            onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                            className="p-1.5 bg-slate-900 border border-slate-800 rounded hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                            disabled={!pagination.hasNext}
                            onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                            className="p-1.5 bg-slate-900 border border-slate-800 rounded hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default JobExplorer;
