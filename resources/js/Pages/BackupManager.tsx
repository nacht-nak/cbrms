import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import Authenticated from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import {
    CloudArrowDownIcon,
    TrashIcon,
    ArrowPathIcon,
    ShieldCheckIcon,
    ClockIcon,
    ServerStackIcon,
    ExclamationTriangleIcon,
    CheckCircleIcon,
    InformationCircleIcon,
    XMarkIcon,
} from '@heroicons/react/24/outline';
import { DatabaseBackup, HardDrive, Plus } from 'lucide-react';

interface Backup {
    name: string;
    size_human: string;
    created_at: string;
}

interface StatusState {
    type: 'success' | 'error' | 'info';
    message: string;
}

const breadcrumbs = [
    { title: 'Dashboard', href: route('admin.dashboard') },
    { title: 'Backup & Restore' },
];

export default function BackupManager() {
    const [backups, setBackups] = useState<Backup[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [status, setStatus] = useState<StatusState | null>(null);
    const [restoreFile, setRestoreFile] = useState<File | null>(null);
    const [restoring, setRestoring] = useState(false);
    const [deletingFile, setDeletingFile] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const notify = (type: StatusState['type'], message: string) => {
        setStatus({ type, message });
        setTimeout(() => setStatus(null), 6000);
    };

    const fetchBackups = async () => {
        setFetching(true);
        try {
            const res = await axios.get('/api/admin/backup');
            setBackups(res.data.backups);
        } catch {
            notify('error', 'Failed to load backups.');
        } finally {
            setFetching(false);
        }
    };

    useEffect(() => { fetchBackups(); }, []);

    const createBackup = async () => {
        setLoading(true);
        notify('info', 'Creating backup — this may take a moment...');
        try {
            const res = await axios.post('/api/admin/backup/create');
            notify('success', res.data.message);
            fetchBackups();
        } catch (e: any) {
            notify('error', e.response?.data?.message || 'Backup failed.');
        } finally {
            setLoading(false);
        }
    };

    const downloadBackup = (name: string) => {
        window.location.href = `/api/admin/backup/download?file=${encodeURIComponent(name)}`;
    };

    const deleteBackup = async (name: string) => {
        if (!confirm(`Delete "${name}"?\nThis cannot be undone.`)) return;
        setDeletingFile(name);
        try {
            await axios.delete(`/api/admin/backup/delete?file=${encodeURIComponent(name)}`);
            notify('success', 'Backup deleted successfully.');
            fetchBackups();
        } catch {
            notify('error', 'Failed to delete backup.');
        } finally {
            setDeletingFile(null);
        }
    };

    const handleRestore = async () => {
        if (!restoreFile) return;
        if (!confirm('⚠️ This will completely overwrite your current database.\n\nAre you absolutely sure?')) return;
        const form = new FormData();
        form.append('file', restoreFile);
        setRestoring(true);
        try {
            const res = await axios.post('/api/admin/backup/restore', form, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            notify('success', res.data.message);
            setRestoreFile(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        } catch (e: any) {
            notify('error', e.response?.data?.message || 'Restore failed.');
        } finally {
            setRestoring(false);
        }
    };

    const statusConfig: Record<StatusState['type'], { icon: React.ReactNode; classes: string }> = {
        success: {
            icon: <CheckCircleIcon className="w-5 h-5 shrink-0 text-emerald-500" />,
            classes: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300',
        },
        error: {
            icon: <ExclamationTriangleIcon className="w-5 h-5 shrink-0 text-red-500" />,
            classes: 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300',
        },
        info: {
            icon: <InformationCircleIcon className="w-5 h-5 shrink-0 text-blue-500" />,
            classes: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300',
        },
    };

    return (
        <Authenticated breadcrumbs={breadcrumbs}>
            <Head title="Backup & Restore" />

            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">

                    {/* ── Page Header ── */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-indigo-600 shadow-lg shadow-indigo-500/30">
                                <DatabaseBackup className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                                    Backup & Restore
                                </h1>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                                    Auto-backup daily at{' '}
                                    <span className="font-semibold text-indigo-600 dark:text-indigo-400">2:00 AM</span>
                                    {' '}· DB + Files
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={createBackup}
                            disabled={loading}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-500/25 transition-all duration-200 active:scale-95"
                        >
                            {loading
                                ? <><ArrowPathIcon className="w-4 h-4 animate-spin" /> Creating...</>
                                : <><Plus className="w-4 h-4" /> Manual Backup</>
                            }
                        </button>
                    </div>

                    {/* ── Status Alert ── */}
                    {status !== null && (
                        <div className={`flex items-start gap-3 px-4 py-3.5 rounded-xl border text-sm font-medium transition-all ${statusConfig[status.type].classes}`}>
                            {statusConfig[status.type].icon}
                            <span className="flex-1">{status.message}</span>
                            <button onClick={() => setStatus(null)} className="opacity-60 hover:opacity-100 transition-opacity">
                                <XMarkIcon className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                    {/* ── Stats Row ── */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {[
                            {
                                label: 'Total Backups',
                                value: backups.length,
                                icon: <HardDrive className="w-4 h-4" />,
                                color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/40',
                            },
                            {
                                label: 'Latest Backup',
                                value: backups[0]?.created_at?.split(' ')[0] ?? '—',
                                icon: <ClockIcon className="w-4 h-4" />,
                                color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/40',
                            },
                            {
                                label: 'Schedule',
                                value: 'Daily 2 AM',
                                icon: <ShieldCheckIcon className="w-4 h-4" />,
                                color: 'text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-900/40',
                            },
                        ].map((stat) => (
                            <div
                                key={stat.label}
                                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3.5 flex items-center gap-3"
                            >
                                <div className={`p-2 rounded-lg shrink-0 ${stat.color}`}>
                                    {stat.icon}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{stat.label}</p>
                                    <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{stat.value}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* ── Backup List ── */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-2">
                                <ServerStackIcon className="w-4 h-4 text-slate-400" />
                                <h2 className="font-semibold text-slate-800 dark:text-white text-sm">Available Backups</h2>
                            </div>
                            <button
                                onClick={fetchBackups}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                                title="Refresh"
                            >
                                <ArrowPathIcon className={`w-4 h-4 ${fetching ? 'animate-spin' : ''}`} />
                            </button>
                        </div>

                        {fetching ? (
                            <div className="px-5 py-12 flex flex-col items-center gap-3 text-slate-400">
                                <ArrowPathIcon className="w-6 h-6 animate-spin" />
                                <span className="text-sm">Loading backups...</span>
                            </div>
                        ) : backups.length === 0 ? (
                            <div className="px-5 py-14 flex flex-col items-center gap-3 text-slate-400 dark:text-slate-500">
                                <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800">
                                    <DatabaseBackup className="w-8 h-8 opacity-50" />
                                </div>
                                <p className="text-sm font-medium">No backups yet</p>
                                <p className="text-xs text-center max-w-xs opacity-75">
                                    Click <span className="font-semibold text-indigo-500">Manual Backup</span> above to create your first backup.
                                </p>
                            </div>
                        ) : (
                            <>
                                {/* Desktop Table */}
                                <div className="hidden sm:block overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
                                                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">File</th>
                                                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Size</th>
                                                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Created</th>
                                                <th className="text-right px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {backups.map((b) => (
                                                <tr key={b.name} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                                                    <td className="px-5 py-3.5">
                                                        <span className="font-mono text-xs text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">
                                                            {b.name}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 text-xs font-medium">{b.size_human}</td>
                                                    <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 text-xs">{b.created_at}</td>
                                                    <td className="px-5 py-3.5">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button
                                                                onClick={() => downloadBackup(b.name)}
                                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 rounded-lg transition-all active:scale-95"
                                                            >
                                                                <CloudArrowDownIcon className="w-3.5 h-3.5" />
                                                                Download
                                                            </button>
                                                            <button
                                                                onClick={() => deleteBackup(b.name)}
                                                                disabled={deletingFile === b.name}
                                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-200 dark:border-red-800 rounded-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                                            >
                                                                {deletingFile === b.name
                                                                    ? <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
                                                                    : <TrashIcon className="w-3.5 h-3.5" />
                                                                }
                                                                Delete
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Mobile Cards */}
                                <div className="sm:hidden divide-y divide-slate-100 dark:divide-slate-800">
                                    {backups.map((b) => (
                                        <div key={b.name} className="px-4 py-4 space-y-3">
                                            <span className="font-mono text-xs text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md break-all">
                                                {b.name}
                                            </span>
                                            <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                                                <span className="font-medium">{b.size_human}</span>
                                                <span>{b.created_at}</span>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => downloadBackup(b.name)}
                                                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 rounded-lg transition-all active:scale-95"
                                                >
                                                    <CloudArrowDownIcon className="w-3.5 h-3.5" /> Download
                                                </button>
                                                <button
                                                    onClick={() => deleteBackup(b.name)}
                                                    disabled={deletingFile === b.name}
                                                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg transition-all active:scale-95 disabled:opacity-50"
                                                >
                                                    {deletingFile === b.name
                                                        ? <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
                                                        : <TrashIcon className="w-3.5 h-3.5" />
                                                    }
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    {/* ── Restore Section ── */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                        <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100 dark:border-slate-800">
                            <ArrowPathIcon className="w-4 h-4 text-slate-400" />
                            <h2 className="font-semibold text-slate-800 dark:text-white text-sm">Restore Database</h2>
                        </div>

                        <div className="px-5 py-5 space-y-4">
                            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                                <ExclamationTriangleIcon className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                                    Upload a{' '}
                                    <code className="font-mono bg-amber-100 dark:bg-amber-900/50 px-1 py-0.5 rounded">.sql</code>
                                    {' '}file extracted from a backup zip.
                                    This will <strong>completely overwrite</strong> your current database and cannot be undone.
                                </p>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3">
                                <label className="flex-1 flex items-center gap-3 px-4 py-3 border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-600 rounded-xl cursor-pointer transition-colors group">
                                    <HardDrive className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors shrink-0" />
                                    <span className="text-sm text-slate-500 dark:text-slate-400 truncate">
                                        {restoreFile ? restoreFile.name : 'Choose .sql file...'}
                                    </span>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".sql,.txt"
                                        onChange={(e) => setRestoreFile(e.target.files?.[0] || null)}
                                        className="hidden"
                                    />
                                </label>

                                <button
                                    onClick={handleRestore}
                                    disabled={!restoreFile || restoring}
                                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl shadow-lg shadow-amber-500/25 transition-all duration-200 active:scale-95 whitespace-nowrap"
                                >
                                    {restoring
                                        ? <><ArrowPathIcon className="w-4 h-4 animate-spin" /> Restoring...</>
                                        : <><ArrowPathIcon className="w-4 h-4" /> Restore Now</>
                                    }
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* ── Schedule Info ── */}
                    <div className="bg-slate-900 dark:bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4 space-y-2">
                        <div className="flex items-center gap-2">
                            <ClockIcon className="w-4 h-4 text-indigo-400" />
                            <span className="text-sm font-semibold text-white">Auto-Schedule Info</span>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">
                            Backups run at{' '}
                            <span className="text-indigo-400 font-semibold">2:00 AM</span> daily.
                            Cleanup runs at{' '}
                            <span className="text-indigo-400 font-semibold">3:00 AM</span>.
                            Make sure your server cron is active:
                        </p>
                        <div className="mt-2 font-mono text-xs bg-slate-950 dark:bg-slate-900 text-emerald-400 px-4 py-3 rounded-xl border border-slate-700 overflow-x-auto whitespace-nowrap">
                            * * * * * cd /path-to-project && php artisan schedule:run &gt;&gt; /dev/null 2&gt;&1
                        </div>
                    </div>

                </div>
            </div>
        </Authenticated>
    );
}
