import { useState, useRef, useCallback } from 'react';
import { Head, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import axios from 'axios';
import { toast } from 'sonner';
import { PageProps as InertiaPageProps } from '@inertiajs/core';
import Breadcrumbs from '@/types/breadcrumbs';

// ─── Types ────────────────────────────────────────────────────────────────────
interface ExcelRow {
    _rowIndex: number;
    fileName: string;
    description: string;
    authors: string;
    publication_date: string;
    location: string;
    file?: File | null;
    user_id?: number | null;
    status: 'idle' | 'uploading' | 'done' | 'error';
    error?: string;
    /** Whether the metadata fields are unlocked for editing */
    editing?: boolean;
}

interface UserOption {
    id: number;
    username: string;
    email: string;
    profile?: { fname?: string; lname?: string };
}

interface PageProps extends InertiaPageProps {
    auth: { user: any; role: string };
    users: UserOption[];
}

// ─── Constants ────────────────────────────────────────────────────────────────
const EXPECTED_COLS = ['fileName', 'description', 'authors', 'publication_date', 'location'];
const breadcrumbs: Breadcrumbs = [
    { title: 'Home', href: route("admin.dashboard") },
    { title: 'File Manager', href: route("file-manager") },
    { title: 'Export Excel' },
]
// ─── Helpers ──────────────────────────────────────────────────────────────────
function normalizeDate(raw: string): string {
    if (!raw) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    const slash = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (slash) {
        const [, m, d, y] = slash;
        return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    const parsed = new Date(raw);
    if (!isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
    return raw;
}

function normalizeRow(raw: Record<string, any>, idx: number): ExcelRow {
    const rawDate = raw['publication_date'] ?? raw['Publication Date'] ?? raw['publicationDate'] ?? '';
    return {
        _rowIndex: idx,
        fileName: raw['fileName'] ?? raw['filename'] ?? raw['FileName'] ?? '',
        description: raw['description'] ?? raw['Description'] ?? '',
        authors: raw['authors'] ?? raw['Authors'] ?? '',
        publication_date: normalizeDate(String(rawDate)),
        location: raw['location'] ?? raw['Location'] ?? '',
        file: null,
        user_id: null,
        status: 'idle',
        editing: false,
    };
}

function parseCSV(text: string): Record<string, string>[] {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
    return lines.slice(1).map((line) => {
        const vals = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
        return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? '']));
    });
}

function excelSerialToISO(serial: number): string {
    const adjusted = serial >= 60 ? serial - 1 : serial;
    const epoch = new Date(1900, 0, 1);
    epoch.setDate(epoch.getDate() + adjusted - 1);
    const y = epoch.getFullYear();
    const m = String(epoch.getMonth() + 1).padStart(2, '0');
    const d = String(epoch.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function isDateFormatId(numFmtId: number, customFormats: Map<number, string>): boolean {
    if (numFmtId >= 14 && numFmtId <= 17) return true;
    if (numFmtId === 22) return true;
    const custom = customFormats.get(numFmtId) ?? '';
    return /[dmyDMY]/.test(custom.replace(/"[^"]*"/g, ''));
}

async function parseXLSX(file: File): Promise<Record<string, string>[]> {
    let JSZip: any;
    try { JSZip = (await import('jszip')).default; }
    catch { throw new Error('JSZip is not installed. Run: npm install jszip'); }

    const zip = await JSZip.loadAsync(await file.arrayBuffer());

    const sharedStrings: string[] = [];
    const ssFile = zip.file('xl/sharedStrings.xml');
    if (ssFile) {
        const doc = new DOMParser().parseFromString(await ssFile.async('string'), 'application/xml');
        doc.querySelectorAll('si').forEach((si: Element) => sharedStrings.push(si.textContent ?? ''));
    }

    const dateXfIndices = new Set<number>();
    const stylesFile = zip.file('xl/styles.xml');
    if (stylesFile) {
        const stylesDoc = new DOMParser().parseFromString(await stylesFile.async('string'), 'application/xml');
        const customFormats = new Map<number, string>();
        stylesDoc.querySelectorAll('numFmt').forEach((el: Element) => {
            const id = parseInt(el.getAttribute('numFmtId') ?? '0');
            const fmt = el.getAttribute('formatCode') ?? '';
            customFormats.set(id, fmt);
        });
        stylesDoc.querySelectorAll('cellXfs > xf').forEach((xf: Element, i: number) => {
            const numFmtId = parseInt(xf.getAttribute('numFmtId') ?? '0');
            if (isDateFormatId(numFmtId, customFormats)) dateXfIndices.add(i);
        });
    }

    const sheetFile = zip.file('xl/worksheets/sheet1.xml');
    if (!sheetFile) throw new Error('Could not find sheet1 in the Excel file.');
    const sheetDoc = new DOMParser().parseFromString(await sheetFile.async('string'), 'application/xml');
    const rows = Array.from(sheetDoc.querySelectorAll('row'));
    if (rows.length < 2) return [];

    const colIdx = (ref: string) =>
        ref.replace(/[0-9]/g, '').split('').reduce((a, c) => a * 26 + c.charCodeAt(0) - 64, 0) - 1;

    const cellVal = (c: Element): string => {
        const t = c.getAttribute('t');
        const s = parseInt(c.getAttribute('s') ?? '-1');
        const v = c.querySelector('v')?.textContent ?? '';
        if (t === 's') return sharedStrings[parseInt(v)] ?? '';
        if (t === 'inlineStr') return c.querySelector('is t')?.textContent ?? '';
        if (t === 'str') return v;
        if (v !== '' && !isNaN(Number(v)) && dateXfIndices.has(s)) return excelSerialToISO(parseFloat(v));
        return v;
    };

    const headers: Record<number, string> = {};
    rows[0].querySelectorAll('c').forEach((c: Element) => {
        headers[colIdx(c.getAttribute('r') ?? '')] = cellVal(c);
    });

    return rows.slice(1).map((row) => {
        const obj: Record<string, string> = {};
        row.querySelectorAll('c').forEach((c: Element) => {
            const h = headers[colIdx(c.getAttribute('r') ?? '')];
            if (h) obj[h] = cellVal(c);
        });
        return obj;
    });
}

async function parseWorkbook(file: File): Promise<Record<string, string>[]> {
    const name = file.name.toLowerCase();
    if (name.endsWith('.csv')) return parseCSV(await file.text());
    if (name.endsWith('.xlsx') || name.endsWith('.xls')) return parseXLSX(file);
    throw new Error('Unsupported file type. Use .xlsx, .xls, or .csv.');
}

// ─── Shared input class ───────────────────────────────────────────────────────
const inputCls = "w-full text-xs rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900/60 text-slate-700 dark:text-slate-200 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors";

// ─── Pencil / Lock icon button ────────────────────────────────────────────────
function EditToggleBtn({ editing, onClick, disabled }: { editing: boolean; onClick: () => void; disabled?: boolean }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            title={editing ? 'Lock fields' : 'Edit fields'}
            className={`ml-1 w-6 h-6 flex items-center justify-center rounded-md transition-all shrink-0
                ${editing
                    ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-800/60'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-600 hover:text-slate-600 dark:hover:text-slate-300'
                }
                disabled:opacity-30 disabled:cursor-not-allowed`}
        >
            {editing ? (
                // Lock (close) icon
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <rect x="5" y="11" width="14" height="10" rx="2" />
                    <path strokeLinecap="round" d="M8 11V7a4 4 0 018 0v4" />
                </svg>
            ) : (
                // Pencil icon
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-1.414.586H8v-2.414a2 2 0 01.586-1.414z" />
                </svg>
            )}
        </button>
    );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: ExcelRow['status'] }) {
    const map: Record<string, { label: string; cls: string }> = {
        idle: { label: 'Pending', cls: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400' },
        uploading: { label: 'Uploading…', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' },
        done: { label: 'Done', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300' },
        error: { label: 'Error', cls: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300' },
    };
    const { label, cls } = map[status] ?? map.idle;
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${cls}`}>
            {status === 'uploading' && (
                <svg className="w-2.5 h-2.5 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
            )}
            {status === 'done' && <span className="text-[10px]">✓</span>}
            {status === 'error' && <span className="text-[10px]">✕</span>}
            {label}
        </span>
    );
}

// ─── User Select ──────────────────────────────────────────────────────────────
function UserSelect({ users, value, onChange, disabled }: {
    users: UserOption[]; value: number | null;
    onChange: (id: number | null) => void; disabled?: boolean;
}) {
    return (
        <select
            disabled={disabled} value={value ?? ''}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
            className={inputCls + " min-w-[150px]"}
        >
            <option value="">— Select user —</option>
            {users.map((u) => (
                <option key={u.id} value={u.id}>
                    {u.profile?.fname ? `${u.profile.fname} ${u.profile.lname} (${u.username})` : u.username}
                </option>
            ))}
        </select>
    );
}

// ─── Mobile row card ──────────────────────────────────────────────────────────
function MobileRowCard({ row, idx, users, updateRow, removeRow }: {
    row: ExcelRow; idx: number; users: UserOption[];
    updateRow: (i: number, p: Partial<ExcelRow>) => void;
    removeRow: (i: number) => void;
}) {
    const locked = row.status === 'done' || row.status === 'uploading';
    const metaEditable = !locked && !!row.editing;
    const rowBg =
        row.status === 'done' ? 'border-emerald-200 dark:border-emerald-700/50 bg-emerald-50 dark:bg-emerald-900/20' :
            row.status === 'error' ? 'border-red-200 dark:border-red-700/50 bg-red-50 dark:bg-red-900/20' :
                'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50';

    return (
        <div className={`rounded-2xl border p-4 space-y-3 transition-colors ${rowBg}`}>
            {/* Top bar */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="w-6 h-6 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-xs font-bold shrink-0">
                        {idx + 1}
                    </span>
                    <StatusBadge status={row.status} />
                </div>
                {!locked && (
                    <button onClick={() => removeRow(row._rowIndex)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 dark:text-slate-600 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-500 dark:hover:text-red-400 transition-all">
                        ✕
                    </button>
                )}
            </div>

            {/* File + User — shown first */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-0.5">Assign User</label>
                    <UserSelect users={users} value={row.user_id ?? null} onChange={(id) => updateRow(row._rowIndex, { user_id: id })} disabled={locked} />
                </div>
                <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-0.5">Attach File</label>
                    <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium cursor-pointer transition-all
                        ${row.file ? 'border-emerald-300 dark:border-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                            : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 hover:border-indigo-300 dark:hover:border-indigo-500'}
                        ${locked ? 'pointer-events-none opacity-50' : ''}`}>
                        <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        <span className="truncate">{row.file ? row.file.name : 'Choose file…'}</span>
                        <input type="file" className="hidden" onChange={(e) => updateRow(row._rowIndex, { file: e.target.files?.[0] ?? null })} />
                    </label>
                </div>
            </div>

            {/* Metadata fields — with edit toggle header */}
            <div className="rounded-xl border border-slate-100 dark:border-slate-700 overflow-hidden">
                <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-700">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Metadata</span>
                    {!locked && (
                        <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-slate-400 dark:text-slate-500">
                                {row.editing ? 'Editing' : 'Read-only'}
                            </span>
                            <EditToggleBtn
                                editing={!!row.editing}
                                onClick={() => updateRow(row._rowIndex, { editing: !row.editing })}
                                disabled={locked}
                            />
                        </div>
                    )}
                </div>
                <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {([
                        { field: 'fileName', label: 'File Name', type: 'text' },
                        { field: 'description', label: 'Description', type: 'text' },
                        { field: 'authors', label: 'Authors', type: 'text' },
                        { field: 'publication_date', label: 'Pub. Date', type: 'date' },
                    ] as const).map(({ field, label, type }) => (
                        <div key={field} className={field === 'description' ? 'sm:col-span-2' : ''}>
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-0.5">{label}</label>
                            <input
                                type={type}
                                disabled={!metaEditable}
                                value={row[field]}
                                onChange={(e) => updateRow(row._rowIndex, { [field]: e.target.value })}
                                className={inputCls + " text-sm py-2"}
                            />
                        </div>
                    ))}
                    <div className="sm:col-span-2">
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-0.5">Location</label>
                        <input
                            type="text"
                            disabled={!metaEditable}
                            value={row.location}
                            onChange={(e) => updateRow(row._rowIndex, { location: e.target.value })}
                            className={inputCls + " text-sm py-2"}
                        />
                    </div>
                </div>
            </div>

            {row.error && (
                <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2 flex items-start gap-1.5">
                    <span className="shrink-0">⚠️</span>{row.error}
                </p>
            )}
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function FileImportExcel() {
    const { props } = usePage<PageProps>();
    const users: UserOption[] = props.users ?? [];

    const [rows, setRows] = useState<ExcelRow[]>([]);
    const [dragOver, setDragOver] = useState(false);
    const [parseError, setParseError] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [globalUser, setGlobalUser] = useState<number | null>(null);
    const excelInputRef = useRef<HTMLInputElement>(null);

    const handleFile = useCallback(async (file: File) => {
        setParseError(null);
        try {
            const json = await parseWorkbook(file);
            if (!json.length) { setParseError('The file is empty or has no data rows.'); return; }
            setRows(json.map((r, i) => normalizeRow(r, i)));
            toast.success(`Parsed ${json.length} row${json.length !== 1 ? 's' : ''}`);
        } catch (err: any) { setParseError(err.message ?? 'Failed to parse file.'); }
    }, []);

    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault(); setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    }, [handleFile]);

    const updateRow = (idx: number, patch: Partial<ExcelRow>) =>
        setRows((prev) => prev.map((r) => r._rowIndex === idx ? { ...r, ...patch } : r));
    const removeRow = (idx: number) =>
        setRows((prev) => prev.filter((r) => r._rowIndex !== idx));
    const applyGlobalUser = () => {
        if (!globalUser) return;
        setRows((prev) => prev.map((r) => ({ ...r, user_id: globalUser })));
        toast.success('User applied to all rows');
    };

    const uploadAll = async () => {
        const pending = rows.filter((r) => r.status !== 'done');
        if (!pending.length) { toast.info('Nothing to upload.'); return; }
        const invalid = pending.filter((r) => !r.file || !r.user_id || !r.fileName);
        if (invalid.length) { toast.error(`${invalid.length} row(s) missing a file, user, or file name.`); return; }

        setUploading(true);
        for (const row of pending) {
            updateRow(row._rowIndex, { status: 'uploading' });
            try {
                const fd = new FormData();
                fd.append('file', row.file!); fd.append('name', row.file!.name);
                fd.append('type', 'file'); fd.append('fileName', row.fileName);
                fd.append('description', row.description); fd.append('authors', row.authors);
                fd.append('publication_date', row.publication_date); fd.append('location', row.location);
                fd.append('user_id', String(row.user_id));
                await axios.post('/api/files/import', fd);
                updateRow(row._rowIndex, { status: 'done' });
            } catch (err: any) {
                updateRow(row._rowIndex, { status: 'error', error: err.response?.data?.message ?? 'Upload failed' });
            }
        }
        setUploading(false);
        toast.success('Upload complete!');
    };

    const allDone = rows.length > 0 && rows.every((r) => r.status === 'done');
    const anyPending = rows.some((r) => r.status === 'idle' || r.status === 'error');
    const doneCount = rows.filter((r) => r.status === 'done').length;
    const errorCount = rows.filter((r) => r.status === 'error').length;

    // Desktop column definitions — new order
    const desktopMetaCols: { field: 'fileName' | 'description' | 'authors' | 'publication_date' | 'location'; label: string }[] = [
        { field: 'fileName', label: 'File Name' },
        { field: 'description', label: 'Description' },
        { field: 'authors', label: 'Authors' },
        { field: 'publication_date', label: 'Pub. Date' },
        { field: 'location', label: 'Location' },
    ];

    return (
        <AuthenticatedLayout breadcrumbs={breadcrumbs}>
            <Head title="Import Excel" />

            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@400;500&display=swap');
                .ie-root { font-family: 'Syne', sans-serif; }
                .ie-mono { font-family: 'DM Mono', monospace; }
                @keyframes slideBar { 0%{left:-40%} 100%{left:100%} }
                @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }
                .fade-up { animation: fadeUp .35s ease both; }
            `}</style>

            <div className="ie-root -mx-4 sm:-mx-6 -my-6 px-4 sm:px-6 py-6 sm:py-8 min-h-full
                bg-slate-50 dark:bg-slate-900
                [background-image:radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(99,102,241,.07)_0%,transparent_60%)]
                dark:[background-image:radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(99,102,241,.18)_0%,transparent_60%)]"
            >
                <div className="max-w-7xl mx-auto space-y-6">

                    {/* ── Header ── */}
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3">
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <div className="w-9 h-9 shrink-0 rounded-xl
                                    bg-emerald-100 dark:bg-emerald-900/40
                                    border border-emerald-200 dark:border-emerald-700/50
                                    flex items-center justify-center text-lg">
                                    📊
                                </div>
                                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-800 dark:text-white">
                                    Import via Excel
                                </h1>
                            </div>
                            <p className="text-sm text-slate-400 dark:text-slate-500 sm:ml-12">
                                Upload an Excel or CSV, review each row, attach a file &amp; assign a user, then bulk-upload.
                            </p>
                        </div>
                        {rows.length > 0 && (
                            <button
                                onClick={() => { setRows([]); setParseError(null); }}
                                className="self-start sm:self-auto text-xs text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 transition-colors flex items-center gap-1"
                            >
                                ✕ Clear &amp; start over
                            </button>
                        )}
                    </div>

                    {/* ── Step 1: Drop zone ── */}
                    {rows.length === 0 && (
                        <div className="fade-up space-y-4">
                            <div className="flex flex-wrap items-center gap-2 text-xs ie-mono">
                                <span className="px-2 py-1 rounded-md font-medium
                                    bg-white dark:bg-slate-800
                                    border border-slate-200 dark:border-slate-700
                                    text-slate-500 dark:text-slate-400">
                                    Expected columns:
                                </span>
                                {EXPECTED_COLS.map((c) => (
                                    <span key={c} className="px-2 py-1 rounded-md
                                        bg-indigo-50 dark:bg-indigo-900/40
                                        text-indigo-600 dark:text-indigo-300
                                        border border-indigo-100 dark:border-indigo-700/50">
                                        {c}
                                    </span>
                                ))}
                            </div>

                            <div
                                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                                onDragLeave={() => setDragOver(false)}
                                onDrop={onDrop}
                                onClick={() => excelInputRef.current?.click()}
                                className={`cursor-pointer rounded-2xl border-2 border-dashed transition-all
                                    py-12 sm:py-20 px-6 flex flex-col items-center gap-4 text-center
                                    ${dragOver
                                        ? 'border-indigo-400 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 scale-[1.01]'
                                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40 hover:border-indigo-300 dark:hover:border-indigo-600 hover:bg-slate-50/80 dark:hover:bg-slate-800/60'
                                    }`}
                            >
                                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl
                                    bg-emerald-100 dark:bg-emerald-900/40
                                    border border-emerald-200 dark:border-emerald-700/50
                                    flex items-center justify-center text-2xl sm:text-3xl">
                                    📂
                                </div>
                                <div>
                                    <p className="font-bold text-slate-700 dark:text-slate-200 text-base sm:text-lg">
                                        Drop your Excel or CSV file here
                                    </p>
                                    <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">
                                        or tap to browse — .xlsx / .xls / .csv
                                    </p>
                                </div>
                                <input ref={excelInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
                                    onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
                            </div>

                            {parseError && (
                                <div className="px-4 py-3 rounded-xl flex items-start gap-2 text-sm
                                    bg-red-50 dark:bg-red-900/30
                                    border border-red-200 dark:border-red-700/50
                                    text-red-600 dark:text-red-300">
                                    <span className="shrink-0">⚠️</span>
                                    <span>{parseError}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Step 2: Review ── */}
                    {rows.length > 0 && (
                        <div className="fade-up space-y-4">

                            {/* Stats row */}
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                                <span className="text-slate-500 dark:text-slate-400">
                                    <span className="font-bold text-slate-700 dark:text-slate-200">{rows.length}</span>{' '}
                                    row{rows.length !== 1 ? 's' : ''}
                                </span>
                                {doneCount > 0 && (
                                    <>
                                        <span className="text-slate-300 dark:text-slate-600">·</span>
                                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">{doneCount} uploaded</span>
                                    </>
                                )}
                                {errorCount > 0 && (
                                    <>
                                        <span className="text-slate-300 dark:text-slate-600">·</span>
                                        <span className="font-semibold text-red-500 dark:text-red-400">{errorCount} failed</span>
                                    </>
                                )}
                            </div>

                            {/* Bulk assign bar */}
                            <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-2xl
                                bg-white dark:bg-slate-800/60
                                border border-slate-200 dark:border-slate-700">
                                <span className="text-sm font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                    Assign user to all:
                                </span>
                                <div className="flex-1 min-w-0">
                                    <UserSelect users={users} value={globalUser} onChange={setGlobalUser} />
                                </div>
                                <button onClick={applyGlobalUser} disabled={!globalUser}
                                    className="w-full sm:w-auto px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap
                                        bg-indigo-600 hover:bg-indigo-500 dark:bg-indigo-600 dark:hover:bg-indigo-500
                                        text-white disabled:opacity-40 disabled:cursor-not-allowed">
                                    Apply to all
                                </button>
                            </div>

                            {/* ── Desktop table (md+) ── */}
                            <div className="hidden md:block rounded-2xl border overflow-x-auto
                                border-slate-200 dark:border-slate-700
                                bg-white dark:bg-slate-800/40">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-100 dark:border-slate-700
                                            bg-slate-50/80 dark:bg-slate-800/80">
                                            {/*
                                                New column order:
                                                # | Assign User | Attach File | File Name | Description | Authors | Pub. Date | Location | Status | Edit | Remove
                                            */}
                                            {['#', 'Assign User', 'Attach File', 'File Name', 'Description', 'Authors', 'Pub. Date', 'Location', 'Status', 'Edit', ''].map((h) => (
                                                <th key={h} className="px-3 py-3 text-left text-xs font-bold uppercase tracking-widest whitespace-nowrap
                                                    text-slate-400 dark:text-slate-500">
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                        {rows.map((row, i) => {
                                            const locked = row.status === 'done' || row.status === 'uploading';
                                            const metaEditable = !locked && !!row.editing;
                                            return (
                                                <tr key={row._rowIndex} className={`transition-colors
                                                    ${row.status === 'done' ? 'bg-emerald-50/60 dark:bg-emerald-900/20' :
                                                        row.status === 'error' ? 'bg-red-50/60 dark:bg-red-900/20' :
                                                            'hover:bg-slate-50 dark:hover:bg-slate-700/20'}`}>

                                                    {/* # */}
                                                    <td className="px-3 py-2.5 text-xs tabular-nums ie-mono text-slate-400 dark:text-slate-500">
                                                        {i + 1}
                                                    </td>

                                                    {/* Assign User — FIRST */}
                                                    <td className="px-2 py-2 min-w-[160px]">
                                                        <UserSelect
                                                            users={users}
                                                            value={row.user_id ?? null}
                                                            onChange={(id) => updateRow(row._rowIndex, { user_id: id })}
                                                            disabled={locked}
                                                        />
                                                    </td>

                                                    {/* Attach File — SECOND */}
                                                    <td className="px-2 py-2">
                                                        <label className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-all whitespace-nowrap
                                                            ${row.file
                                                                ? 'border-emerald-300 dark:border-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                                                                : 'border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/40 text-slate-500 dark:text-slate-400 hover:border-indigo-300 dark:hover:border-indigo-500'}
                                                            ${locked ? 'pointer-events-none opacity-50' : ''}`}>
                                                            <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                                            </svg>
                                                            <span className="max-w-[90px] truncate">
                                                                {row.file ? row.file.name : 'Choose…'}
                                                            </span>
                                                            <input type="file" className="hidden"
                                                                onChange={(e) => updateRow(row._rowIndex, { file: e.target.files?.[0] ?? null })} />
                                                        </label>
                                                    </td>

                                                    {/* Metadata fields — editable only when row.editing is true */}
                                                    {desktopMetaCols.map(({ field, label }) => (
                                                        <td key={field} className="px-2 py-2">
                                                            <input
                                                                type={field === 'publication_date' ? 'date' : 'text'}
                                                                disabled={!metaEditable}
                                                                value={row[field]}
                                                                onChange={(e) => updateRow(row._rowIndex, { [field]: e.target.value })}
                                                                placeholder={label}
                                                                className={inputCls + " min-w-[100px]"}
                                                            />
                                                        </td>
                                                    ))}

                                                    {/* Status */}
                                                    <td className="px-3 py-2 whitespace-nowrap">
                                                        <StatusBadge status={row.status} />
                                                        {row.error && (
                                                            <p className="text-xs text-red-500 dark:text-red-400 mt-1 max-w-[110px] truncate" title={row.error}>
                                                                {row.error}
                                                            </p>
                                                        )}
                                                    </td>

                                                    {/* Edit toggle button */}
                                                    <td className="px-2 py-2">
                                                        <EditToggleBtn
                                                            editing={!!row.editing}
                                                            onClick={() => updateRow(row._rowIndex, { editing: !row.editing })}
                                                            disabled={locked}
                                                        />
                                                    </td>

                                                    {/* Remove */}
                                                    <td className="px-2 py-2">
                                                        <button
                                                            disabled={locked}
                                                            onClick={() => removeRow(row._rowIndex)}
                                                            title="Remove row"
                                                            className="w-7 h-7 flex items-center justify-center rounded-lg transition-all
                                                                text-slate-300 dark:text-slate-600
                                                                hover:bg-red-50 dark:hover:bg-red-900/30
                                                                hover:text-red-500 dark:hover:text-red-400
                                                                disabled:opacity-30 disabled:cursor-not-allowed">
                                                            ✕
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* ── Mobile cards (< md) ── */}
                            <div className="md:hidden space-y-3">
                                {rows.map((row, i) => (
                                    <MobileRowCard key={row._rowIndex} row={row} idx={i}
                                        users={users} updateRow={updateRow} removeRow={removeRow} />
                                ))}
                            </div>

                            {/* Upload progress bar */}
                            {uploading && (
                                <div className="relative h-1 w-full rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700">
                                    <div className="absolute inset-y-0 w-2/5 rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500"
                                        style={{ animation: 'slideBar 1.4s ease-in-out infinite' }} />
                                </div>
                            )}

                            {/* Action footer */}
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:justify-end pt-1">
                                {allDone && (
                                    <div className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold
                                        bg-emerald-50 dark:bg-emerald-900/30
                                        border border-emerald-200 dark:border-emerald-700/50
                                        text-emerald-700 dark:text-emerald-300">
                                        ✓ All files uploaded!
                                    </div>
                                )}
                                <button onClick={uploadAll} disabled={uploading || allDone || !anyPending}
                                    className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all
                                        bg-indigo-600 hover:bg-indigo-500
                                        dark:bg-indigo-600 dark:hover:bg-indigo-500
                                        text-white
                                        shadow-lg shadow-indigo-500/20 dark:shadow-indigo-900/40
                                        disabled:opacity-40 disabled:cursor-not-allowed">
                                    {uploading ? (
                                        <>
                                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                            </svg>
                                            Uploading…
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                            </svg>
                                            Upload All
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
