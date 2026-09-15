import { useState, useMemo } from "react";
import { PageProps, FileDetails } from "@/types";
import { Head } from "@inertiajs/react";
import Authenticated from "@/Layouts/AuthenticatedLayout";
import Breadcrumbs from "@/types/breadcrumbs";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReportProps extends PageProps {
    files: FileDetails[];
    summary: {
        total_files: number;
        total_views: number;
        total_downloads: number;
        total_size: number;
        active_files: number;
        inactive_files: number;
        archived_files: number;
        top_viewed: FileDetails | null;
        top_downloaded: FileDetails | null;
    };
    monthly_stats: {
        month: string;
        views: number;
        downloads: number;
        uploads: number;
    }[];
}

// ─── Breadcrumbs ──────────────────────────────────────────────────────────────

const breadcrumbs: Breadcrumbs = [
    { title: "Dashboard", href: route("dashboard") },
    { title: "Report Analysis" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = {
    number: (n: number) => new Intl.NumberFormat().format(n),
    size: (bytes: number) => {
        if (bytes >= 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(2)} GB`;
        if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(2)} MB`;
        if (bytes >= 1_024) return `${(bytes / 1_024).toFixed(2)} KB`;
        return `${bytes} B`;
    },
    date: (d?: string) =>
        d ? new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—",
    pct: (val: number, total: number) => (total === 0 ? 0 : Math.round((val / total) * 100)),
};

function generateCSV(files: FileDetails[]): string {
    const headers = ["File Name", "Status", "Size", "Views", "Downloads", "Authors", "Publication Date", "Description"];
    const rows = files.map((f) => [
        `"${f.fileName}"`,
        f.status,
        fmt.size(f.size),
        f.views,
        f.downloads,
        `"${f.authors ?? ""}"`,
        f.publication_date ?? "",
        `"${(f.description ?? "").replace(/"/g, "'")}"`,
    ]);
    return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

function downloadBlob(content: string, filename: string, mime: string) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
}

// ─── Print Styles ─────────────────────────────────────────────────────────────

const PRINT_CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:'DM Sans',sans-serif;padding:32px 40px;color:#0f172a;background:#fff;font-size:13px;}

/* ── Header ── */
.ph{margin-bottom:20px;}
.ph-logos{display:flex;align-items:center;justify-content:center;gap:20px;margin-bottom:14px;}
.ph-text{text-align:center;flex:1;}
.ph-republic{font-size:10px;color:#64748b;letter-spacing:.5px;}
.ph-univ{font-size:19px;font-weight:800;color:#1e3a5f;letter-spacing:-.3px;margin-top:2px;line-height:1.2;}
.ph-campus{font-size:13px;font-weight:600;color:#1e3a5f;}
.ph-addr{font-size:10px;color:#64748b;margin-top:1px;}
.ph-sys{font-size:11px;font-weight:700;color:#c8a84b;margin-top:5px;letter-spacing:1px;text-transform:uppercase;}
.ph-rtitle{font-size:14px;font-weight:700;color:#0f172a;margin-top:3px;letter-spacing:2.5px;text-transform:uppercase;}
.ph-divider{height:3px;background:linear-gradient(to right,#1e3a5f,#c8a84b,#1e3a5f);border-radius:2px;margin:12px 0;}

/* ── Meta ── */
.ph-meta{display:flex;gap:28px;flex-wrap:wrap;padding:9px 14px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;}
.pm-item{display:flex;flex-direction:column;gap:1px;}
.pm-label{font-size:9px;text-transform:uppercase;letter-spacing:.8px;color:#94a3b8;font-weight:600;}
.pm-val{font-size:12px;font-weight:600;color:#0f172a;font-family:'DM Mono',monospace;}

/* ── Stats ── */
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:18px 0;}
.stat{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:11px 13px;}
.sv{font-family:'DM Mono',monospace;font-size:17px;font-weight:700;color:#0f172a;}
.sl{font-size:9px;color:#64748b;margin-top:2px;text-transform:uppercase;letter-spacing:.5px;}
.at{border-top:3px solid #0d9488;} .ai{border-top:3px solid #6366f1;}
.aa{border-top:3px solid #f59e0b;} .ap{border-top:3px solid #ec4899;}

/* ── Table ── */
.stitle{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#475569;margin:18px 0 7px;padding-bottom:5px;border-bottom:1px solid #e2e8f0;}
table{width:100%;border-collapse:collapse;}
th{background:#1e3a5f;color:#fff;font-size:9.5px;text-transform:uppercase;letter-spacing:.5px;padding:8px 11px;text-align:left;}
td{padding:8px 11px;font-size:11px;border-bottom:1px solid #f1f5f9;color:#334155;}
td.m{font-family:'DM Mono',monospace;}
tr:nth-child(even) td{background:#f8fafc;}
.badge{padding:2px 7px;border-radius:999px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;}
.ba{background:#d1fae5;color:#065f46;}
.bi{background:#fef3c7;color:#92400e;}
.br{background:#f1f5f9;color:#475569;}

/* ── Footer ── */
.pf{margin-top:28px;padding-top:12px;border-top:2px solid #1e3a5f;display:flex;justify-content:space-between;align-items:flex-end;}
.pf-left{font-size:9.5px;color:#64748b;line-height:1.6;}
.pf-right{text-align:right;}
.sig-line{width:150px;border-bottom:1px solid #0f172a;margin-bottom:3px;margin-left:auto;}
.sig-lbl{font-size:9px;color:#64748b;}
@media print{body{padding:18px 26px;}}
`;

// ─── Build Print HTML ─────────────────────────────────────────────────────────

function buildPrint(files: FileDetails[], dateFrom: string, dateTo: string, fs: ReturnType<typeof calcSummary>) {
    const period = dateFrom
        ? `${fmt.date(dateFrom)}${dateTo ? " — " + fmt.date(dateTo) : " onwards"}`
        : "All time";

    const rows = files.map(f => `
        <tr>
            <td>${f.fileName}</td>
            <td><span class="badge ${f.status === "active" ? "ba" : f.status === "inactive" ? "bi" : "br"}">${f.status}</span></td>
            <td class="m">${fmt.size(f.size)}</td>
            <td class="m">${fmt.number(f.views)}</td>
            <td class="m">${fmt.number(f.downloads)}</td>
            <td>${f.authors ?? "—"}</td>
            <td class="m">${fmt.date(f.publication_date)}</td>
        </tr>`).join("");

    return `<!DOCTYPE html><html><head>
    <meta charset="UTF-8">
    <title>CBRMS Report Analysis</title>
    <style>${PRINT_CSS}</style>
    </head><body>

    <!-- HEADER -->
    <div class="ph">
        <div class="ph-logos">
            <!-- CPSU Logo -->
            <img src="/cpsu.png" alt="CPSU Logo" width="80" height="80" style="object-fit:contain;"/>

            <div class="ph-text">
                <div class="ph-republic">Republic of the Philippines</div>
                <div class="ph-univ">Central Philippine State University</div>
                <div class="ph-campus">Hinoba-an Campus</div>
                <div class="ph-addr">Hinoba-an, Negros Occidental, Philippines</div>
                <div class="ph-sys">Cloud Based Records Management System</div>
                <div class="ph-rtitle">Report Analysis</div>
            </div>

            <!-- CBRMS Logo -->
            <img src="/logo.jpeg" alt="CBRMS Logo" width="80" height="80" style="object-fit:contain;"/>
        </div>

        <div class="ph-divider"></div>

        <div class="ph-meta">
            <div class="pm-item"><div class="pm-label">Date Generated</div><div class="pm-val">${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</div></div>
            <div class="pm-item"><div class="pm-label">Period Covered</div><div class="pm-val">${period}</div></div>
            <div class="pm-item"><div class="pm-label">Total Records</div><div class="pm-val">${files.length}</div></div>
            <div class="pm-item"><div class="pm-label">Active / Inactive / Archived</div><div class="pm-val">${fs.active_files} / ${fs.inactive_files} / ${fs.archived_files}</div></div>
        </div>
    </div>

    <!-- SUMMARY CARDS -->
    <div class="stats">
        <div class="stat ai"><div class="sv">${fmt.number(fs.total_views)}</div><div class="sl">Total Views</div></div>
        <div class="stat aa"><div class="sv">${fmt.number(fs.total_downloads)}</div><div class="sl">Total Downloads</div></div>
        <div class="stat ap"><div class="sv">${fmt.size(fs.total_size)}</div><div class="sl">Storage Used</div></div>
        <div class="stat at"><div class="sv">${fmt.number(fs.active_files)}</div><div class="sl">Active Files</div></div>
    </div>

    <!-- TABLE -->
    <div class="stitle">File Records</div>
    <table>
        <thead>
            <tr><th>File Name</th><th>Status</th><th>Size</th><th>Views</th><th>Downloads</th><th>Authors</th><th>Published</th></tr>
        </thead>
        <tbody>${rows}</tbody>
    </table>

    <!-- FOOTER -->
    <div class="pf">
        <div class="pf-left">
            <div><strong>CBRMS</strong> · Central Philippine State University — Hinoba-an Campus</div>
            <div>This report is system-generated and is considered an official document.</div>
            <div>Printed on: ${new Date().toLocaleString("en-US")}</div>
        </div>
        <div class="pf-right">
            <div class="sig-line"></div>
            <div class="sig-lbl">Authorized Signature / Admin Officer</div>
        </div>
    </div>

    </body></html>`;
}

// ─── calcSummary helper ───────────────────────────────────────────────────────

function calcSummary(files: FileDetails[]) {
    return {
        total_views: files.reduce((s, f) => s + f.views, 0),
        total_downloads: files.reduce((s, f) => s + f.downloads, 0),
        total_size: files.reduce((s, f) => s + f.size, 0),
        active_files: files.filter(f => f.status === "active").length,
        inactive_files: files.filter(f => f.status === "inactive").length,
        archived_files: files.filter(f => f.status === "archived").length,
    };
}

// ─── Sparkline ────────────────────────────────────────────────────────────────

function Sparkline({ data, color }: { data: number[]; color: string }) {
    if (!data.length) return null;
    const max = Math.max(...data, 1), min = Math.min(...data);
    const w = 120, h = 40, pad = 4;
    const pts = data.map((v, i) => {
        const x = pad + (i / (data.length - 1 || 1)) * (w - pad * 2);
        const y = pad + ((max - v) / (max - min || 1)) * (h - pad * 2);
        return `${x},${y}`;
    });
    return (
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-10" preserveAspectRatio="none">
            <polygon points={[`${pad},${h}`, ...pts, `${w - pad},${h}`].join(" ")} fill={color} fillOpacity="0.15" />
            <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

// ─── MiniBar ──────────────────────────────────────────────────────────────────

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
    return (
        <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-600 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${max === 0 ? 0 : (value / max) * 100}%`, backgroundColor: color }} />
        </div>
    );
}

// ─── StatusBadge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: FileDetails["status"] }) {
    const cfg = {
        active: { label: "Active", cls: "bg-emerald-500/15 text-emerald-500 ring-emerald-500/30" },
        inactive: { label: "Inactive", cls: "bg-amber-500/15 text-amber-500 ring-amber-500/30" },
        archived: { label: "Archived", cls: "bg-slate-500/15 text-slate-500 ring-slate-500/30" },
    }[status];
    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${cfg.cls}`}>
            <span className="size-1.5 rounded-full bg-current" />{cfg.label}
        </span>
    );
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon, sparkData, color }: {
    label: string; value: string; sub?: string;
    icon: React.ReactNode; sparkData?: number[]; color: string;
}) {
    return (
        <div className="group relative overflow-hidden rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-5 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
            style={{ borderTop: `3px solid ${color}` }}>
            <div className="flex items-start justify-between mb-3">
                <div className="flex size-10 items-center justify-center rounded-xl text-white shadow-sm" style={{ backgroundColor: color }}>
                    {icon}
                </div>
                {sparkData && (
                    <div className="w-24 opacity-50 group-hover:opacity-100 transition-opacity">
                        <Sparkline data={sparkData} color={color} />
                    </div>
                )}
            </div>
            <p className="font-mono text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{value}</p>
            <p className="mt-0.5 text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
            {sub && <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{sub}</p>}
        </div>
    );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

const Icon = {
    Files: () => <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>,
    Eye: () => <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>,
    Download: () => <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>,
    Storage: () => <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" /></svg>,
    CSV: () => <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
    PDF: () => <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>,
    Search: () => <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>,
    Filter: () => <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>,
    Calendar: () => <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
    Trophy: () => <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>,
    X: () => <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>,
    Up: () => <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>,
    Down: () => <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>,
};

// ─── DonutChart ───────────────────────────────────────────────────────────────

function DonutChart({ active, inactive, archived }: { active: number; inactive: number; archived: number }) {
    const total = active + inactive + archived;
    if (total === 0) return <div className="flex items-center justify-center h-32 text-slate-400 text-sm">No data</div>;

    const segs = [
        { val: active, color: "#10b981", label: "Active" },
        { val: inactive, color: "#f59e0b", label: "Inactive" },
        { val: archived, color: "#64748b", label: "Archived" },
    ];
    let cum = 0;
    const r = 40, cx = 60, cy = 60, sw = 14, circ = 2 * Math.PI * r;
    const arcs = segs.map(s => {
        const pct = s.val / total;
        const arc = { ...s, dash: pct * circ, offset: circ - cum * circ };
        cum += pct;
        return arc;
    });

    return (
        <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative shrink-0">
                <svg width="120" height="120" viewBox="0 0 120 120">
                    <circle cx={cx} cy={cy} r={r} fill="none" stroke="currentColor" strokeWidth={sw} className="text-slate-100 dark:text-slate-700" />
                    {arcs.map((a, i) => (
                        <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={a.color} strokeWidth={sw}
                            strokeDasharray={`${a.dash} ${circ - a.dash}`} strokeDashoffset={a.offset} strokeLinecap="round"
                            style={{ transform: "rotate(-90deg)", transformOrigin: "60px 60px", transition: "stroke-dasharray .8s ease" }} />
                    ))}
                    <text x={cx} y={cy - 4} textAnchor="middle" fontSize="16" fontWeight="bold" fontFamily="DM Mono,monospace" className="fill-slate-900 dark:fill-white">{total}</text>
                    <text x={cx} y={cy + 12} textAnchor="middle" fontSize="9" fontFamily="DM Sans,sans-serif" className="fill-slate-400">files</text>
                </svg>
            </div>
            <div className="flex flex-col gap-2.5 w-full">
                {segs.map(s => (
                    <div key={s.label} className="flex items-center gap-2">
                        <span className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                        <span className="text-sm text-slate-600 dark:text-slate-400 flex-1">{s.label}</span>
                        <span className="font-mono text-sm font-semibold text-slate-900 dark:text-white">{fmt.number(s.val)}</span>
                        <span className="text-xs text-slate-400 w-8 text-right">{fmt.pct(s.val, total)}%</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── MonthlyChart ─────────────────────────────────────────────────────────────

function MonthlyChart({ data }: { data: ReportProps["monthly_stats"] }) {
    const [hover, setHover] = useState<number | null>(null);
    if (!data.length) return <div className="flex items-center justify-center h-32 text-slate-400 text-sm">No data</div>;
    const maxVal = Math.max(...data.map(d => Math.max(d.views, d.downloads)), 1);

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-teal-500" /> Views</span>
                <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-indigo-500" /> Downloads</span>
            </div>
            <div className="flex items-end gap-1 h-36 overflow-x-auto pb-1">
                {data.map((d, i) => (
                    <div key={d.month}
                        className="relative flex-1 min-w-[32px] flex flex-col items-center gap-0.5 cursor-pointer group"
                        onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
                        {hover === i && (
                            <div className="absolute bottom-full mb-2 z-20 bg-slate-900 dark:bg-slate-700 text-white text-xs rounded-xl px-3 py-2 shadow-xl pointer-events-none whitespace-nowrap left-1/2 -translate-x-1/2">
                                <div className="font-semibold border-b border-white/10 pb-1 mb-1">{d.month}</div>
                                <div className="text-teal-400">Views: {fmt.number(d.views)}</div>
                                <div className="text-indigo-400">Downloads: {fmt.number(d.downloads)}</div>
                                <div className="text-slate-400 text-[10px] mt-0.5">Uploads: {d.uploads}</div>
                            </div>
                        )}
                        <div className="w-full flex items-end gap-0.5 h-28">
                            <div className="flex-1 rounded-t-md bg-teal-500/70 group-hover:bg-teal-500 transition-all duration-300"
                                style={{ height: `${(d.views / maxVal) * 100}%`, minHeight: "2px" }} />
                            <div className="flex-1 rounded-t-md bg-indigo-500/70 group-hover:bg-indigo-500 transition-all duration-300"
                                style={{ height: `${(d.downloads / maxVal) * 100}%`, minHeight: "2px" }} />
                        </div>
                        <span className="text-[9px] text-slate-400 truncate w-full text-center">{d.month.slice(0, 3)}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── DateRangePicker ──────────────────────────────────────────────────────────

function DateRangePicker({ dateFrom, dateTo, onChange, onClear }: {
    dateFrom: string; dateTo: string;
    onChange: (from: string, to: string) => void;
    onClear: () => void;
}) {
    const hasRange = dateFrom || dateTo;
    return (
        <div className="flex flex-wrap items-center gap-3 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 font-medium text-sm">
                <Icon.Calendar />
                Date Range
            </div>

            <div className="flex flex-wrap items-center gap-2 flex-1">
                <div className="flex items-center gap-1.5">
                    <label className="text-xs text-slate-400 whitespace-nowrap">From</label>
                    <input type="date" value={dateFrom} max={dateTo || undefined}
                        onChange={e => onChange(e.target.value, dateTo)}
                        className="rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/60 px-3 py-1.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500 transition" />
                </div>
                <span className="text-slate-300 dark:text-slate-600 font-medium">—</span>
                <div className="flex items-center gap-1.5">
                    <label className="text-xs text-slate-400 whitespace-nowrap">To</label>
                    <input type="date" value={dateTo} min={dateFrom || undefined}
                        onChange={e => onChange(dateFrom, e.target.value)}
                        className="rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/60 px-3 py-1.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500 transition" />
                </div>
            </div>

            <div className="flex items-center gap-2 ml-auto">
                {hasRange && (
                    <>
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20 px-2.5 py-1 rounded-full">
                            <span className="size-1.5 rounded-full bg-teal-500 animate-pulse" />
                            Filtered
                        </span>
                        <button onClick={onClear}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition">
                            <Icon.X /> Clear
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Report({ files = [], summary, monthly_stats = [] }: ReportProps) {
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState<"all" | FileDetails["status"]>("all");
    const [sortKey, setSortKey] = useState<"fileName" | "views" | "downloads" | "size" | "publication_date">("views");
    const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
    const [page, setPage] = useState(1);
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const perPage = 10;

    const filtered = useMemo(() => {
        const from = dateFrom ? new Date(dateFrom) : null;
        const to = dateTo ? new Date(dateTo + "T23:59:59") : null;

        return files
            .filter(f => {
                if (status !== "all" && f.status !== status) return false;
                if (search && !f.fileName.toLowerCase().includes(search.toLowerCase()) &&
                    !(f.authors ?? "").toLowerCase().includes(search.toLowerCase())) return false;
                if (f.publication_date) {
                    const fd = new Date(f.publication_date);
                    if (from && fd < from) return false;
                    if (to && fd > to) return false;
                }
                return true;
            })
            .sort((a, b) => {
                const va = a[sortKey] ?? 0, vb = b[sortKey] ?? 0;
                if (typeof va === "string" && typeof vb === "string")
                    return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
                return sortDir === "asc" ? (va as number) - (vb as number) : (vb as number) - (va as number);
            });
    }, [files, search, status, sortKey, sortDir, dateFrom, dateTo]);

    const fs = useMemo(() => calcSummary(filtered), [filtered]);
    const totalPages = Math.ceil(filtered.length / perPage);
    const paginated = filtered.slice((page - 1) * perPage, page * perPage);
    const maxViews = Math.max(...files.map(f => f.views), 1);
    const maxDl = Math.max(...files.map(f => f.downloads), 1);

    const handleSort = (key: typeof sortKey) => {
        setSortDir(key === sortKey ? d => d === "asc" ? "desc" : "asc" : "desc");
        setSortKey(key);
        setPage(1);
    };

    const handleCSV = () => downloadBlob(generateCSV(filtered), `cbrms_report_${new Date().toISOString().split("T")[0]}.csv`, "text/csv");
    const handlePDF = () => {
        const w = window.open("", "_blank")!;
        w.document.write(buildPrint(filtered, dateFrom, dateTo, fs));
        w.document.close();
        setTimeout(() => w.print(), 700);
    };

    const SortIcon = ({ k }: { k: typeof sortKey }) =>
        sortKey === k
            ? (sortDir === "asc" ? <Icon.Up /> : <Icon.Down />)
            : <svg className="size-3.5 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>;

    return (
        <>
            <Head title="Report Analysis" />
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300..700&family=DM+Mono:wght@400;500&display=swap');
                .rpt, .rpt * { font-family: 'DM Sans', sans-serif; }
                .mono { font-family: 'DM Mono', monospace !important; }
                .hrow:hover td { background: rgba(99,102,241,.04); }
                .dark .hrow:hover td { background: rgba(99,102,241,.07); }
                @keyframes fiu { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
                .fi{animation:fiu .45s ease forwards;}
                .fi1{animation-delay:.04s;opacity:0}.fi2{animation-delay:.09s;opacity:0}
                .fi3{animation-delay:.14s;opacity:0}.fi4{animation-delay:.19s;opacity:0}
                .fi5{animation-delay:.24s;opacity:0}.fi6{animation-delay:.29s;opacity:0}
                input[type=date]::-webkit-calendar-picker-indicator{filter:invert(.5);cursor:pointer}
                .dark input[type=date]::-webkit-calendar-picker-indicator{filter:invert(.8)}
            `}</style>

            <Authenticated breadcrumbs={breadcrumbs}>
                <div className="rpt min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-5">

                        {/* ── Header ── */}
                        <div className="fi fi1 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="size-2 rounded-full bg-teal-500 animate-pulse" />
                                    <span className="text-xs font-bold uppercase tracking-widest text-teal-600 dark:text-teal-400">CBRMS · Admin</span>
                                </div>
                                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Report Analysis</h1>
                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                    {fmt.date(new Date().toISOString())} · {fmt.number(files.length)} total files
                                    {(dateFrom || dateTo) && <span className="ml-2 text-teal-600 dark:text-teal-400 font-semibold">· {fmt.number(filtered.length)} in range</span>}
                                </p>
                            </div>
                            <div className="flex items-center gap-2.5 shrink-0">
                                <button onClick={handleCSV}
                                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-95">
                                    <Icon.CSV /> Export CSV
                                </button>
                                <button onClick={handlePDF}
                                    className="inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition-all active:scale-95"
                                    style={{ background: "linear-gradient(135deg,#1e3a5f,#2d5a9e)" }}>
                                    <Icon.PDF /> Print PDF
                                </button>
                            </div>
                        </div>

                        {/* ── Date Range ── */}
                        <div className="fi fi2">
                            <DateRangePicker
                                dateFrom={dateFrom} dateTo={dateTo}
                                onChange={(f, t) => { setDateFrom(f); setDateTo(t); setPage(1); }}
                                onClear={() => { setDateFrom(""); setDateTo(""); setPage(1); }}
                            />
                        </div>

                        {/* ── Stat Cards ── */}
                        <div className="fi fi3 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                            <StatCard label="Total Files" value={fmt.number(filtered.length)}
                                sub={`${fmt.number(fs.active_files)} active`}
                                icon={<Icon.Files />} sparkData={monthly_stats.map(d => d.uploads)} color="#0d9488" />
                            <StatCard label="Total Views" value={fmt.number(fs.total_views)}
                                sub={dateFrom || dateTo ? "In range" : "All time"}
                                icon={<Icon.Eye />} sparkData={monthly_stats.map(d => d.views)} color="#6366f1" />
                            <StatCard label="Total Downloads" value={fmt.number(fs.total_downloads)}
                                sub={dateFrom || dateTo ? "In range" : "All time"}
                                icon={<Icon.Download />} sparkData={monthly_stats.map(d => d.downloads)} color="#f59e0b" />
                            <StatCard label="Storage Used" value={fmt.size(fs.total_size)}
                                icon={<Icon.Storage />} color="#ec4899" />
                        </div>

                        {/* ── Charts ── */}
                        <div className="fi fi4 grid grid-cols-1 lg:grid-cols-3 gap-4">
                            <div className="rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-5">
                                <h3 className="text-sm font-semibold mb-4">Status Distribution</h3>
                                <DonutChart active={fs.active_files} inactive={fs.inactive_files} archived={fs.archived_files} />
                            </div>
                            <div className="lg:col-span-2 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-5">
                                <h3 className="text-sm font-semibold mb-4">Monthly Activity</h3>
                                <MonthlyChart data={monthly_stats} />
                            </div>
                        </div>

                        {/* ── Top Files ── */}
                        {(summary?.top_viewed || summary?.top_downloaded) && (
                            <div className="fi fi5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {summary.top_viewed && (
                                    <div className="relative overflow-hidden rounded-2xl border border-teal-200/60 dark:border-teal-800/40 bg-teal-50/50 dark:bg-teal-900/10 p-5">
                                        <div className="absolute top-4 right-4 opacity-10 scale-[2]"><Icon.Trophy /></div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="size-6 flex items-center justify-center rounded-full bg-teal-500 text-white shrink-0"><Icon.Eye /></span>
                                            <span className="text-xs font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wider">Most Viewed</span>
                                        </div>
                                        <p className="font-semibold truncate">{summary.top_viewed.fileName}</p>
                                        <p className="mono text-2xl font-bold text-teal-600 dark:text-teal-400 mt-1">{fmt.number(summary.top_viewed.views)}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">total views</p>
                                    </div>
                                )}
                                {summary.top_downloaded && (
                                    <div className="relative overflow-hidden rounded-2xl border border-indigo-200/60 dark:border-indigo-800/40 bg-indigo-50/50 dark:bg-indigo-900/10 p-5">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="size-6 flex items-center justify-center rounded-full bg-indigo-500 text-white shrink-0"><Icon.Download /></span>
                                            <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">Most Downloaded</span>
                                        </div>
                                        <p className="font-semibold truncate">{summary.top_downloaded.fileName}</p>
                                        <p className="mono text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">{fmt.number(summary.top_downloaded.downloads)}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">total downloads</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── Table ── */}
                        <div className="fi fi6 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 overflow-hidden">

                            {/* Toolbar */}
                            <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 border-b border-slate-100 dark:border-slate-700/50">
                                <div className="relative flex-1">
                                    <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 pointer-events-none"><Icon.Search /></span>
                                    <input type="text" value={search}
                                        onChange={e => { setSearch(e.target.value); setPage(1); }}
                                        placeholder="Search files or authors…"
                                        className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 pl-9 pr-4 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500 transition" />
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-slate-400"><Icon.Filter /></span>
                                    <div className="flex rounded-xl border border-slate-200 dark:border-slate-600 overflow-hidden text-sm">
                                        {(["all", "active", "inactive", "archived"] as const).map(s => (
                                            <button key={s} onClick={() => { setStatus(s); setPage(1); }}
                                                className={`px-3 py-1.5 capitalize transition-colors ${status === s
                                                    ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold"
                                                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50"}`}>
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Table Body */}
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/60 dark:bg-slate-800/40">
                                            {([
                                                { key: "fileName", label: "File Name" },
                                                { key: null, label: "Status" },
                                                { key: "size", label: "Size" },
                                                { key: "views", label: "Views" },
                                                { key: "downloads", label: "Downloads" },
                                                { key: "publication_date", label: "Published" },
                                            ] as const).map(col => (
                                                <th key={col.label}
                                                    className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 ${col.key ? "cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 select-none" : ""}`}
                                                    onClick={() => col.key && handleSort(col.key as typeof sortKey)}>
                                                    <div className="flex items-center gap-1.5">
                                                        {col.label}
                                                        {col.key && <SortIcon k={col.key as typeof sortKey} />}
                                                    </div>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40">
                                        {paginated.length === 0 ? (
                                            <tr><td colSpan={6} className="py-16 text-center text-slate-400 dark:text-slate-500">
                                                <svg className="size-10 mx-auto mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                                <p className="font-medium">No files found</p>
                                                <p className="text-xs mt-1">Try adjusting your search, filter, or date range</p>
                                            </td></tr>
                                        ) : paginated.map(f => (
                                            <tr key={f.id} className="hrow transition-colors">
                                                <td className="px-4 py-3.5 max-w-[220px]">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="size-8 rounded-lg bg-teal-500/10 flex items-center justify-center shrink-0">
                                                            <svg className="size-4 text-teal-600 dark:text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                            </svg>
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="font-medium truncate">{f.fileName}</p>
                                                            {f.authors && <p className="text-xs text-slate-400 truncate">{f.authors}</p>}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3.5"><StatusBadge status={f.status} /></td>
                                                <td className="px-4 py-3.5 mono text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">{fmt.size(f.size)}</td>
                                                <td className="px-4 py-3.5">
                                                    <div className="space-y-1 min-w-[80px]">
                                                        <span className="mono text-sm font-medium">{fmt.number(f.views)}</span>
                                                        <MiniBar value={f.views} max={maxViews} color="#6366f1" />
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3.5">
                                                    <div className="space-y-1 min-w-[80px]">
                                                        <span className="mono text-sm font-medium">{fmt.number(f.downloads)}</span>
                                                        <MiniBar value={f.downloads} max={maxDl} color="#f59e0b" />
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3.5 mono text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">{fmt.date(f.publication_date)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3.5 border-t border-slate-100 dark:border-slate-700/50 bg-slate-50/40 dark:bg-slate-800/30">
                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                        Showing <span className="font-semibold text-slate-900 dark:text-white">{((page - 1) * perPage) + 1}–{Math.min(page * perPage, filtered.length)}</span> of <span className="font-semibold text-slate-900 dark:text-white">{filtered.length}</span>
                                    </p>
                                    <div className="flex items-center gap-1">
                                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                                            className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition">
                                            Prev
                                        </button>
                                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                            const pg = totalPages <= 5 ? i + 1 : page <= 3 ? i + 1 : page >= totalPages - 2 ? totalPages - 4 + i : page - 2 + i;
                                            return (
                                                <button key={pg} onClick={() => setPage(pg)}
                                                    className={`size-8 text-sm rounded-lg transition ${pg === page ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"}`}>
                                                    {pg}
                                                </button>
                                            );
                                        })}
                                        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                                            className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition">
                                            Next
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            </Authenticated>
        </>
    );
}
