import { useEffect, useRef, useState } from 'react';
import { Head } from '@inertiajs/react';
import { FileItem, FileDetails } from '@/types';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import axios from 'axios';

// ─── Types ────────────────────────────────────────────────────────────────────
type Status = FileDetails['status']; // 'inactive' | 'active' | 'archived'

interface Uploader {
    id: number;
    name: string;
    avatar: string | null;
}

interface FileWithUploader extends FileItem {
    uploader: Uploader;
}

interface DepartmentGroup {
    id: number;
    name: string;
    logo: string | null;
    files: FileWithUploader[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatSize(bytes: number | undefined): string {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(date: string | Date | null | undefined): string {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

const STATUS_STYLES: Record<Status, string> = {
    active: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400',
    inactive: 'bg-rose-50 text-rose-500 dark:bg-rose-950/40 dark:text-rose-400',
    archived: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
};

const STATUS_DOT: Record<Status, string> = {
    active: 'bg-emerald-500',
    inactive: 'bg-rose-400',
    archived: 'bg-gray-400',
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function SkeletonCard() {
    return (
        <div className="rounded-2xl overflow-hidden bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 animate-pulse">
            <div className="flex items-center gap-3 p-4">
                <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-white/10 shrink-0" />
                <div className="flex-1 space-y-2">
                    <div className="h-3 bg-slate-200 dark:bg-white/10 rounded-full w-3/4" />
                    <div className="h-2 bg-slate-200 dark:bg-white/10 rounded-full w-1/2" />
                </div>
                <div className="w-4 h-4 rounded-full bg-slate-200 dark:bg-white/10" />
            </div>
        </div>
    );
}

function SkeletonDepartment() {
    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3 animate-pulse">
                <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-white/10" />
                <div className="h-4 w-40 bg-slate-200 dark:bg-white/10 rounded-full" />
                <div className="h-5 w-8 bg-slate-200 dark:bg-white/10 rounded-full" />
                <div className="flex-1 h-px bg-slate-200 dark:bg-white/10" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
        </div>
    );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState() {
    return (
        <div className="flex flex-col items-center justify-center py-24 gap-5 text-center">
            <div className="w-20 h-20 rounded-3xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center text-4xl shadow-inner">📂</div>
            <div>
                <p className="text-slate-700 dark:text-slate-300 font-semibold text-lg">No files uploaded yet</p>
                <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">Files uploaded by users will appear here, grouped by department.</p>
            </div>
        </div>
    );
}

// ─── Department Header ────────────────────────────────────────────────────────
function DepartmentHeader({ dept }: { dept: DepartmentGroup }) {
    return (
        <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-lg overflow-hidden bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center shrink-0">
                {dept.logo ? (
                    <img src={dept.logo} alt={dept.name} className="w-full h-full object-cover" />
                ) : (
                    <svg className="w-4 h-4 text-indigo-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd" />
                    </svg>
                )}
            </div>
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200 tracking-tight">{dept.name}</span>
            <span className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 text-xs font-semibold tabular-nums border border-indigo-100 dark:border-indigo-900/40">
                {dept.files.length} {dept.files.length === 1 ? 'file' : 'files'}
            </span>
            <div className="flex-1 h-px bg-slate-200 dark:bg-white/10" />
        </div>
    );
}

// ─── Meta & Stat sub-components ───────────────────────────────────────────────
function MetaItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className="flex items-start gap-1.5 min-w-0">
            <span className="mt-0.5 shrink-0 text-gray-400 dark:text-gray-500">{icon}</span>
            <div className="min-w-0">
                <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wide leading-none mb-0.5">{label}</p>
                <p className="text-xs text-gray-700 dark:text-gray-300 truncate font-medium">{value}</p>
            </div>
        </div>
    );
}

function StatItem({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
    return (
        <div className="flex-1 flex items-center justify-center gap-1.5 py-2.5">
            {icon}
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">{value}</span>
            <span className="text-[10px] text-gray-400 dark:text-gray-500">{label}</span>
        </div>
    );
}

// ─── Status Button ────────────────────────────────────────────────────────────
function StatusButton({
    fileId,
    currentStatus,
    onStatusChange,
}: {
    fileId: number;
    currentStatus: Status;
    onStatusChange: (newStatus: Status) => void;
}) {
    const [saving, setSaving] = useState(false);

    const applyStatus = async (status: Status) => {
        setSaving(true);
        try {
            await axios.patch(`/api/all-files/${fileId}/status`, { status });
            onStatusChange(status);
            toast.success(`Status changed to "${status}"`);
        } catch {
            toast.error('Failed to update status. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const handleClick = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (saving) return;

        if (currentStatus === 'inactive') {
            // Show SweetAlert with two choices: Active or Archived
            const isDark = document.documentElement.classList.contains('dark');
            const { value, isDismissed } = await Swal.fire({
                title: 'Activate this file?',
                html: `
                    <p style="color:${isDark ? '#94a3b8' : '#64748b'}; font-size:0.875rem; margin-bottom:0.5rem;">
                        Choose how you want to change this file's status:
                    </p>
                `,
                icon: 'question',
                showDenyButton: true,
                showCancelButton: true,
                confirmButtonText: '✅ Set Active',
                denyButtonText: '🗄️ Set Archived',
                cancelButtonText: 'Cancel',
                background: isDark ? '#111827' : '#ffffff',
                color: isDark ? '#e2e8f0' : '#1e293b',
                confirmButtonColor: '#10b981',
                denyButtonColor: '#6b7280',
                reverseButtons: true,
                customClass: {
                    popup: 'rounded-2xl',
                    confirmButton: 'rounded-xl text-sm font-medium',
                    denyButton: 'rounded-xl text-sm font-medium',
                    cancelButton: 'rounded-xl text-sm font-medium',
                },
            });

            if (isDismissed) return;
            if (value === true) await applyStatus('active');
            if (value === false) await applyStatus('archived');
            return;
        }

        // active or archived → toggle back to inactive
        const isDark = document.documentElement.classList.contains('dark');
        const { isConfirmed } = await Swal.fire({
            title: 'Set to Inactive?',
            text: `This will mark the file as inactive.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, set inactive',
            cancelButtonText: 'Cancel',
            background: isDark ? '#111827' : '#ffffff',
            color: isDark ? '#e2e8f0' : '#1e293b',
            confirmButtonColor: '#f43f5e',
            customClass: {
                popup: 'rounded-2xl',
                confirmButton: 'rounded-xl text-sm font-medium',
                cancelButton: 'rounded-xl text-sm font-medium',
            },
        });

        if (isConfirmed) await applyStatus('inactive');
    };

    const badgeStyle = STATUS_STYLES[currentStatus];
    const dotStyle = STATUS_DOT[currentStatus];

    return (
        <button
            onClick={handleClick}
            disabled={saving}
            title="Click to change status"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all
                ${badgeStyle}
                border-current/20 hover:opacity-75
                disabled:opacity-50 disabled:cursor-not-allowed`}
        >
            {saving ? (
                <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
            ) : (
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotStyle}`} />
            )}
            <span className="capitalize">{currentStatus}</span>
            <svg className="w-3 h-3 opacity-60" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
        </button>
    );
}

// ─── Collapsible File Card ────────────────────────────────────────────────────
function ReadOnlyFileCard({
    file,
    onStatusChange,
}: {
    file: FileWithUploader;
    onStatusChange: (fileId: number, newStatus: Status) => void;
}) {
    const [expanded, setExpanded] = useState(false);
    const [currentStatus, setCurrentStatus] = useState<Status>(file.details?.status ?? 'inactive');
    const d = file.details;

    const handleStatusChange = (newStatus: Status) => {
        setCurrentStatus(newStatus);
        onStatusChange(file.id, newStatus);
    };

    const badgeStyle = STATUS_STYLES[currentStatus];

    return (
        <div className="group flex flex-col bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">

            {/* ── Header (click to expand) ── */}
            <button
                onClick={() => setExpanded(prev => !prev)}
                className="flex items-center gap-3 p-4 w-full text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
                <div className="shrink-0 w-10 h-10 flex items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/50">
                    <svg className="w-5 h-5 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                </div>

                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate leading-tight" title={d?.fileName}>
                        {d?.fileName ?? 'Untitled'}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${badgeStyle}`}>
                            {currentStatus}
                        </span>
                        <span className="text-[10px] text-gray-400 dark:text-gray-500">{formatSize(d?.size)}</span>
                    </div>
                </div>

                <svg
                    className={`shrink-0 w-4 h-4 text-gray-400 dark:text-gray-500 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
                    viewBox="0 0 20 20" fill="currentColor"
                >
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
            </button>

            {/* ── Expanded details ── */}
            <div className={`grid transition-all duration-300 ease-in-out ${expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                <div className="overflow-hidden">
                    <div className="mx-4 h-px bg-gray-100 dark:bg-gray-800" />

                    {d?.description && (
                        <p className="px-4 pt-3 text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                            {d.description}
                        </p>
                    )}

                    <div className="px-4 py-3 grid grid-cols-2 gap-x-3 gap-y-2.5">
                        <MetaItem
                            icon={<svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>}
                            label="Authors" value={d?.authors ?? '—'}
                        />
                        <MetaItem
                            icon={<svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg>}
                            label="Published" value={formatDate(d?.publication_date)}
                        />
                        <MetaItem
                            icon={<svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>}
                            label="Location" value={d?.location ?? '—'}
                        />
                        <MetaItem
                            icon={<svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" /></svg>}
                            label="Size" value={formatSize(d?.size)}
                        />
                    </div>

                    <div className="mx-4 h-px bg-gray-100 dark:bg-gray-800" />
                    <div className="flex items-center divide-x divide-gray-100 dark:divide-gray-800">
                        <StatItem
                            icon={<svg className="w-3.5 h-3.5 text-indigo-400" viewBox="0 0 20 20" fill="currentColor"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg>}
                            value={d?.views?.toLocaleString() ?? '0'} label="Views"
                        />
                        <StatItem
                            icon={<svg className="w-3.5 h-3.5 text-emerald-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>}
                            value={d?.downloads?.toLocaleString() ?? '0'} label="Downloads"
                        />
                    </div>

                    <div className="mx-4 h-px bg-gray-100 dark:bg-gray-800" />
                    <div className="flex items-center justify-between gap-2 px-4 py-3">
                        {/* Uploader */}
                        <div className="flex items-center gap-2 min-w-0">
                            <div className="w-5 h-5 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700 shrink-0 flex items-center justify-center">
                                {file.uploader?.avatar ? (
                                    <img src={`/storage/${file.uploader.avatar}`} alt={file.uploader.name} className="w-full h-full object-cover" />
                                ) : (
                                    <svg className="w-3 h-3 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                    </svg>
                                )}
                            </div>
                            <span className="text-[11px] text-gray-400 dark:text-gray-500 truncate">
                                {file.uploader?.name || 'Unknown'}
                            </span>
                        </div>

                        <StatusButton
                            fileId={file.id}
                            currentStatus={currentStatus}
                            onStatusChange={handleStatusChange}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Search Bar ───────────────────────────────────────────────────────────────
function SearchBar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    return (
        <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
                type="text"
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder="Search files by name, author, location…"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm
                    bg-white dark:bg-white/5
                    border border-slate-200 dark:border-white/10
                    text-slate-700 dark:text-slate-200
                    placeholder-slate-400 dark:placeholder-slate-600
                    focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 dark:focus:border-indigo-500
                    transition-all"
            />
            {value && (
                <button
                    onClick={() => onChange('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            )}
        </div>
    );
}

// ─── Stats Summary ────────────────────────────────────────────────────────────
function StatsSummary({ departments }: { departments: DepartmentGroup[] }) {
    const totalFiles = departments.reduce((sum, d) => sum + d.files.length, 0);
    return (
        <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-indigo-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                    </svg>
                </div>
                <div>
                    <p className="text-xs text-slate-400 dark:text-slate-500 leading-none">Total Files</p>
                    <p className="text-sm font-bold text-slate-800 dark:text-white tabular-nums">{totalFiles}</p>
                </div>
            </div>
            <div className="w-px h-8 bg-slate-200 dark:bg-white/10" />
            <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-violet-50 dark:bg-violet-950/50 flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-violet-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd" />
                    </svg>
                </div>
                <div>
                    <p className="text-xs text-slate-400 dark:text-slate-500 leading-none">Departments</p>
                    <p className="text-sm font-bold text-slate-800 dark:text-white tabular-nums">{departments.length}</p>
                </div>
            </div>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function IndexFiles() {
    const [departments, setDepartments] = useState<DepartmentGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const loadFiles = async () => {
        setLoading(true);
        try {
            const { data } = await axios.get('/api/all-files');
            setDepartments(Array.isArray(data) ? data : []);
        } catch {
            setDepartments([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadFiles(); }, []);

    useEffect(() => {
        loadFiles();

        // Laravel Echo: instant update when status changes
        const channel = (window as any).Echo?.channel('files');
        channel?.listen('.FileStatusChanged', (e: { fileId: number; newStatus: Status }) => {
            setDepartments(prev =>
                prev.map(dept => ({
                    ...dept,
                    files: dept.files.map(f =>
                        f.id === e.fileId && f.details
                            ? { ...f, details: { ...f.details, status: e.newStatus } }
                            : f
                    ),
                }))
            );
        });

        return () => {
            channel?.stopListening('.FileStatusChanged');
            (window as any).Echo?.leave('files');
        };
    }, []);

    const handleStatusChange = (fileId: number, newStatus: Status) => {
        setDepartments(prev =>
            prev.map(dept => ({
                ...dept,
                files: dept.files.map(f =>
                    f.id === fileId && f.details
                        ? { ...f, details: { ...f.details, status: newStatus } }
                        : f
                ),
            }))
        );
    };

    const filtered: DepartmentGroup[] = search.trim()
        ? departments
            .map(dept => ({
                ...dept,
                files: dept.files.filter(f => {
                    const q = search.toLowerCase();
                    return (
                        f.details?.fileName?.toLowerCase().includes(q) ||
                        f.details?.authors?.toLowerCase().includes(q) ||
                        f.details?.location?.toLowerCase().includes(q) ||
                        f.details?.description?.toLowerCase().includes(q) ||
                        f.uploader?.name?.toLowerCase().includes(q)
                    );
                }),
            }))
            .filter(dept => dept.files.length > 0)
        : departments;

    const isEmpty = !loading && departments.length === 0;
    const noResults = !loading && search.trim() !== '' && filtered.length === 0;

    return (
        <AuthenticatedLayout>
            <Head title="All Files" />

            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
                .fm-root { font-family: 'DM Sans', sans-serif; }
                .fm-card-lift { transition: transform .2s ease, box-shadow .2s ease; }
                .fm-card-lift:hover { transform: translateY(-3px); }
                @keyframes slideBar { 0% { left: -40%; } 100% { left: 100%; } }
            `}</style>

            <div
                className="fm-root -mx-4 sm:-mx-6 -my-6 px-4 sm:px-6 py-6 min-h-full bg-slate-50 dark:bg-[#0d0f1a]"
                style={{ backgroundImage: 'var(--fm-bg-gradient)' }}
            >
                <style>{`
                    :root { --fm-bg-gradient: radial-gradient(ellipse 70% 40% at 50% -10%, rgba(99,102,241,.06) 0%, transparent 60%); }
                    .dark  { --fm-bg-gradient: radial-gradient(ellipse 80% 50% at 50% -20%, rgba(99,102,241,.18) 0%, transparent 60%), radial-gradient(ellipse 40% 30% at 80% 80%, rgba(139,92,246,.10) 0%, transparent 60%); }
                `}</style>

                <div className="max-w-7xl mx-auto space-y-8">

                    {/* Header */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-5">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-white">All Files</h1>
                            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Overview of all uploaded files, grouped by department</p>
                        </div>
                        <div className="flex items-center gap-4">
                            {!loading && <StatsSummary departments={departments} />}
                            <button
                                onClick={loadFiles}
                                disabled={loading}
                                title="Refresh"
                                className="w-10 h-10 flex items-center justify-center rounded-xl
                                    bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10
                                    hover:bg-slate-200 dark:hover:bg-white/10
                                    text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white
                                    transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Search */}
                    {!isEmpty && <SearchBar value={search} onChange={setSearch} />}

                    {/* Loading bar */}
                    {loading && (
                        <div className="relative h-0.5 w-full rounded-full overflow-hidden bg-slate-200 dark:bg-white/5">
                            <div
                                className="absolute inset-y-0 w-2/5 rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500"
                                style={{ animation: 'slideBar 1.4s ease-in-out infinite' }}
                            />
                        </div>
                    )}

                    {/* Content */}
                    {loading ? (
                        <div className="space-y-10">
                            <SkeletonDepartment />
                            <SkeletonDepartment />
                        </div>
                    ) : isEmpty ? (
                        <EmptyState />
                    ) : noResults ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                            <span className="text-3xl">🔍</span>
                            <p className="text-slate-600 dark:text-slate-400 font-medium">
                                No files match "<span className="text-indigo-500">{search}</span>"
                            </p>
                            <button
                                onClick={() => setSearch('')}
                                className="text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 underline underline-offset-2 transition-colors"
                            >
                                Clear search
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-12">
                            {filtered.map(dept => (
                                <section key={dept.id}>
                                    <DepartmentHeader dept={dept} />
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                        {dept.files.map(file => (
                                            <div key={file.id} className="fm-card-lift">
                                                <ReadOnlyFileCard
                                                    file={file}
                                                    onStatusChange={handleStatusChange}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
