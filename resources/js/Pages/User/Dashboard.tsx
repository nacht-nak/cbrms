import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Breadcrumbs from '@/types/breadcrumbs';
import { PageProps } from '@/types';
import { Head, usePage } from '@inertiajs/react';
import { useState, useEffect } from 'react';

const breadcrumbs: Breadcrumbs = [
    { title: 'Home', href: route('user.dashboard') },
    { title: 'Dashboard' },
];

// ── Icons (inline SVG) ──────────────────────────────────────────────────────
const Icon = {
    Files: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
        </svg>
    ),
    Eye: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
        </svg>
    ),
    Download: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
        </svg>
    ),
    Folder: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
        </svg>
    ),
    Activity: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
    ),
    Archive: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
            <polyline points="21 8 21 21 3 21 3 8" /><rect x="1" y="3" width="22" height="5" />
            <line x1="10" y1="12" x2="14" y2="12" />
        </svg>
    ),
    TrendUp: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" />
        </svg>
    ),
    Clock: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
        </svg>
    ),
    Star: () => (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
    ),
};

// ── Sparkline mini chart ─────────────────────────────────────────────────────
function Sparkline({ data, color }: { data: number[]; color: string }) {
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    const w = 80, h = 32;
    const points = data
        .map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`)
        .join(' ');
    return (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="opacity-80">
            <polyline fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={points} />
        </svg>
    );
}

// ── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: IconComp, color, sparkData, change }: {
    label: string; value: string | number; icon: React.FC;
    color: string; sparkData: number[]; change: string;
}) {
    return (
        <div className="relative overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-gray-800/60 backdrop-blur-sm p-5 flex flex-col gap-3 shadow-sm hover:shadow-md transition-all duration-300 group">
            {/* Glow blob */}
            <div className={`absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-10 group-hover:opacity-20 transition-opacity duration-300 blur-2xl`} style={{ background: color }} />
            <div className="flex items-center justify-between">
                <div className={`p-2 rounded-xl`} style={{ background: `${color}1a` }}>
                    <span style={{ color }}><IconComp /></span>
                </div>
                <span className="text-xs font-medium text-emerald-500 dark:text-emerald-400 flex items-center gap-1">
                    <Icon.TrendUp /> {change}
                </span>
            </div>
            <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">{value}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-medium uppercase tracking-wide">{label}</p>
            </div>
            <Sparkline data={sparkData} color={color} />
        </div>
    );
}

// ── Recent File Row ───────────────────────────────────────────────────────────
function FileRow({ name, type, date, status, views, downloads }: {
    name: string; type: string; date: string;
    status: 'active' | 'inactive' | 'archived'; views: number; downloads: number;
}) {
    const statusStyles = {
        active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
        inactive: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
        archived: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
    };
    const ext = name.split('.').pop()?.toUpperCase() ?? 'FILE';
    const extColors: Record<string, string> = {
        PDF: '#ef4444', DOCX: '#3b82f6', XLSX: '#22c55e', PPTX: '#f97316', PNG: '#a855f7', JPG: '#ec4899',
    };
    const extColor = extColors[ext] ?? '#6b7280';
    return (
        <div className="flex items-center gap-3 py-3 px-1 hover:bg-gray-50 dark:hover:bg-gray-700/30 rounded-xl transition-colors group cursor-pointer">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: extColor }}>
                {type === 'folder' ? <Icon.Folder /> : ext.slice(0, 3)}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{name}</p>
                <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5"><Icon.Clock />{date}</p>
            </div>
            <div className="hidden sm:flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500">
                <span className="flex items-center gap-1"><Icon.Eye />{views}</span>
                <span className="flex items-center gap-1"><Icon.Download />{downloads}</span>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusStyles[status]}`}>{status}</span>
        </div>
    );
}

// ── Activity Item ─────────────────────────────────────────────────────────────
function ActivityItem({ action, file, time, color }: { action: string; file: string; time: string; color: string }) {
    return (
        <div className="flex items-start gap-3 py-2.5">
            <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: color }} />
            <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-medium">{action}</span>{' '}
                    <span className="text-gray-500 dark:text-gray-400 truncate">{file}</span>
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{time}</p>
            </div>
        </div>
    );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard({ stats, recentFiles, activities }: {
    stats?: { totalFiles: number; totalViews: number; totalDownloads: number; totalFolders: number };
    recentFiles?: any[];
    activities?: any[];
}) {
    const { auth } = usePage<PageProps>().props;
    const [greeting, setGreeting] = useState('');

    useEffect(() => {
        const h = new Date().getHours();
        setGreeting(h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening');
    }, []);

    // ── Demo data (replace with real props) ──────────────────────────────────
    const demoStats = stats ?? { totalFiles: 142, totalViews: 3_840, totalDownloads: 921, totalFolders: 18 };
    const demoFiles = recentFiles ?? [
        { name: 'Annual_Report_2024.pdf', type: 'file', date: '2 hours ago', status: 'active', views: 84, downloads: 22 },
        { name: 'Project_Assets', type: 'folder', date: '5 hours ago', status: 'active', views: 12, downloads: 0 },
        { name: 'Budget_Q1.xlsx', type: 'file', date: 'Yesterday', status: 'active', views: 56, downloads: 10 },
        { name: 'Design_Mockup_v3.png', type: 'file', date: '2 days ago', status: 'inactive', views: 30, downloads: 5 },
        { name: 'Legacy_Docs.docx', type: 'file', date: '1 week ago', status: 'archived', views: 200, downloads: 48 },
    ];
    const demoActivities = activities ?? [
        { action: 'Uploaded', file: 'Annual_Report_2024.pdf', time: '2 hours ago', color: '#3b82f6' },
        { action: 'Downloaded', file: 'Budget_Q1.xlsx', time: '5 hours ago', color: '#22c55e' },
        { action: 'Viewed', file: 'Design_Mockup_v3.png', time: 'Yesterday', color: '#a855f7' },
        { action: 'Archived', file: 'Legacy_Docs.docx', time: '1 week ago', color: '#f59e0b' },
        { action: 'Created folder', file: 'Project_Assets', time: '1 week ago', color: '#6b7280' },
    ];

    const statCards = [
        { label: 'Total Files', value: demoStats.totalFiles, icon: Icon.Files, color: '#3b82f6', change: '+12%', sparkData: [20, 35, 28, 45, 38, 52, 48, 60, 55, 70, 65, 80] },
        { label: 'Total Views', value: demoStats.totalViews.toLocaleString(), icon: Icon.Eye, color: '#a855f7', change: '+8%', sparkData: [120, 200, 180, 320, 280, 400, 360, 480, 420, 560, 500, 620] },
        { label: 'Downloads', value: demoStats.totalDownloads.toLocaleString(), icon: Icon.Download, color: '#22c55e', change: '+5%', sparkData: [30, 50, 45, 70, 60, 85, 75, 100, 90, 110, 105, 130] },
        { label: 'Folders', value: demoStats.totalFolders, icon: Icon.Folder, color: '#f59e0b', change: '+2%', sparkData: [5, 6, 6, 8, 8, 10, 11, 12, 14, 15, 17, 18] },
    ];

    const username = auth?.user?.username ?? 'User';

    return (
        <AuthenticatedLayout
            breadcrumbs={breadcrumbs}
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">
                    Dashboard
                </h2>
            }
        >
            <Head title="Dashboard" />

            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">

                    {/* ── Welcome Banner ───────────────────────────────────── */}
                    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 p-6 sm:p-8 text-white shadow-xl">
                        {/* Decorative blobs */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl" />
                        <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-900/30 rounded-full translate-y-1/2 -translate-x-1/4 blur-2xl" />
                        {/* Grid pattern overlay */}
                        <div className="absolute inset-0 opacity-5" style={{
                            backgroundImage: 'linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)',
                            backgroundSize: '24px 24px'
                        }} />
                        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div>
                                <p className="text-blue-100 text-sm font-medium mb-1">{greeting},</p>
                                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{username} 👋</h1>
                                <p className="text-blue-100/80 text-sm mt-2">Here's what's happening with your files today.</p>
                            </div>
                            <div className="flex gap-3">
                                <a
                                    href={route('user.file-manager')}
                                    className="px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white text-sm font-medium rounded-xl border border-white/30 transition-all duration-200"
                                >
                                    My Files
                                </a>
                            </div>
                        </div>
                    </div>

                    {/* ── Stat Cards ───────────────────────────────────────── */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {statCards.map((card) => (
                            <StatCard key={card.label} {...card} />
                        ))}
                    </div>

                    {/* ── Main Grid ────────────────────────────────────────── */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                        {/* Recent Files — 2/3 width */}
                        <div className="lg:col-span-2 rounded-2xl border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-gray-800/60 backdrop-blur-sm shadow-sm p-5">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <span className="text-blue-500"><Icon.Files /></span>
                                    <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Recent Files</h3>
                                </div>
                                <a href={route('user.file-manager')} className="text-xs text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors">
                                    View all →
                                </a>
                            </div>
                            <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                                {demoFiles.map((f, i) => (
                                    <FileRow key={i} {...f} />
                                ))}
                            </div>
                        </div>

                        {/* Activity Feed — 1/3 width */}
                        <div className="rounded-2xl border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-gray-800/60 backdrop-blur-sm shadow-sm p-5">
                            <div className="flex items-center gap-2 mb-4">
                                <span className="text-purple-500"><Icon.Activity /></span>
                                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Recent Activity</h3>
                            </div>
                            <div className="relative pl-4 border-l-2 border-gray-100 dark:border-gray-700">
                                {demoActivities.map((a, i) => (
                                    <ActivityItem key={i} {...a} />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* ── Storage Overview ─────────────────────────────────── */}
                    <div className="rounded-2xl border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-gray-800/60 backdrop-blur-sm shadow-sm p-5">
                        <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-2">
                                <span className="text-amber-500"><Icon.Archive /></span>
                                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">File Status Overview</h3>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            {[
                                { label: 'Active', value: 98, total: 142, color: '#22c55e' },
                                { label: 'Inactive', value: 32, total: 142, color: '#6b7280' },
                                { label: 'Archived', value: 12, total: 142, color: '#f59e0b' },
                            ].map((item) => {
                                const pct = Math.round((item.value / item.total) * 100);
                                return (
                                    <div key={item.label} className="space-y-2">
                                        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                                            <span className="font-medium">{item.label}</span>
                                            <span>{item.value} files</span>
                                        </div>
                                        <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full transition-all duration-700"
                                                style={{ width: `${pct}%`, background: item.color }}
                                            />
                                        </div>
                                        <p className="text-xs text-gray-400">{pct}% of total</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                </div>
            </div>
        </AuthenticatedLayout>
    );
}
