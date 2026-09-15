import Authenticated from "@/Layouts/AuthenticatedLayout";
import { Head } from "@inertiajs/react";
import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import {
    ArchiveBoxIcon,
    TrashIcon,
    ArrowUturnLeftIcon,
    MagnifyingGlassIcon,
    DocumentIcon,
    FolderIcon,
    ExclamationTriangleIcon,
    Squares2X2Icon,
    CheckIcon,
} from "@heroicons/react/24/outline";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FileDetail {
    fileName: string;
    size: number;
    description?: string;
    authors?: string;
    status: "inactive" | "active" | "archived";
}

interface ArchivedFile {
    id: number;
    name: string;
    type: "file" | "folder";
    path?: string;
    archived_at?: string;
    deleted_at?: string;
    days_left: number;
    is_archived: boolean;
    is_trashed: boolean;
    details?: FileDetail;
}

type Tab = "all" | "archived" | "trashed";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

function formatDate(dateStr?: string): string {
    if (!dateStr) return "—";
    return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    }).format(new Date(dateStr));
}

const breadcrumbs = [
    { title: "Home", href: route("dashboard") },
    { title: "Archive" },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function DaysLeftBadge({ days }: { days: number }) {
    const urgent = days <= 5;
    const warning = days <= 14;
    return (
        <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap
                ${urgent
                    ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
                    : warning
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
                        : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                }`}
        >
            <span className={`w-1.5 h-1.5 rounded-full shrink-0
                ${urgent ? "bg-red-500" : warning ? "bg-amber-500" : "bg-slate-400 dark:bg-slate-500"}`}
            />
            {days}d
        </span>
    );
}

function StatusBadge({ isTrashed }: { isTrashed: boolean }) {
    return isTrashed ? (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold
            bg-red-50 text-red-600 border border-red-100
            dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/50">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 dark:bg-red-500 shrink-0" />
            Deleted
        </span>
    ) : (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold
            bg-amber-50 text-amber-700 border border-amber-100
            dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/50">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 dark:bg-amber-500 shrink-0" />
            Archived
        </span>
    );
}

function EmptyState({ tab }: { tab: Tab }) {
    const cfg: Record<Tab, { Icon: React.ElementType; text: string; sub: string }> = {
        all: { Icon: Squares2X2Icon, text: "Nothing here yet", sub: "Archived or deleted files will appear here." },
        archived: { Icon: ArchiveBoxIcon, text: "No archived files", sub: "Files you archive will be held here for 30 days." },
        trashed: { Icon: TrashIcon, text: "Trash is empty", sub: "Deleted files will appear here before permanent removal." },
    };
    const { Icon, text, sub } = cfg[tab];
    return (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                <Icon className="w-8 h-8 text-slate-400 dark:text-slate-500" />
            </div>
            <p className="text-base font-semibold text-slate-600 dark:text-slate-300">{text}</p>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1 max-w-xs">{sub}</p>
        </div>
    );
}

// Mobile card view for a single file
function FileCard({
    file,
    selected,
    processing,
    onSelect,
    onRestore,
    onDelete,
}: {
    file: ArchivedFile;
    selected: boolean;
    processing: boolean;
    onSelect: () => void;
    onRestore: () => void;
    onDelete: () => void;
}) {
    return (
        <div className={`p-4 rounded-xl border transition-colors
            ${selected
                ? "bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-700/50"
                : "bg-white border-slate-200 dark:bg-slate-800/60 dark:border-slate-700/50"
            }`}
        >
            <div className="flex items-start gap-3">
                {/* Checkbox */}
                <button
                    onClick={onSelect}
                    className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors
                        ${selected
                            ? "bg-indigo-600 border-indigo-600"
                            : "border-slate-300 dark:border-slate-600 hover:border-indigo-400"
                        }`}
                >
                    {selected && <CheckIcon className="w-3 h-3 text-white" strokeWidth={3} />}
                </button>

                {/* Icon */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0
                    ${file.type === "folder"
                        ? "bg-amber-100 dark:bg-amber-900/30"
                        : "bg-blue-100 dark:bg-blue-900/30"
                    }`}
                >
                    {file.type === "folder"
                        ? <FolderIcon className="w-5 h-5 text-amber-500 dark:text-amber-400" />
                        : <DocumentIcon className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                    }
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 dark:text-slate-100 truncate text-sm">
                        {file.details?.fileName ?? file.name}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                        <StatusBadge isTrashed={file.is_trashed} />
                        <DaysLeftBadge days={file.days_left} />
                        {file.details?.size && (
                            <span className="text-xs text-slate-400 dark:text-slate-500">
                                {formatSize(file.details.size)}
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                        {formatDate(file.deleted_at ?? file.archived_at)}
                    </p>
                </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/50">
                <button
                    onClick={onRestore}
                    disabled={processing}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg
                        text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200
                        dark:text-emerald-400 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/40 dark:border-emerald-800/50
                        transition-colors disabled:opacity-50"
                >
                    {processing ? (
                        <span className="w-3.5 h-3.5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <ArrowUturnLeftIcon className="w-3.5 h-3.5" />
                    )}
                    Restore
                </button>
                <button
                    onClick={onDelete}
                    disabled={processing}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg
                        text-red-600 bg-red-50 hover:bg-red-100 border border-red-200
                        dark:text-red-400 dark:bg-red-900/20 dark:hover:bg-red-900/40 dark:border-red-800/50
                        transition-colors disabled:opacity-50"
                >
                    <TrashIcon className="w-3.5 h-3.5" />
                    Delete Forever
                </button>
            </div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ArchivedFiles() {
    const [tab, setTab] = useState<Tab>("all");
    const [files, setFiles] = useState<ArchivedFile[]>([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<Set<number>>(new Set());
    const [search, setSearch] = useState("");
    const [processing, setProcessing] = useState<number | null>(null);
    const [bulkProcessing, setBulkProcessing] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<ArchivedFile | null>(null);
    const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

    const fetchFiles = useCallback(async () => {
        setLoading(true);
        setSelected(new Set());
        try {
            const { data } = await axios.get(route("archived.list"), { params: { tab } });
            setFiles(data.data);
        } finally {
            setLoading(false);
        }
    }, [tab]);

    useEffect(() => { fetchFiles(); }, [fetchFiles]);

    const filtered = files.filter((f) =>
        f.name.toLowerCase().includes(search.toLowerCase()) ||
        f.details?.fileName?.toLowerCase().includes(search.toLowerCase())
    );

    // ─── Actions ──────────────────────────────────────────────────────────────

    const restore = async (file: ArchivedFile) => {
        setProcessing(file.id);
        try {
            await axios.post(route("archived.restore", file.id));
            await fetchFiles();
        } finally {
            setProcessing(null);
        }
    };

    const forceDelete = async (file: ArchivedFile) => {
        setProcessing(file.id);
        setConfirmDelete(null);
        try {
            await axios.delete(route("archived.force-delete", file.id));
            await fetchFiles();
        } finally {
            setProcessing(null);
        }
    };

    const bulkRestore = async () => {
        setBulkProcessing(true);
        try {
            await axios.post(route("archived.bulk-restore"), { ids: [...selected] });
            await fetchFiles();
        } finally {
            setBulkProcessing(false);
        }
    };

    const bulkDelete = async () => {
        setBulkProcessing(true);
        setConfirmBulkDelete(false);
        try {
            await axios.delete(route("archived.bulk-force-delete"), { data: { ids: [...selected] } });
            await fetchFiles();
        } finally {
            setBulkProcessing(false);
        }
    };

    const toggleSelect = (id: number) =>
        setSelected((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });

    const toggleAll = () =>
        setSelected(selected.size === filtered.length
            ? new Set()
            : new Set(filtered.map((f) => f.id))
        );

    const tabs: { key: Tab; label: string; Icon: React.ElementType }[] = [
        { key: "all", label: "All", Icon: Squares2X2Icon },
        { key: "archived", label: "Archived", Icon: ArchiveBoxIcon },
        { key: "trashed", label: "Trash", Icon: TrashIcon },
    ];

    return (
        <Authenticated breadcrumbs={breadcrumbs}>
            <Head title="Archive" />

            {/* ── Page Header ──────────────────────────────────────────────── */}
            <div className="mb-5 sm:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
                        Archive
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                        Files are permanently removed after{" "}
                        <span className="font-semibold text-slate-700 dark:text-slate-300">30 days</span>.
                    </p>
                </div>

                {/* Search */}
                <div className="relative w-full sm:w-72">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                    <input
                        type="text"
                        placeholder="Search files…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-sm rounded-xl
                            bg-white border border-slate-200 text-slate-800 placeholder-slate-400
                            dark:bg-slate-800/60 dark:border-slate-700 dark:text-slate-100 dark:placeholder-slate-500
                            focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                            transition-colors duration-150"
                    />
                </div>
            </div>

            {/* ── Tabs ─────────────────────────────────────────────────────── */}
            <div className="flex gap-1 mb-4 bg-slate-100 dark:bg-slate-800/60 rounded-xl p-1 w-fit">
                {tabs.map(({ key, label, Icon }) => (
                    <button
                        key={key}
                        onClick={() => setTab(key)}
                        className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all duration-150
                            ${tab === key
                                ? "bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm"
                                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                            }`}
                    >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="hidden xs:inline sm:inline">{label}</span>
                    </button>
                ))}
            </div>

            {/* ── Bulk Actions Bar ──────────────────────────────────────────── */}
            {selected.size > 0 && (
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-4 px-3 sm:px-4 py-3
                    bg-indigo-50 dark:bg-indigo-900/20
                    border border-indigo-200 dark:border-indigo-700/50
                    rounded-xl transition-all">
                    <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
                        {selected.size} selected
                    </span>
                    <div className="flex gap-2 ml-auto">
                        <button
                            onClick={bulkRestore}
                            disabled={bulkProcessing}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg
                                text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200
                                dark:text-emerald-400 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/40 dark:border-emerald-800/50
                                transition-colors disabled:opacity-50"
                        >
                            <ArrowUturnLeftIcon className="w-3.5 h-3.5" />
                            Restore All
                        </button>
                        <button
                            onClick={() => setConfirmBulkDelete(true)}
                            disabled={bulkProcessing}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg
                                text-red-600 bg-red-50 hover:bg-red-100 border border-red-200
                                dark:text-red-400 dark:bg-red-900/20 dark:hover:bg-red-900/40 dark:border-red-800/50
                                transition-colors disabled:opacity-50"
                        >
                            <TrashIcon className="w-3.5 h-3.5" />
                            Delete All
                        </button>
                    </div>
                </div>
            )}

            {/* ── Content ──────────────────────────────────────────────────── */}
            {loading ? (
                <div className="flex items-center justify-center py-24">
                    <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50 rounded-2xl">
                    <EmptyState tab={tab} />
                </div>
            ) : (
                <>
                    {/* ── Desktop Table (md+) ─────────────────────────────── */}
                    <div className="hidden md:block bg-white dark:bg-slate-800/60
                        border border-slate-200 dark:border-slate-700/50
                        rounded-2xl overflow-hidden shadow-sm">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 dark:border-slate-700/50
                                    bg-slate-50/80 dark:bg-slate-800/80">
                                    <th className="w-10 px-4 py-3">
                                        <button
                                            onClick={toggleAll}
                                            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors
                                                ${selected.size === filtered.length && filtered.length > 0
                                                    ? "bg-indigo-600 border-indigo-600"
                                                    : "border-slate-300 dark:border-slate-600 hover:border-indigo-400"
                                                }`}
                                        >
                                            {selected.size === filtered.length && filtered.length > 0 && (
                                                <CheckIcon className="w-3 h-3 text-white" strokeWidth={3} />
                                            )}
                                        </button>
                                    </th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Name</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Status</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 hidden lg:table-cell">Date</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Expires</th>
                                    <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/30">
                                {filtered.map((file) => (
                                    <tr
                                        key={file.id}
                                        className={`transition-colors duration-100
                                            ${selected.has(file.id)
                                                ? "bg-indigo-50/60 dark:bg-indigo-900/10"
                                                : "hover:bg-slate-50/80 dark:hover:bg-slate-700/20"
                                            }`}
                                    >
                                        {/* Checkbox */}
                                        <td className="px-4 py-3.5">
                                            <button
                                                onClick={() => toggleSelect(file.id)}
                                                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors
                                                    ${selected.has(file.id)
                                                        ? "bg-indigo-600 border-indigo-600"
                                                        : "border-slate-300 dark:border-slate-600 hover:border-indigo-400"
                                                    }`}
                                            >
                                                {selected.has(file.id) && (
                                                    <CheckIcon className="w-3 h-3 text-white" strokeWidth={3} />
                                                )}
                                            </button>
                                        </td>

                                        {/* Name */}
                                        <td className="px-4 py-3.5">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0
                                                    ${file.type === "folder"
                                                        ? "bg-amber-100 dark:bg-amber-900/30"
                                                        : "bg-blue-100 dark:bg-blue-900/30"
                                                    }`}
                                                >
                                                    {file.type === "folder"
                                                        ? <FolderIcon className="w-5 h-5 text-amber-500 dark:text-amber-400" />
                                                        : <DocumentIcon className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                                                    }
                                                </div>
                                                <div>
                                                    <p className="font-medium text-slate-800 dark:text-slate-100 truncate max-w-[180px] lg:max-w-[240px]">
                                                        {file.details?.fileName ?? file.name}
                                                    </p>
                                                    {file.details?.size && (
                                                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                                                            {formatSize(file.details.size)}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </td>

                                        {/* Status */}
                                        <td className="px-4 py-3.5">
                                            <StatusBadge isTrashed={file.is_trashed} />
                                        </td>

                                        {/* Date */}
                                        <td className="px-4 py-3.5 hidden lg:table-cell text-slate-500 dark:text-slate-400 text-xs">
                                            {formatDate(file.deleted_at ?? file.archived_at)}
                                        </td>

                                        {/* Days left */}
                                        <td className="px-4 py-3.5">
                                            <DaysLeftBadge days={file.days_left} />
                                        </td>

                                        {/* Actions */}
                                        <td className="px-4 py-3.5">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => restore(file)}
                                                    disabled={processing === file.id}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg
                                                        text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200
                                                        dark:text-emerald-400 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/40 dark:border-emerald-800/50
                                                        transition-colors disabled:opacity-50"
                                                >
                                                    {processing === file.id ? (
                                                        <span className="w-3.5 h-3.5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                                                    ) : (
                                                        <ArrowUturnLeftIcon className="w-3.5 h-3.5" />
                                                    )}
                                                    Restore
                                                </button>
                                                <button
                                                    onClick={() => setConfirmDelete(file)}
                                                    disabled={processing === file.id}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg
                                                        text-red-600 bg-red-50 hover:bg-red-100 border border-red-200
                                                        dark:text-red-400 dark:bg-red-900/20 dark:hover:bg-red-900/40 dark:border-red-800/50
                                                        transition-colors disabled:opacity-50"
                                                >
                                                    <TrashIcon className="w-3.5 h-3.5" />
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* ── Mobile Card Grid (< md) ──────────────────────────── */}
                    <div className="md:hidden space-y-2.5">
                        {filtered.map((file) => (
                            <FileCard
                                key={file.id}
                                file={file}
                                selected={selected.has(file.id)}
                                processing={processing === file.id}
                                onSelect={() => toggleSelect(file.id)}
                                onRestore={() => restore(file)}
                                onDelete={() => setConfirmDelete(file)}
                            />
                        ))}
                    </div>
                </>
            )}

            {/* ── Footer note ───────────────────────────────────────────────── */}
            {!loading && files.length > 0 && (
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-4 text-center">
                    Files archived or deleted more than 30 days ago are automatically purged.
                </p>
            )}

            {/* ── Confirm Single Delete ─────────────────────────────────────── */}
            {confirmDelete && (
                <ConfirmModal
                    title="Delete permanently?"
                    message={
                        <>
                            <span className="font-semibold text-slate-800 dark:text-slate-100">
                                {confirmDelete.details?.fileName ?? confirmDelete.name}
                            </span>{" "}
                            will be gone forever. This cannot be undone.
                        </>
                    }
                    confirmLabel="Delete Forever"
                    onConfirm={() => forceDelete(confirmDelete)}
                    onCancel={() => setConfirmDelete(null)}
                />
            )}

            {/* ── Confirm Bulk Delete ───────────────────────────────────────── */}
            {confirmBulkDelete && (
                <ConfirmModal
                    title={`Delete ${selected.size} file(s)?`}
                    message="All selected files will be permanently deleted. This cannot be undone."
                    confirmLabel="Delete Forever"
                    onConfirm={bulkDelete}
                    onCancel={() => setConfirmBulkDelete(false)}
                />
            )}
        </Authenticated>
    );
}

// ─── Confirm Modal ────────────────────────────────────────────────────────────

function ConfirmModal({
    title,
    message,
    confirmLabel,
    onConfirm,
    onCancel,
}: {
    title: string;
    message: React.ReactNode;
    confirmLabel: string;
    onConfirm: () => void;
    onCancel: () => void;
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm"
                onClick={onCancel}
            />
            {/* Sheet on mobile, dialog on desktop */}
            <div className="relative w-full sm:max-w-md
                bg-white dark:bg-slate-800
                rounded-t-2xl sm:rounded-2xl
                shadow-2xl
                border-0 sm:border border-slate-200 dark:border-slate-700
                p-6 pb-8 sm:pb-6">

                <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                        <ExclamationTriangleIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
                    </div>
                    <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">{title}</h3>
                </div>

                <p className="text-sm text-slate-600 dark:text-slate-300 mb-6 pl-[52px]">
                    {message}
                </p>

                <div className="flex gap-2.5 sm:justify-end">
                    <button
                        onClick={onCancel}
                        className="flex-1 sm:flex-none px-4 py-2.5 sm:py-2 text-sm font-medium rounded-xl
                            text-slate-600 bg-slate-100 hover:bg-slate-200
                            dark:text-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600
                            transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className="flex-1 sm:flex-none px-4 py-2.5 sm:py-2 text-sm font-semibold rounded-xl
                            text-white bg-red-600 hover:bg-red-700
                            dark:bg-red-600 dark:hover:bg-red-500
                            transition-colors"
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
