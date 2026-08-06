import { FileItem } from "@/types";
import { User } from "@/types";
import axios from "axios";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";

type Props = {
    file: FileItem;
    handleDelete: (file: FileItem) => void;
    onEdit: (file: FileItem) => void;
    onStatusChange?: (file: FileItem, status: string) => void;
    authUser?: User | null;
    isAdminUser?: boolean;
}

function formatSize(bytes: number | undefined): string {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(date: string | Date | null | undefined): string {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

const STATUS_STYLES: Record<string, string> = {
    published: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400",
    draft: "bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400",
    archived: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
    // matching backend values
    active: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400",
    inactive: "bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400",
};

const STATUSES = [
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
    { value: "archived", label: "Archived" },
];

function isAdmin(user?: User | null): boolean {
    return user?.role === "admin";
}

export default function FileInfo({ file, handleDelete, onEdit, onStatusChange, authUser, isAdminUser }: Props) {
    const [expanded, setExpanded] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [statusMenuOpen, setStatusMenuOpen] = useState(false);
    const [changingStatus, setChangingStatus] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const statusMenuRef = useRef<HTMLDivElement>(null);
    const d = file.details;

    const admin = isAdminUser ?? isAdmin(authUser);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuOpen(false);
            }
            if (statusMenuRef.current && !statusMenuRef.current.contains(e.target as Node)) {
                setStatusMenuOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const statusKey = (d?.status ?? "draft").toLowerCase();
    const statusStyle = STATUS_STYLES[statusKey] ?? STATUS_STYLES.draft;

    async function handleStatusChange(newStatus: string) {
        if (!onStatusChange) return;
        setChangingStatus(true);
        setStatusMenuOpen(false);
        try {
            await onStatusChange(file, newStatus);
        } finally {
            setChangingStatus(false);
        }
    }

    async function handleAdminDownload(e: React.MouseEvent) {
        e.stopPropagation();
        try {
            const response = await axios.get(`/api/file/${file.id}/download`, {
                responseType: 'blob',
            });

            // Use the content-type from the response headers
            const contentType = response.headers['content-type'] || 'application/octet-stream';
            const blob = new Blob([response.data], { type: contentType });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', d?.fileName ?? `file-${file.id}`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch {
            toast.error('Download failed.');
        }
    }

    return (
        <div
            key={d?.id}
            className="group relative flex flex-col bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
        >
            {/* ── Collapsed header (always visible, click to toggle) ── */}
            <button
                onClick={() => setExpanded((prev) => !prev)}
                className="flex items-center gap-3 p-4 w-full text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
                {/* File icon */}
                <div className="shrink-0 w-10 h-10 flex items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/50">
                    <svg className="w-5 h-5 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                </div>

                {/* Name + status */}
                <div className="flex-1 min-w-0">
                    <p
                        className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate leading-tight"
                        title={d?.fileName}
                    >
                        {d?.fileName ?? "Untitled"}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${statusStyle}`}>
                            {d?.status ?? "draft"}
                        </span>
                        <span className="text-[10px] text-gray-400 dark:text-gray-500">
                            {formatSize(d?.size)}
                        </span>
                    </div>
                </div>

                {/* Chevron */}
                <svg
                    className={`shrink-0 w-4 h-4 text-gray-400 dark:text-gray-500 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
                    viewBox="0 0 20 20"
                    fill="currentColor"
                >
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
            </button>

            {/* ── Expanded details ── */}
            <div
                className={`grid transition-all duration-300 ease-in-out ${expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
            >
                <div className="overflow-hidden">
                    {/* Divider */}
                    <div className="mx-4 h-px bg-gray-100 dark:bg-gray-800" />

                    {/* Description */}
                    {d?.description && (
                        <p className="px-4 pt-3 text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                            {d.description}
                        </p>
                    )}

                    {/* Meta grid */}
                    <div className="px-4 py-3 grid grid-cols-2 gap-x-3 gap-y-2.5">
                        <MetaItem
                            icon={
                                <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                </svg>
                            }
                            label="Authors"
                            value={d?.authors ?? "—"}
                        />
                        <MetaItem
                            icon={
                                <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                                </svg>
                            }
                            label="Published"
                            value={formatDate(d?.publication_date)}
                        />
                        <MetaItem
                            icon={
                                <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                                </svg>
                            }
                            label="Location"
                            value={d?.location ?? "—"}
                        />
                        <MetaItem
                            icon={
                                <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                                </svg>
                            }
                            label="Size"
                            value={formatSize(d?.size)}
                        />
                    </div>

                    {/* Stats row */}
                    <div className="mx-4 h-px bg-gray-100 dark:bg-gray-800" />
                    <div className="flex items-center divide-x divide-gray-100 dark:divide-gray-800">
                        <StatItem
                            icon={
                                <svg className="w-3.5 h-3.5 text-indigo-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                </svg>
                            }
                            value={d?.views?.toLocaleString() ?? "0"}
                            label="Views"
                        />
                        <StatItem
                            icon={
                                <svg className="w-3.5 h-3.5 text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            }
                            value={d?.downloads?.toLocaleString() ?? "0"}
                            label="Downloads"
                        />
                    </div>

                    {/* Action buttons */}
                    <div className="mx-4 h-px bg-gray-100 dark:bg-gray-800" />
                    <div className="flex flex-col gap-2 p-3" ref={menuRef}>
                        <div className="flex gap-2">
                            <button
                                onClick={(e) => { e.stopPropagation(); onEdit(file); }}
                                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                            >
                                <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                </svg>
                                Edit
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); handleDelete(file); }}
                                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-red-500 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                            >
                                <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                Delete
                            </button>
                        </div>

                        {/* ── Admin-only: Change Status ── */}
                        {admin && (
                            <div className="relative" ref={statusMenuRef}>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setStatusMenuOpen((prev) => !prev); }}
                                    disabled={changingStatus}
                                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/40 hover:bg-violet-100 dark:hover:bg-violet-900/40 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {changingStatus ? (
                                        <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                                        </svg>
                                    ) : (
                                        <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                                        </svg>
                                    )}
                                    {changingStatus ? "Updating…" : "Change Status"}
                                    {!changingStatus && (
                                        <svg className={`w-3 h-3 ml-auto transition-transform ${statusMenuOpen ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                    )}
                                </button>

                                <button
                                    onClick={handleAdminDownload}
                                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
                                >
                                    <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                    Download
                                </button>

                                {/* Dropdown */}
                                {statusMenuOpen && (
                                    <div className="absolute bottom-full mb-1.5 left-0 right-0 z-20 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl shadow-lg overflow-hidden">
                                        {STATUSES.map((s) => {
                                            const isCurrent = (d?.status ?? "").toLowerCase() === s.value;
                                            return (
                                                <button
                                                    key={s.value}
                                                    onClick={(e) => { e.stopPropagation(); handleStatusChange(s.value); }}
                                                    disabled={isCurrent}
                                                    className={`w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors
                                                        ${isCurrent
                                                            ? "bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-default"
                                                            : "hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 cursor-pointer"
                                                        }`}
                                                >
                                                    <span className={`w-1.5 h-1.5 rounded-full ${s.value === "active" ? "bg-emerald-400" :
                                                        s.value === "inactive" ? "bg-amber-400" :
                                                            "bg-gray-400"
                                                        }`} />
                                                    <span className="capitalize font-medium">{s.label}</span>
                                                    {isCurrent && (
                                                        <svg className="w-3 h-3 ml-auto text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                        </svg>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

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
