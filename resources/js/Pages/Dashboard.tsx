import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import { useState, useEffect, useRef } from 'react';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Stats {
    totalFiles: number;
    totalFolders: number;
    totalUsers: number;
    totalViews: number;
    totalDownloads: number;
    newUsersThisMonth: number;
}

interface RecentFile {
    id: number;
    name: string;
    user: string;
    status: 'active' | 'inactive' | 'archived';
    views: number;
    downloads: number;
    size: number;
    created_at: string;
}

interface TopFile {
    name: string;
    views: number;
    downloads: number;
}

interface MonthUpload {
    month: string;
    count: number;
}

interface Props {
    stats: Stats;
    filesByStatus: Record<string, number>;
    recentFiles: RecentFile[];
    topViewed: TopFile[];
    uploadsPerMonth: MonthUpload[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatNumber(n: number): string {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
    return String(n);
}

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// ─── Animated Counter ────────────────────────────────────────────────────────

function AnimatedNumber({ value }: { value: number }) {
    const [display, setDisplay] = useState(0);
    const ref = useRef<number>(0);

    useEffect(() => {
        const start = ref.current;
        const end = value;
        const duration = 900;
        const startTime = performance.now();

        const tick = (now: number) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = Math.round(start + (end - start) * eased);
            setDisplay(current);
            if (progress < 1) requestAnimationFrame(tick);
            else ref.current = end;
        };

        requestAnimationFrame(tick);
    }, [value]);

    return <>{formatNumber(display)}</>;
}

// ─── Sparkline SVG ────────────────────────────────────────────────────────────

function Sparkline({ data, color }: { data: number[]; color: string }) {
    if (data.length < 2) return null;
    const max = Math.max(...data, 1);
    const w = 80, h = 32;
    const pts = data.map((v, i) => {
        const x = (i / (data.length - 1)) * w;
        const y = h - (v / max) * h;
        return `${x},${y}`;
    }).join(' ');

    return (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
            <polyline
                fill="none"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={pts}
            />
            {/* fill under the line */}
            <polygon
                fill={color}
                fillOpacity="0.15"
                points={`0,${h} ${pts} ${w},${h}`}
            />
        </svg>
    );
}

// ─── Bar Chart ────────────────────────────────────────────────────────────────

function BarChart({ data }: { data: MonthUpload[] }) {
    const max = Math.max(...data.map(d => d.count), 1);

    return (
        <div className="flex items-end gap-1.5 h-28 w-full">
            {data.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                        className="w-full rounded-t-md transition-all duration-700 ease-out"
                        style={{
                            height: `${(d.count / max) * 100}%`,
                            background: `hsl(${220 + i * 8}, 70%, 58%)`,
                            minHeight: '4px',
                        }}
                        title={`${d.month}: ${d.count} files`}
                    />
                    <span className="text-[9px] text-gray-400 truncate w-full text-center leading-none">
                        {d.month.split(' ')[0]}
                    </span>
                </div>
            ))}
        </div>
    );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
    inactive: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400',
    archived: 'bg-slate-100 text-slate-500 dark:bg-slate-700/60 dark:text-slate-400',
};

function StatusBadge({ status }: { status: string }) {
    return (
        <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${STATUS_STYLES[status] ?? STATUS_STYLES.inactive}`}>
            {status}
        </span>
    );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
    label: string;
    value: number;
    icon: React.ReactNode;
    accent: string;          // Tailwind bg class for icon bubble
    sparkData?: number[];
    sparkColor?: string;
    sub?: string;
}

function StatCard({ label, value, icon, accent, sparkData, sparkColor, sub }: StatCardProps) {
    return (
        <div className="
            relative overflow-hidden rounded-2xl
            bg-white dark:bg-slate-800/70
            border border-slate-100 dark:border-slate-700/60
            shadow-sm hover:shadow-md
            transition-all duration-300 hover:-translate-y-0.5
            p-5 flex flex-col gap-3
        ">
            {/* Subtle decorative circle */}
            <div className={`absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-10 ${accent}`} />

            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">
                        {label}
                    </p>
                    <p className="text-3xl font-bold text-slate-800 dark:text-white tracking-tight leading-none">
                        <AnimatedNumber value={value} />
                    </p>
                    {sub && (
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{sub}</p>
                    )}
                </div>
                <div className={`flex-shrink-0 w-10 h-10 rounded-xl ${accent} flex items-center justify-center text-white shadow-sm`}>
                    {icon}
                </div>
            </div>

            {sparkData && sparkColor && (
                <div className="mt-auto">
                    <Sparkline data={sparkData} color={sparkColor} />
                </div>
            )}
        </div>
    );
}

// ─── Icons (inline SVG, no dependency) ───────────────────────────────────────

const Icons = {
    File: () => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
    ),
    Folder: () => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
        </svg>
    ),
    Users: () => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
    ),
    Eye: () => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
    ),
    Download: () => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
    ),
    UserPlus: () => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
        </svg>
    ),
    TrendUp: () => (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
    ),
};

// ─── Main Dashboard ───────────────────────────────────────────────────────────

const breadcrumbs = [
    { title: 'Dashboard', href: route('admin.dashboard') },
];

export default function Dashboard({
    stats,
    filesByStatus,
    recentFiles,
    topViewed,
    uploadsPerMonth,
}: Props) {
    const uploadCounts = uploadsPerMonth.map(d => d.count);
    const maxView = Math.max(...topViewed.map(f => f.views), 1);
    const maxDown = Math.max(...topViewed.map(f => f.downloads), 1);

    // Donut chart segments for file status
    const statusData = [
        { label: 'Active', count: filesByStatus['active'] ?? 0, color: '#10b981' },
        { label: 'Inactive', count: filesByStatus['inactive'] ?? 0, color: '#f59e0b' },
        { label: 'Archived', count: filesByStatus['archived'] ?? 0, color: '#64748b' },
    ];
    const totalStatus = statusData.reduce((s, d) => s + d.count, 0) || 1;

    // Build donut arcs
    let cumulative = 0;
    const R = 36, CX = 44, CY = 44, strokeWidth = 14;
    const circumference = 2 * Math.PI * R;

    const donutSegments = statusData.map(seg => {
        const fraction = seg.count / totalStatus;
        const offset = circumference * (1 - cumulative - fraction);
        const dashLen = circumference * fraction;
        const result = { ...seg, fraction, offset, dashLen };
        cumulative += fraction;
        return result;
    });

    return (
        <AuthenticatedLayout breadcrumbs={breadcrumbs}>
            <Head title="Admin Dashboard" />

            {/* Global font import */}
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');

                .dash-root { font-family: 'Sora', sans-serif; }
                .mono { font-family: 'JetBrains Mono', monospace; }

                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(16px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                .slide-up {
                    animation: slideUp 0.45s ease both;
                }
                .slide-up-1 { animation-delay: 0.05s; }
                .slide-up-2 { animation-delay: 0.10s; }
                .slide-up-3 { animation-delay: 0.15s; }
                .slide-up-4 { animation-delay: 0.20s; }
                .slide-up-5 { animation-delay: 0.25s; }
                .slide-up-6 { animation-delay: 0.30s; }
                .slide-up-7 { animation-delay: 0.35s; }
                .slide-up-8 { animation-delay: 0.40s; }
            `}</style>

            <div className="dash-root min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

                    {/* ── Header ── */}
                    <div className="slide-up slide-up-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div>
                            <h1 className="text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight">
                                Admin Overview
                            </h1>
                            <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5">
                                {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1.5 rounded-full border border-emerald-100 dark:border-emerald-800/50">
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                System Online
                            </span>
                        </div>
                    </div>

                    {/* ── Stat Cards Grid ── */}
                    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                        <div className="slide-up slide-up-2 col-span-1">
                            <StatCard label="Total Files" value={stats.totalFiles} icon={<Icons.File />} accent="bg-blue-500"
                                sparkData={uploadCounts} sparkColor="#3b82f6" />
                        </div>
                        <div className="slide-up slide-up-2 col-span-1">
                            <StatCard label="Folders" value={stats.totalFolders} icon={<Icons.Folder />} accent="bg-violet-500" />
                        </div>
                        <div className="slide-up slide-up-3 col-span-1">
                            <StatCard label="Users" value={stats.totalUsers} icon={<Icons.Users />} accent="bg-indigo-500"
                                sub={`+${stats.newUsersThisMonth} this month`} />
                        </div>
                        <div className="slide-up slide-up-4 col-span-1">
                            <StatCard label="Total Views" value={stats.totalViews} icon={<Icons.Eye />} accent="bg-cyan-500" />
                        </div>
                        <div className="slide-up slide-up-4 col-span-1">
                            <StatCard label="Downloads" value={stats.totalDownloads} icon={<Icons.Download />} accent="bg-teal-500" />
                        </div>
                        <div className="slide-up slide-up-5 col-span-1">
                            <StatCard label="New Users" value={stats.newUsersThisMonth} icon={<Icons.UserPlus />} accent="bg-pink-500"
                                sub="This month" />
                        </div>
                    </div>

                    {/* ── Middle Row ── */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                        {/* Upload Activity Bar Chart */}
                        <div className="slide-up slide-up-5 lg:col-span-2 rounded-2xl bg-white dark:bg-slate-800/70 border border-slate-100 dark:border-slate-700/60 shadow-sm p-6">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h2 className="text-sm font-semibold text-slate-700 dark:text-white">Upload Activity</h2>
                                    <p className="text-xs text-slate-400 dark:text-slate-500">Last 6 months</p>
                                </div>
                                <span className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                                    <Icons.TrendUp />
                                    Monthly uploads
                                </span>
                            </div>
                            {uploadsPerMonth.length > 0
                                ? <BarChart data={uploadsPerMonth} />
                                : <div className="h-28 flex items-center justify-center text-slate-300 dark:text-slate-600 text-sm">No data yet</div>
                            }
                        </div>

                        {/* Donut — File Status */}
                        <div className="slide-up slide-up-6 rounded-2xl bg-white dark:bg-slate-800/70 border border-slate-100 dark:border-slate-700/60 shadow-sm p-6 flex flex-col">
                            <h2 className="text-sm font-semibold text-slate-700 dark:text-white mb-1">File Status</h2>
                            <p className="text-xs text-slate-400 dark:text-slate-500 mb-6">Distribution breakdown</p>

                            <div className="flex items-center justify-center gap-8 flex-1">
                                {/* Donut */}
                                <svg width="88" height="88" viewBox="0 0 88 88" className="flex-shrink-0 -rotate-90">
                                    {donutSegments.map((seg, i) => (
                                        <circle
                                            key={i}
                                            cx={CX} cy={CY} r={R}
                                            fill="none"
                                            stroke={seg.color}
                                            strokeWidth={strokeWidth}
                                            strokeDasharray={`${seg.dashLen} ${circumference - seg.dashLen}`}
                                            strokeDashoffset={-seg.offset + circumference * cumulative}
                                            style={{ strokeDashoffset: seg.offset }}
                                            strokeLinecap="round"
                                        />
                                    ))}
                                    {/* Center hole bg */}
                                    <circle cx={CX} cy={CY} r={R - strokeWidth / 2} fill="currentColor" className="text-white dark:text-slate-800" />
                                    {/* Center text */}
                                    <text x={CX} y={CY + 1} textAnchor="middle" dominantBaseline="middle"
                                        className="rotate-90"
                                        style={{ transform: `rotate(90deg) translate(0px, -${2 * CX}px)`, fontSize: '11px', fontWeight: 700 }}
                                        fill="currentColor">
                                    </text>
                                </svg>
                                {/* Legend */}
                                <div className="space-y-2.5">
                                    {statusData.map(seg => (
                                        <div key={seg.label} className="flex items-center gap-2">
                                            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: seg.color }} />
                                            <span className="text-xs text-slate-500 dark:text-slate-400 w-16">{seg.label}</span>
                                            <span className="mono text-xs font-semibold text-slate-700 dark:text-slate-200">{seg.count}</span>
                                            <span className="text-xs text-slate-300 dark:text-slate-600">
                                                {totalStatus > 0 ? Math.round((seg.count / totalStatus) * 100) : 0}%
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Bottom Row ── */}
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

                        {/* Recent Files Table */}
                        <div className="slide-up slide-up-7 lg:col-span-3 rounded-2xl bg-white dark:bg-slate-800/70 border border-slate-100 dark:border-slate-700/60 shadow-sm overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                                <div>
                                    <h2 className="text-sm font-semibold text-slate-700 dark:text-white">Recent Uploads</h2>
                                    <p className="text-xs text-slate-400 dark:text-slate-500">Latest 7 files</p>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-100 dark:border-slate-700/50">
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">File</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider hidden sm:table-cell">Owner</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Status</th>
                                            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider hidden md:table-cell">Size</th>
                                            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider hidden lg:table-cell">Uploaded</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 dark:divide-slate-700/40">
                                        {recentFiles.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-10 text-center text-slate-300 dark:text-slate-600 text-sm">
                                                    No files uploaded yet
                                                </td>
                                            </tr>
                                        ) : recentFiles.map(file => (
                                            <tr key={file.id}
                                                className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors duration-150 group">
                                                <td className="px-6 py-3.5">
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0 text-blue-500 dark:text-blue-400">
                                                            <Icons.File />
                                                        </div>
                                                        <span className="font-medium text-slate-700 dark:text-slate-200 truncate max-w-[140px] text-xs">
                                                            {file.name}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3.5 hidden sm:table-cell">
                                                    <span className="text-xs text-slate-500 dark:text-slate-400">{file.user}</span>
                                                </td>
                                                <td className="px-4 py-3.5">
                                                    <StatusBadge status={file.status} />
                                                </td>
                                                <td className="px-4 py-3.5 text-right hidden md:table-cell">
                                                    <span className="mono text-xs text-slate-400 dark:text-slate-500">{formatBytes(file.size)}</span>
                                                </td>
                                                <td className="px-4 py-3.5 text-right hidden lg:table-cell">
                                                    <span className="text-xs text-slate-400 dark:text-slate-500">{file.created_at}</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Top Viewed Files */}
                        <div className="slide-up slide-up-8 lg:col-span-2 rounded-2xl bg-white dark:bg-slate-800/70 border border-slate-100 dark:border-slate-700/60 shadow-sm p-6">
                            <h2 className="text-sm font-semibold text-slate-700 dark:text-white mb-1">Top Files</h2>
                            <p className="text-xs text-slate-400 dark:text-slate-500 mb-5">By views &amp; downloads</p>

                            <div className="space-y-4">
                                {topViewed.length === 0 ? (
                                    <p className="text-slate-300 dark:text-slate-600 text-sm text-center py-8">No data yet</p>
                                ) : topViewed.map((file, i) => (
                                    <div key={i} className="space-y-1.5">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-xs font-medium text-slate-600 dark:text-slate-300 truncate flex-1 min-w-0">
                                                <span className="mono text-slate-300 dark:text-slate-600 mr-1.5">#{i + 1}</span>
                                                {file.name}
                                            </span>
                                            <div className="flex items-center gap-2 flex-shrink-0 text-[10px] text-slate-400 dark:text-slate-500">
                                                <span className="flex items-center gap-0.5">
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                    </svg>
                                                    {formatNumber(file.views)}
                                                </span>
                                                <span className="flex items-center gap-0.5">
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                    </svg>
                                                    {formatNumber(file.downloads)}
                                                </span>
                                            </div>
                                        </div>
                                        {/* Views bar */}
                                        <div className="h-1 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-cyan-400 dark:bg-cyan-500 rounded-full transition-all duration-700"
                                                style={{ width: `${(file.views / maxView) * 100}%` }}
                                            />
                                        </div>
                                        {/* Downloads bar */}
                                        <div className="h-1 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-teal-400 dark:bg-teal-500 rounded-full transition-all duration-700"
                                                style={{ width: `${(file.downloads / maxDown) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Legend */}
                            <div className="flex items-center gap-4 mt-6 pt-4 border-t border-slate-100 dark:border-slate-700/50">
                                <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
                                    <span className="w-3 h-1 rounded-full bg-cyan-400" />
                                    Views
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
                                    <span className="w-3 h-1 rounded-full bg-teal-400" />
                                    Downloads
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </AuthenticatedLayout>
    );
}
