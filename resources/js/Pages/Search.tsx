import { useState, useRef, useEffect, useCallback } from "react";

interface FileResult {
    id: number;
    name: string;
    type: string;
    path: string | null;
    details: {
        id: number;
        fileName: string;
        size: number;
        description: string | null;
        authors: string | null;
        publication_date: string | null;
        location: string | null;
        views: number;
        downloads: number;
        status: string;
    } | null;
}

interface SearchResponse {
    data: FileResult[];
    total: number;
    current_page: number;
    last_page: number;
    per_page: number;
}

const HISTORY_KEY = "cbrms_search_history";
const MAX_HISTORY = 8;

function getHistory(): string[] {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); }
    catch { return []; }
}
function addToHistory(q: string) {
    const prev = getHistory().filter(h => h !== q);
    localStorage.setItem(HISTORY_KEY, JSON.stringify([q, ...prev].slice(0, MAX_HISTORY)));
}
function clearHistory() { localStorage.removeItem(HISTORY_KEY); }

function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
function fmtDate(iso: string): string {
    return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}
function highlightText(text: string, query: string): React.ReactNode {
    if (!query.trim()) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    const parts = text.split(regex);
    return parts.map((part, i) =>
        regex.test(part) ? <mark key={i} className="search-highlight">{part}</mark> : part
    );
}

function rankSuggestion(fileName: string, query: string): number {
    const f = fileName.toLowerCase();
    const q = query.toLowerCase().trim();
    if (f === q) return 0;
    if (f.startsWith(q)) return 1;
    const words = f.split(/\s+/);
    if (words.some(w => w.startsWith(q))) return 2;
    return 3;
}
function sortSuggestions(files: FileResult[], query: string): FileResult[] {
    return [...files].sort((a, b) => {
        const fa = (a.details?.fileName || a.name);
        const fb = (b.details?.fileName || b.name);
        return rankSuggestion(fa, query) - rankSuggestion(fb, query);
    });
}

function FileIcon({ size = 13 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
            <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
        </svg>
    );
}

function FileModal({
    file,
    query,
    onClose,
    onDownload,
    downloadingId,
}: {
    file: FileResult;
    query: string;
    onClose: () => void;
    onDownload: (file: FileResult) => void;
    downloadingId: number | null;
}) {
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        document.addEventListener("keydown", handler);
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", handler);
            document.body.style.overflow = "";
        };
    }, [onClose]);

    const d = file.details;
    const fileName = d?.fileName || file.name;
    const isDownloading = downloadingId === file.id;

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-box" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, minWidth: 0, flex: 1 }}>
                        <div className="modal-file-ico">
                            <FileIcon size={20} />
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                            <span className="badge b-file"><FileIcon size={10} /> file</span>
                            <h2 className="modal-title">{highlightText(fileName, query)}</h2>
                        </div>
                    </div>
                    <button className="modal-close" onClick={onClose} aria-label="Close">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                        </svg>
                    </button>
                </div>

                <div className="modal-body">
                    <div className="modal-stats">
                        {!!d?.size && (
                            <div className="mstat">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                                </svg>
                                <span>{formatSize(d.size)}</span>
                                <span className="mstat-label">Size</span>
                            </div>
                        )}
                        <div className="mstat s-views">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                            </svg>
                            <span>{(d?.views ?? 0).toLocaleString()}</span>
                            <span className="mstat-label">Views</span>
                        </div>
                        <div className="mstat s-dls">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                            <span>{(d?.downloads ?? 0).toLocaleString()}</span>
                            <span className="mstat-label">Downloads</span>
                        </div>
                    </div>

                    <div className="modal-details">
                        {d?.publication_date && (
                            <div className="detail-row">
                                <span className="detail-label">
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="3" y="4" width="18" height="18" rx="2" />
                                        <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                                    </svg>
                                    Published
                                </span>
                                <span className="detail-val">{fmtDate(d.publication_date)}</span>
                            </div>
                        )}
                        {d?.authors && (
                            <div className="detail-row">
                                <span className="detail-label">
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                                    </svg>
                                    Authors
                                </span>
                                <span className="detail-val">{highlightText(d.authors, query)}</span>
                            </div>
                        )}
                        {d?.location && (
                            <div className="detail-row">
                                <span className="detail-label">
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                                    </svg>
                                    Location
                                </span>
                                <span className="detail-val">{highlightText(d.location, query)}</span>
                            </div>
                        )}
                    </div>

                    {d?.description && (
                        <div className="modal-section">
                            <div className="modal-section-label">Description</div>
                            <p className="modal-desc">{highlightText(d.description, query)}</p>
                        </div>
                    )}
                </div>

                <div className="modal-footer">
                    <button className="btn btn-ghost" onClick={onClose}>Close</button>
                    <button
                        className="btn btn-primary"
                        onClick={() => onDownload(file)}
                        disabled={isDownloading}
                        style={{ minWidth: 120, position: "relative" }}
                    >
                        {isDownloading ? (
                            <><span className="btn-spinner" />Downloading…</>
                        ) : (
                            <>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                                </svg>
                                Download
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function Search() {
    const [query, setQuery] = useState("");
    const [inputValue, setInputValue] = useState("");
    const [results, setResults] = useState<FileResult[]>([]);
    const [meta, setMeta] = useState<Omit<SearchResponse, "data"> | null>(null);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [hasSearched, setHasSearched] = useState(false);
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [showHistory, setShowHistory] = useState(false);
    const [history, setHistory] = useState<string[]>([]);
    const [showDateFilter, setShowDateFilter] = useState(false);
    const [modalFile, setModalFile] = useState<FileResult | null>(null);
    const [departments, setDepartments] = useState<{ id: number; name: string }[]>([]);
    const [departmentId, setDepartmentId] = useState<string>("");
    const [suggestions, setSuggestions] = useState<FileResult[]>([]);
    const [suggestLoading, setSuggestLoading] = useState(false);
    const suggestTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [downloadingId, setDownloadingId] = useState<number | null>(null);
    const [showMobileFilters, setShowMobileFilters] = useState(false);

    const inputRef = useRef<HTMLInputElement>(null);
    const historyRef = useRef<HTMLDivElement>(null);
    const datePopRef = useRef<HTMLDivElement>(null);
    // ── NEW: ref for the homepage hero search section ──
    const searchSectionRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setHistory(getHistory());
        setTimeout(() => inputRef.current?.focus(), 80);
        fetch("/api/departments/public")
            .then(r => r.json())
            .then(setDepartments)
            .catch(() => { });
    }, []);

    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (historyRef.current && !historyRef.current.contains(e.target as Node)) {
                setShowHistory(false);
                setSuggestions([]);
            }
            if (datePopRef.current && !datePopRef.current.contains(e.target as Node))
                setShowDateFilter(false);
        }
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    const fetchSuggestions = useCallback((val: string) => {
        if (suggestTimer.current) clearTimeout(suggestTimer.current);
        if (!val.trim() || val.trim().length < 2) {
            setSuggestions([]);
            setSuggestLoading(false);
            return;
        }
        setSuggestLoading(true);
        suggestTimer.current = setTimeout(async () => {
            try {
                const params = new URLSearchParams({ q: val.trim(), per_page: "8", type: "file" });
                const res = await fetch(`/api/search?${params}`);
                if (!res.ok) { setSuggestions([]); setSuggestLoading(false); return; }
                const json: SearchResponse = await res.json();
                const sorted = sortSuggestions(json.data, val.trim()).slice(0, 6);
                setSuggestions(sorted);
            } catch { setSuggestions([]); }
            finally { setSuggestLoading(false); }
        }, 300);
    }, []);

    const doSearch = async (q: string, p: number, df: string, dt: string, deptId: string) => {
        if (!q.trim()) return;
        setLoading(true); setHasSearched(true);
        try {
            const params = new URLSearchParams({ q, page: String(p), per_page: "10", type: "file" });
            if (df) params.append("date_from", df);
            if (dt) params.append("date_to", dt);
            if (deptId) params.append("department_id", deptId);
            const res = await fetch(`/api/search?${params}`);
            if (!res.ok) { setResults([]); setMeta(null); return; }
            const json: SearchResponse = await res.json();
            setResults(json.data);
            setMeta({ total: json.total, current_page: json.current_page, last_page: json.last_page, per_page: json.per_page });
        } catch { setResults([]); setMeta(null); }
        finally { setLoading(false); }
    };

    const handleSubmit = (overrideQuery?: string) => {
        const q = (overrideQuery ?? inputValue).trim();
        if (!q) return;
        setInputValue(q); setQuery(q); setPage(1);
        setShowHistory(false); setSuggestions([]);
        addToHistory(q); setHistory(getHistory());
        doSearch(q, 1, dateFrom, dateTo, departmentId);
    };

    const handleHistorySelect = (h: string) => { setInputValue(h); handleSubmit(h); };
    const handleSuggestionSelect = (file: FileResult) => {
        const name = file.details?.fileName || file.name;
        setInputValue(name); setShowHistory(false); setSuggestions([]);
        addToHistory(name); setHistory(getHistory()); handleSubmit(name);
    };
    const handleClearHistory = (e: React.MouseEvent) => { e.stopPropagation(); clearHistory(); setHistory([]); setShowHistory(false); };
    const handlePageChange = (p: number) => { setPage(p); doSearch(query, p, dateFrom, dateTo, departmentId); window.scrollTo({ top: 0, behavior: "smooth" }); };
    const handleReset = () => {
        setHasSearched(false); setInputValue(""); setQuery(""); setResults([]);
        setMeta(null); setDateFrom(""); setDateTo(""); setDepartmentId(""); setSuggestions([]);
        setTimeout(() => inputRef.current?.focus(), 80);
    };
    const handleApplyDate = () => {
        if (!query) return;
        setPage(1); setShowDateFilter(false); setShowMobileFilters(false);
        doSearch(query, 1, dateFrom, dateTo, departmentId);
    };
    const handleClearDates = () => {
        setDateFrom(""); setDateTo("");
        if (query) { setPage(1); doSearch(query, 1, "", "", departmentId); }
        setShowDateFilter(false);
    };
    const handleDeptChange = (val: string) => {
        setDepartmentId(val);
        if (query) { setPage(1); doSearch(query, 1, dateFrom, dateTo, val); }
    };

    const handleOpenModal = useCallback((file: FileResult) => {
        setModalFile(file);
        fetch(`/api/files/${file.id}/view`, { method: "POST" }).catch(() => { });
        setResults(prev => prev.map(r =>
            r.id === file.id && r.details ? { ...r, details: { ...r.details, views: r.details.views + 1 } } : r
        ));
    }, []);

    const handleCloseModal = useCallback(() => setModalFile(null), []);

    const handleDownload = async (file: FileResult) => {
        if (downloadingId !== null) return;
        setDownloadingId(file.id);
        try {
            const res = await fetch(`/api/files/${file.id}/download`);
            if (!res.ok) { alert("Download failed."); return; }
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url; a.download = file.details?.fileName || file.name;
            document.body.appendChild(a); a.click(); a.remove();
            URL.revokeObjectURL(url);
            setResults(prev => prev.map(r =>
                r.id === file.id && r.details ? { ...r, details: { ...r.details, downloads: r.details.downloads + 1 } } : r
            ));
            setModalFile(prev =>
                prev?.id === file.id && prev.details ? { ...prev, details: { ...prev.details, downloads: prev.details.downloads + 1 } } : prev
            );
        } catch { alert("Download failed."); }
        finally { setDownloadingId(null); }
    };

    const isHomepage = !hasSearched;
    const hasActiveDateFilter = !!(dateFrom || dateTo);
    const hasActiveDeptFilter = !!departmentId;
    const showDropdown = showHistory && (history.length > 0 || suggestions.length > 0 || suggestLoading);

    const paginationPages = (): (number | "...")[] => {
        if (!meta) return [];
        const { last_page: total, current_page: cur } = meta;
        if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
        if (cur <= 4) return [1, 2, 3, 4, 5, "...", total];
        if (cur >= total - 3) return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
        return [1, "...", cur - 1, cur, cur + 1, "...", total];
    };

    // ── Scroll homepage search section to viewport center on focus ──
    // Why not scrollIntoView? The homepage uses flex centering so the element is
    // already "in view" — scrollIntoView sees nothing to do. Instead we compute
    // the gap between the element's midpoint and the viewport midpoint ourselves,
    // then call window.scrollBy. requestAnimationFrame lets the mobile keyboard
    // open and reflow first so our measurement is accurate.
    const handleHomepageInputFocus = useCallback(() => {
        if (!isHomepage || !searchSectionRef.current) return;
        requestAnimationFrame(() => {
            if (!searchSectionRef.current) return;
            const rect = searchSectionRef.current.getBoundingClientRect();
            const elMidY = rect.top + rect.height / 2;
            // Target: a bit above true center so the logo is visible above the input
            const targetMidY = window.innerHeight * 0.45;
            const delta = elMidY - targetMidY;
            if (Math.abs(delta) > 8) {
                window.scrollBy({ top: delta, behavior: "smooth" });
            }
        });
    }, [isHomepage]);

    const renderInput = (big: boolean) => (
        // FIX: zIndex raised to 60 so dropdown beats the fixed footer (z-50).
        // Removed isolation:"isolate" — it was creating a stacking context at z-10 that
        // lost to the footer. Now the container itself is above the footer.
        <div style={{ position: "relative", width: "100%", zIndex: 60 }} ref={historyRef}>
            <div className="s-wrap">
                <span className="s-ico">
                    <svg width={big ? 19 : 16} height={big ? 19 : 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
                    </svg>
                </span>
                <input
                    ref={inputRef}
                    className={`s-in${big ? " s-in-big" : ""}`}
                    placeholder="Search files, authors, descriptions…"
                    value={inputValue}
                    onChange={e => {
                        setInputValue(e.target.value);
                        fetchSuggestions(e.target.value);
                        setShowHistory(true);
                    }}
                    onFocus={() => {
                        setShowHistory(true);
                        if (inputValue.trim().length >= 2) fetchSuggestions(inputValue);
                        // ── NEW: scroll to center on homepage ──
                        handleHomepageInputFocus();
                    }}
                    onKeyDown={e => {
                        if (e.key === "Enter") handleSubmit();
                        if (e.key === "Escape") { setShowHistory(false); setSuggestions([]); }
                    }}
                    autoComplete="off"
                />
                {inputValue && (
                    <button type="button" className="s-clr"
                        onClick={() => { setInputValue(""); setShowHistory(false); setSuggestions([]); inputRef.current?.focus(); }}>
                        <svg width={13} height={13} viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                        </svg>
                    </button>
                )}
            </div>

            {showDropdown && (
                <div className="history-drop">
                    {(suggestLoading || suggestions.length > 0) && (
                        <div>
                            <div className="drop-section-hd">
                                <FileIcon size={11} />
                                Files
                                {suggestLoading && <span className="suggest-spin" />}
                            </div>
                            {suggestions.map(file => {
                                const fname = file.details?.fileName || file.name;
                                const rank = rankSuggestion(fname, inputValue);
                                const isExact = rank === 0;
                                const isPrefix = rank === 1;
                                return (
                                    <button key={file.id} className={`hist-item suggest-item${isExact ? " suggest-exact" : ""}`} onClick={() => handleSuggestionSelect(file)}>
                                        <span className={`suggest-ico${isExact ? " suggest-ico-exact" : ""}`}>
                                            {isExact
                                                ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                                                : <FileIcon size={12} />}
                                        </span>
                                        <span className="suggest-name">{highlightText(fname, inputValue)}</span>
                                        {isExact && <span className="suggest-exact-badge">Exact</span>}
                                        {!isExact && isPrefix && <span className="suggest-prefix-badge">Best</span>}
                                        {!isExact && !isPrefix && file.details?.authors && (
                                            <span className="suggest-meta">{file.details.authors}</span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                    {history.length > 0 && (
                        <div>
                            {suggestions.length > 0 && <div className="drop-divider" />}
                            <div className="drop-section-hd" style={{ justifyContent: "space-between" }}>
                                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polyline points="12 8 12 12 14 14" /><path d="M3.05 11A9 9 0 1 0 5.7 5.7" /><polyline points="3 3 3 7 7 7" />
                                    </svg>
                                    Recent
                                </span>
                                <button className="clr-all-btn" onClick={handleClearHistory}>Clear all</button>
                            </div>
                            {history.map((h, i) => (
                                <button key={i} className="hist-item" onClick={() => handleHistorySelect(h)}>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: .5, flexShrink: 0 }}>
                                        <polyline points="12 8 12 12 14 14" /><path d="M3.05 11A9 9 0 1 0 5.7 5.7" /><polyline points="3 3 3 7 7 7" />
                                    </svg>
                                    <span style={{ flex: 1, textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );

    const renderDeptSelect = (fullWidth = false) => (
        <select
            value={departmentId}
            onChange={e => handleDeptChange(e.target.value)}
            className={`dept-select${hasActiveDeptFilter ? " dept-active" : ""}${fullWidth ? " dept-full" : ""}`}
        >
            <option value="">All Departments</option>
            {departments.map(d => <option key={d.id} value={String(d.id)}>{d.name}</option>)}
        </select>
    );

    const renderDatePop = () => (
        <div ref={datePopRef} style={{ position: "relative", flexShrink: 0 }}>
            <button
                className={`btn btn-ghost${hasActiveDateFilter ? " active-filter" : ""}`}
                style={{ padding: "7px 13px", fontSize: 12.5, gap: 5, height: 36 }}
                onClick={() => setShowDateFilter(v => !v)}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                Date{hasActiveDateFilter ? " ●" : ""}
            </button>
            {showDateFilter && (
                <div className="date-pop">
                    <div style={{ marginBottom: 12 }}>
                        <div className="date-label">From</div>
                        <input type="date" className="date-in" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                    </div>
                    <div style={{ marginBottom: 14 }}>
                        <div className="date-label">To</div>
                        <input type="date" className="date-in" value={dateTo} onChange={e => setDateTo(e.target.value)} />
                    </div>
                    <div style={{ display: "flex", gap: 7 }}>
                        <button className="btn btn-primary" style={{ flex: 1, padding: "7px 0", fontSize: 12.5 }} onClick={handleApplyDate}>Apply</button>
                        <button className="btn btn-ghost" style={{ flex: 1, padding: "7px 0", fontSize: 12.5 }} onClick={handleClearDates}>Clear</button>
                    </div>
                </div>
            )}
        </div>
    );

    const renderMobileFilters = () => (
        <>
            {showMobileFilters && <div className="mobile-filter-backdrop" onClick={() => setShowMobileFilters(false)} />}
            <div className={`mobile-filter-drawer${showMobileFilters ? " open" : ""}`}>
                <div className="mfd-handle" />
                <div className="mfd-title">Filters</div>
                <div className="mfd-section">
                    <div className="date-label">Department</div>
                    {renderDeptSelect(true)}
                </div>
                <div className="mfd-section">
                    <div className="date-label">Date From</div>
                    <input type="date" className="date-in" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                </div>
                <div className="mfd-section">
                    <div className="date-label">Date To</div>
                    <input type="date" className="date-in" value={dateTo} onChange={e => setDateTo(e.target.value)} />
                </div>
                <div style={{ display: "flex", gap: 8, padding: "16px 16px calc(16px + env(safe-area-inset-bottom,0px))" }}>
                    <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleApplyDate}>Apply Filters</button>
                    <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => { handleClearDates(); setShowMobileFilters(false); }}>Clear</button>
                </div>
            </div>
        </>
    );

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&family=DM+Serif+Display&display=swap');
                @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@800&display=swap');
                @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&family=DM+Serif+Display&family=Fredoka+One&display=swap');
                *, *::before, *::after { box-sizing: border-box; }

                .sp {
                    font-family: 'DM Sans', sans-serif;
                    min-height: calc(100vh - 64px);
                    padding-top: 64px;
                    --accent: #4f46e5; --accent-h: #4338ca; --accent-glow: rgba(79,70,229,0.22);
                    --bg: #f5f6fa; --bg-card: #ffffff; --bg-hover: #eef0f7;
                    --border: #e5e7eb; --border-in: #d1d5db;
                    --txt: #111827; --txt-2: #6b7280; --txt-3: #9ca3af; --txt-link: #4338ca;
                    --hl-bg: #fef08a; --hl-txt: #713f12;
                    --badge-file-bg: #eef2ff; --badge-file-txt: #3730a3;
                    --badge-act-bg: #d1fae5; --badge-act-txt: #065f46;
                    --badge-arch-bg: #f3f4f6; --badge-arch-txt: #6b7280;
                    --spin-track: #e5e7eb; --spin-fill: #4f46e5;
                    --shadow-sm: 0 1px 3px rgba(0,0,0,.06), 0 1px 2px rgba(0,0,0,.04);
                    --shadow-md: 0 4px 16px rgba(0,0,0,.08);
                    --shadow-lg: 0 20px 60px rgba(0,0,0,.15), 0 8px 24px rgba(0,0,0,.08);
                    background: var(--bg); color: var(--txt);
                }
                .dark .sp {
                    --accent: #6366f1; --accent-h: #818cf8; --accent-glow: rgba(99,102,241,0.3);
                    --bg: #0d0f18; --bg-card: #161929; --bg-hover: #1e2235;
                    --border: #272b42; --border-in: #363b58;
                    --txt: #f1f5f9; --txt-2: #94a3b8; --txt-3: #64748b; --txt-link: #818cf8;
                    --hl-bg: #713f12; --hl-txt: #fef08a;
                    --badge-file-bg: #1e1b4b; --badge-file-txt: #a5b4fc;
                    --badge-act-bg: #052e16; --badge-act-txt: #6ee7b7;
                    --badge-arch-bg: #1f2937; --badge-arch-txt: #9ca3af;
                    --spin-track: #334155; --spin-fill: #818cf8;
                    --shadow-sm: 0 1px 3px rgba(0,0,0,.3); --shadow-md: 0 4px 16px rgba(0,0,0,.4);
                    --shadow-lg: 0 20px 60px rgba(0,0,0,.5), 0 8px 24px rgba(0,0,0,.3);
                    background: var(--bg); color: var(--txt);
                }

                .cbrms-logo {
                    -webkit-text-stroke: 3px rgba(0, 0, 0, 0.55);
                    paint-order: stroke fill;
                }
                .dark .sp .cbrms-logo {
                    -webkit-text-stroke: 3px rgba(0, 0, 0, 0.75);
                    paint-order: stroke fill;
                }

                /* ── Search input ── */
                .s-wrap { position: relative; width: 100%; }
                .s-in {
                    width: 100%; background: var(--bg-card);
                    border: 1.5px solid var(--border-in); border-radius: 12px;
                    padding: 11px 40px 11px 42px;
                    font-size: 14.5px; font-family: 'DM Sans', sans-serif;
                    color: var(--txt); outline: none;
                    transition: border-color .15s, box-shadow .15s;
                    box-shadow: var(--shadow-sm);
                    -webkit-appearance: none;
                }
                .s-in::placeholder { color: var(--txt-3); }
                .s-in:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-glow); }
                .s-in-big { padding: 14px 44px 14px 48px; font-size: 15.5px; border-radius: 14px; }
                .s-ico { position: absolute; left: 13px; top: 50%; transform: translateY(-50%); color: var(--txt-3); pointer-events: none; display: flex; }
                .s-clr {
                    position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
                    background: none; border: none; cursor: pointer; color: var(--txt-3);
                    padding: 5px; border-radius: 6px; display: flex; align-items: center;
                    transition: background .15s, color .15s; min-width: 30px; min-height: 30px; justify-content: center;
                }
                .s-clr:hover { background: var(--bg-hover); color: var(--txt-2); }

                /* ── Dropdown ──
                   FIXED: max-height accounts for fixed footer (~56px mobile, ~48px desktop).
                   The dropdown is inside a z-index:60 container which beats the footer's z-50,
                   but we still limit height so content isn't hidden under the footer chrome.
                */
                .history-drop {
                    position: absolute; top: calc(100% + 6px); left: 0; right: 0;
                    background: var(--bg-card); border: 1.5px solid var(--border);
                    border-radius: 12px; box-shadow: var(--shadow-md);
                    z-index: 200; overflow: hidden; animation: fadeDown .12s ease both;
                    /* Desktop: leave room for 48px footer + 16px breathing room */
                    max-height: calc(100svh - 64px - 48px - 80px);
                    overflow-y: auto;
                    width: 100%;
                }
                @keyframes fadeDown { from { opacity:0; transform:translateY(-4px); } to { opacity:1; transform:translateY(0); } }
                .drop-section-hd {
                    display: flex; align-items: center; gap: 5px;
                    padding: 8px 12px 5px; font-size: 11px; font-weight: 700;
                    color: var(--txt-3); text-transform: uppercase; letter-spacing: .5px;
                    /* Sticky header so section label stays visible while scrolling */
                    position: sticky; top: 0; background: var(--bg-card); z-index: 1;
                }
                .drop-divider { height: 1px; background: var(--border); margin: 4px 0; }
                .suggest-spin { display: inline-block; width: 10px; height: 10px; border: 1.5px solid var(--spin-track); border-top-color: var(--spin-fill); border-radius: 50%; animation: spin .55s linear infinite; margin-left: 5px; flex-shrink: 0; }
                .suggest-item { display: flex; align-items: center; gap: 8px; }
                .suggest-ico { width: 22px; height: 22px; border-radius: 5px; background: var(--badge-file-bg); color: var(--badge-file-txt); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
                .suggest-name { flex: 1; text-align: left; font-size: 13px; color: var(--txt); font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
                .suggest-meta { font-size: 11px; color: var(--txt-3); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100px; flex-shrink: 0; }
                .suggest-exact { background: linear-gradient(90deg, rgba(79,70,229,.06) 0%, transparent 100%); }
                .suggest-exact:hover { background: linear-gradient(90deg, rgba(79,70,229,.13) 0%, var(--bg-hover) 100%) !important; }
                .suggest-ico-exact { background: var(--accent) !important; color: #fff !important; }
                .suggest-exact-badge { font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; letter-spacing: .4px; text-transform: uppercase; background: var(--accent); color: #fff; flex-shrink: 0; }
                .suggest-prefix-badge { font-size: 10px; font-weight: 600; padding: 2px 5px; border-radius: 4px; background: var(--badge-file-bg); color: var(--badge-file-txt); flex-shrink: 0; border: 1px solid rgba(79,70,229,.2); }
                .hist-item { display: flex; align-items: center; gap: 8px; width: 100%; padding: 10px 12px; background: none; border: none; cursor: pointer; font-size: 13.5px; color: var(--txt-2); font-family: 'DM Sans', sans-serif; transition: background .1s; min-height: 44px; }
                .hist-item:hover { background: var(--bg-hover); color: var(--txt); }
                .clr-all-btn { font-size: 11px; color: var(--txt-3); background: none; border: none; cursor: pointer; padding: 4px 6px; font-family: 'DM Sans', sans-serif; min-height: 30px; }
                .clr-all-btn:hover { color: var(--txt); }

                /* ── Buttons ── */
                .btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 9px 18px; border-radius: 9px; font-size: 13.5px; font-weight: 600; font-family: 'DM Sans', sans-serif; cursor: pointer; transition: all .15s; border: 1.5px solid transparent; min-height: 36px; }
                .btn:disabled { opacity: .7; cursor: not-allowed; }
                .btn-primary { background: var(--accent); color: #fff; border-color: var(--accent); box-shadow: 0 4px 14px var(--accent-glow); }
                .btn-primary:hover:not(:disabled) { background: var(--accent-h); border-color: var(--accent-h); transform: translateY(-1px); }
                .btn-ghost { background: var(--bg-card); color: var(--txt-2); border-color: var(--border); box-shadow: var(--shadow-sm); }
                .btn-ghost:hover { background: var(--bg-hover); color: var(--txt); }
                .btn-ghost.active-filter { border-color: var(--accent); color: var(--accent); }
                .btn-spinner { width: 13px; height: 13px; border: 2px solid rgba(255,255,255,.35); border-top-color: #fff; border-radius: 50%; animation: spin .55s linear infinite; flex-shrink: 0; }

                /* ── Department select ── */
                .dept-select {
                    appearance: none; -webkit-appearance: none;
                    padding: 7px 30px 7px 10px; border-radius: 9px;
                    border: 1.5px solid var(--border-in);
                    background: var(--bg-card); color: var(--txt-2);
                    font-size: 12.5px; font-family: 'DM Sans', sans-serif;
                    cursor: pointer; outline: none; box-shadow: var(--shadow-sm);
                    background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%239ca3af' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E");
                    background-repeat: no-repeat; background-position: right 9px center;
                    transition: border-color .15s; min-width: 155px; flex-shrink: 0; height: 36px;
                }
                .dept-select:focus { border-color: var(--accent); }
                .dept-select.dept-active { border-color: var(--accent); color: var(--accent); }
                .dept-select.dept-full { width: 100%; min-width: 0; height: 42px; font-size: 14px; }

                /* ── Date popover ── */
                .date-pop { position: absolute; top: calc(100% + 6px); right: 0; background: var(--bg-card); border: 1.5px solid var(--border); border-radius: 12px; box-shadow: var(--shadow-md); z-index: 100; padding: 16px; width: 260px; animation: fadeDown .12s ease both; }
                .date-label { font-size: 11.5px; font-weight: 600; color: var(--txt-3); text-transform: uppercase; letter-spacing: .5px; margin-bottom: 5px; }
                .date-in { width: 100%; padding: 8px 10px; border-radius: 8px; border: 1.5px solid var(--border-in); background: var(--bg); color: var(--txt); font-size: 13px; font-family: 'DM Sans', sans-serif; outline: none; transition: border-color .15s; -webkit-appearance: none; }
                .date-in:focus { border-color: var(--accent); }

                /* ── Top bar ── */
                .top-search { position: fixed; top: 64px; left: 0; right: 0; z-index: 55; border-bottom: 1.5px solid var(--border); background: var(--bg-card); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); }
                .top-inner { max-width: 960px; margin: 0 auto; padding: 10px 20px; display: flex; align-items: center; gap: 10px; }
                .mlogo { font-family: 'DM Serif Display', serif; font-size: 21px; letter-spacing: -.5px; cursor: pointer; user-select: none; display: flex; align-items: center; flex-shrink: 0; line-height: 1; }

                /* ── Desktop filters ── */
                .desktop-filters { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }

                /* ── Mobile filter button ── */
                .mobile-filter-btn { display: none; align-items: center; gap: 5px; padding: 0 12px; border-radius: 9px; font-size: 12.5px; font-weight: 600; font-family: 'DM Sans', sans-serif; cursor: pointer; border: 1.5px solid var(--border-in); background: var(--bg-card); color: var(--txt-2); box-shadow: var(--shadow-sm); flex-shrink: 0; white-space: nowrap; height: 36px; min-height: 36px; }
                .mobile-filter-btn.has-filter { border-color: var(--accent); color: var(--accent); }

                /* ── Mobile filter drawer ── */
                .mobile-filter-backdrop { position: fixed; inset: 0; z-index: 80; background: rgba(0,0,0,.4); }
                .mobile-filter-drawer { position: fixed; bottom: 0; left: 0; right: 0; z-index: 90; background: var(--bg-card); border-top: 1.5px solid var(--border); border-radius: 18px 18px 0 0; transform: translateY(100%); transition: transform .3s cubic-bezier(.32,.72,0,1); box-shadow: 0 -8px 40px rgba(0,0,0,.15); }
                .mobile-filter-drawer.open { transform: translateY(0); }
                .mfd-handle { width: 36px; height: 4px; background: var(--border); border-radius: 2px; margin: 12px auto 8px; }
                .mfd-title { font-family: 'DM Serif Display', serif; font-size: 18px; padding: 0 16px 12px; border-bottom: 1px solid var(--border); }
                .mfd-section { padding: 12px 16px 0; }

                /* ── Result cards ── */
                .rcard { background: var(--bg-card); border: 1.5px solid var(--border); border-radius: 14px; padding: 16px 18px; box-shadow: var(--shadow-sm); transition: border-color .15s, box-shadow .15s, transform .15s; animation: fadeUp .2s ease both; cursor: pointer; }
                .rcard:hover { border-color: var(--accent); box-shadow: 0 4px 20px var(--accent-glow); transform: translateY(-1px); }
                .rcard:active { transform: translateY(0); }
                @keyframes fadeUp { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
                .rtitle { font-family: 'DM Serif Display', serif; font-size: 17px; color: var(--txt-link); line-height: 1.3; display: block; pointer-events: none; word-break: break-word; }
                .badge { display: inline-flex; align-items: center; gap: 3px; font-size: 10.5px; font-weight: 700; padding: 2px 7px; border-radius: 5px; letter-spacing: .4px; text-transform: uppercase; }
                .b-file { background: var(--badge-file-bg); color: var(--badge-file-txt); }
                .search-highlight { background: var(--hl-bg); color: var(--hl-txt); border-radius: 3px; padding: 0 2px; font-weight: 600; }

                /* ── Stats ── */
                .stats-row { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 9px; align-items: center; }
                .stat-pill { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 500; padding: 3px 9px; border-radius: 20px; border: 1px solid var(--border); color: var(--txt-2); background: var(--bg); white-space: nowrap; }
                .stat-pill.s-views { border-color: #bfdbfe; color: #1d4ed8; background: #eff6ff; }
                .dark .sp .stat-pill.s-views { border-color: #1e3a5f; color: #93c5fd; background: #0f1e35; }
                .stat-pill.s-dls { border-color: #bbf7d0; color: #15803d; background: #f0fdf4; }
                .dark .sp .stat-pill.s-dls { border-color: #14532d; color: #86efac; background: #052e16; }
                .meta-row { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--border); align-items: center; }
                .meta-item { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; color: var(--txt-3); }
                .pub-date { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 600; color: var(--accent); background: var(--badge-file-bg); padding: 3px 9px; border-radius: 6px; }
                .view-hint { font-size: 11px; color: var(--txt-3); display: flex; align-items: center; gap: 4px; margin-top: 6px; }

                /* ── Card download button ── */
                .card-dl-btn { display: inline-flex; align-items: center; gap: 5px; padding: 6px 11px; border-radius: 8px; font-size: 12px; font-weight: 600; border: 1.5px solid var(--border); background: var(--bg-card); color: var(--txt-2); cursor: pointer; font-family: 'DM Sans', sans-serif; transition: all .15s; flex-shrink: 0; min-height: 34px; }
                .card-dl-btn:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); }
                .card-dl-btn:disabled { opacity: .65; cursor: not-allowed; }

                /* ── Filter tags ── */
                .filter-tags { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
                .filter-tag { display: inline-flex; align-items: center; gap: 4px; font-size: 11.5px; color: var(--accent); background: var(--badge-file-bg); border: 1px solid var(--accent); border-radius: 6px; padding: 2px 8px; }
                .filter-tag button { background: none; border: none; cursor: pointer; color: var(--accent); padding: 0 0 0 3px; font-size: 13px; line-height: 1; min-height: 20px; }

                /* ── Misc ── */
                .spinner { width: 22px; height: 22px; border: 2.5px solid var(--spin-track); border-top-color: var(--spin-fill); border-radius: 50%; animation: spin .65s linear infinite; }
                @keyframes spin { to { transform: rotate(360deg); } }
                .pgbtn { min-width: 36px; height: 36px; display: inline-flex; align-items: center; justify-content: center; border-radius: 8px; font-size: 13px; font-weight: 500; font-family: 'DM Sans', sans-serif; cursor: pointer; border: 1.5px solid var(--border); background: var(--bg-card); color: var(--txt-2); transition: all .15s; padding: 0 8px; }
                .pgbtn:hover:not(.active):not(:disabled) { background: var(--bg-hover); color: var(--txt); }
                .pgbtn.active { background: var(--accent); color: #fff; border-color: var(--accent); font-weight: 700; }
                .pgbtn:disabled { opacity: .3; cursor: not-allowed; }
                .hero-logo { font-family: 'DM Serif Display', serif; font-size: clamp(44px, 12vw, 80px); letter-spacing: -2.5px; line-height: 1; user-select: none; }
                .hist-pill { background: var(--bg-card); border: 1.5px solid var(--border); border-radius: 20px; padding: 6px 12px; font-size: 12.5px; color: var(--txt-2); cursor: pointer; font-family: 'DM Sans', sans-serif; transition: all .15s; display: flex; align-items: center; gap: 5px; min-height: 34px; }
                .hist-pill:hover { border-color: var(--accent); color: var(--accent); }
                .results-meta-bar { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; margin-bottom: 18px; }

                /* ── Modal ── */
                .modal-backdrop { position: fixed; inset: 0; z-index: 200; background: rgba(0,0,0,.45); backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px); display: flex; align-items: flex-end; justify-content: center; padding: 0; animation: fadeIn .15s ease both; }
                @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
                .modal-box { background: var(--bg-card); border: 1.5px solid var(--border); border-radius: 18px 18px 0 0; box-shadow: var(--shadow-lg); width: 100%; max-width: 100%; max-height: 92vh; display: flex; flex-direction: column; animation: slideUpModal .2s ease both; }
                @keyframes slideUpModal { from { opacity:0; transform:translateY(30px); } to { opacity:1; transform:translateY(0); } }
                .modal-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding: 16px 16px 14px; border-bottom: 1.5px solid var(--border); flex-shrink: 0; }
                .modal-file-ico { width: 40px; height: 40px; border-radius: 10px; background: var(--badge-file-bg); color: var(--badge-file-txt); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
                .modal-title { font-family: 'DM Serif Display', serif; font-size: 16px; line-height: 1.3; color: var(--txt); margin: 5px 0 0; word-break: break-word; }
                .modal-close { background: none; border: none; cursor: pointer; color: var(--txt-3); padding: 6px; border-radius: 8px; display: flex; flex-shrink: 0; transition: background .15s, color .15s; min-width: 36px; min-height: 36px; align-items: center; justify-content: center; }
                .modal-close:hover { background: var(--bg-hover); color: var(--txt); }
                .modal-body { padding: 16px; overflow-y: auto; flex: 1; -webkit-overflow-scrolling: touch; }
                .modal-stats { display: flex; gap: 0; background: var(--bg); border: 1.5px solid var(--border); border-radius: 12px; overflow: hidden; margin-bottom: 16px; }
                .mstat { flex: 1; display: flex; flex-direction: column; align-items: center; padding: 12px 6px; gap: 3px; border-right: 1px solid var(--border); font-size: 13px; color: var(--txt-2); }
                .mstat:last-child { border-right: none; }
                .mstat span:first-of-type { font-size: 17px; font-weight: 700; color: var(--txt); line-height: 1; }
                .mstat-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: .5px; color: var(--txt-3); }
                .mstat.s-views span:first-of-type { color: #1d4ed8; }
                .dark .sp .mstat.s-views span:first-of-type { color: #93c5fd; }
                .mstat.s-dls span:first-of-type { color: #15803d; }
                .dark .sp .mstat.s-dls span:first-of-type { color: #86efac; }
                .modal-details { display: flex; flex-direction: column; margin-bottom: 16px; border: 1.5px solid var(--border); border-radius: 12px; overflow: hidden; }
                .detail-row { display: flex; align-items: flex-start; gap: 10px; padding: 10px 12px; border-bottom: 1px solid var(--border); }
                .detail-row:last-child { border-bottom: none; }
                .detail-label { display: flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 600; color: var(--txt-3); text-transform: uppercase; letter-spacing: .4px; white-space: nowrap; min-width: 80px; padding-top: 2px; }
                .detail-val { font-size: 13px; color: var(--txt-2); line-height: 1.5; }
                .modal-section { margin-bottom: 4px; }
                .modal-section-label { font-size: 11px; font-weight: 700; color: var(--txt-3); text-transform: uppercase; letter-spacing: .5px; margin-bottom: 8px; }
                .modal-desc { font-size: 13px; color: var(--txt-2); line-height: 1.7; background: var(--bg); border: 1.5px solid var(--border); border-radius: 10px; padding: 12px; margin: 0; }
                .modal-footer { display: flex; align-items: center; gap: 8px; padding: 12px 16px calc(12px + env(safe-area-inset-bottom, 0px)); border-top: 1.5px solid var(--border); flex-shrink: 0; }
                .modal-footer .btn { flex: 1; }

                /* ── Tablet ── */
                @media (min-width: 640px) {
                    .modal-backdrop { align-items: center; padding: 16px; }
                    .modal-box { border-radius: 18px; max-width: 620px; max-height: 90vh; }
                    .modal-title { font-size: 18px; }
                    .modal-header { padding: 20px 20px 16px; }
                    .modal-body { padding: 20px; }
                    .modal-footer { padding: 14px 20px; }
                    .modal-footer .btn { flex: 0 0 auto; min-width: 100px; }
                    .modal-footer { justify-content: flex-end; }
                }

                /* ── Desktop filters show, mobile hide ── */
                @media (min-width: 769px) {
                    .mobile-filter-btn { display: none !important; }
                }
                @media (max-width: 768px) {
                    .desktop-filters { display: none !important; }
                    .mobile-filter-btn { display: flex !important; }
                    .top-inner { padding: 8px 12px; gap: 8px; }
                    .mlogo { font-size: 18px; }

                    /* FIXED: Mobile dropdown — taller touch targets + footer-safe max-height.
                       Footer on mobile is ~56px tall. We subtract header(64) + footer(56) + the
                       input's own rough height(52) + gap(6) + breathing(16) = ~194px.
                       Using 100svh (small viewport height) avoids the browser-chrome shift bug. */
                    .history-drop {
                        max-height: calc(100svh - 64px - 56px - 52px - 16px);
                        border-radius: 10px;
                        z-index: 300;
                        left: 0;
                        right: 0;
                        width: 100%;
                    }
                    /* Larger touch targets on mobile */
                    .hist-item {
                        min-height: 52px;
                        padding: 13px 14px;
                        font-size: 14px;
                    }
                    .suggest-name {
                        font-size: 14px;
                    }
                    .suggest-ico {
                        width: 28px;
                        height: 28px;
                        border-radius: 7px;
                    }
                    .suggest-meta {
                        display: none;
                    }
                    .drop-section-hd {
                        padding: 10px 14px 6px;
                        font-size: 11.5px;
                        position: sticky;
                        top: 0;
                        background: var(--bg-card);
                        z-index: 1;
                    }
                    .clr-all-btn {
                        min-height: 36px;
                        padding: 4px 10px;
                        font-size: 12px;
                    }
                    .suggest-exact-badge,
                    .suggest-prefix-badge {
                        font-size: 10px;
                    }
                    .drop-divider {
                        margin: 2px 0;
                    }
                }

                /* ── Small mobile ── */
                @media (max-width: 480px) {
                    .s-in { font-size: 14px; }
                    .s-in-big { font-size: 15px; padding: 13px 42px 13px 44px; }
                    .rcard { padding: 12px 13px; border-radius: 12px; }
                    .rtitle { font-size: 15px; }
                    .results-body-inner { padding: 16px 12px 100px !important; }
                    .stat-pill { font-size: 11px; padding: 2px 7px; }
                    .pub-date { font-size: 11px; padding: 2px 7px; }
                    .view-hint { display: none; }
                    .card-dl-btn span { display: none; }
                    .hero-logo { letter-spacing: -1.5px; }
                    .hist-pill { font-size: 12px; padding: 5px 10px; }
                    .filter-tags { gap: 4px; }
                    .filter-tag { font-size: 10.5px; }
                    .mlogo { font-size: 16px; }
                    .pgbtn { min-width: 34px; height: 34px; font-size: 12px; }
                    .top-inner { padding: 7px 10px; gap: 6px; }
                    .date-pop { right: 0; left: 0; width: auto; }

                    /* Extra small: slightly tighter */
                    .history-drop {
                        max-height: calc(100svh - 64px - 56px - 48px - 12px);
                        border-radius: 8px;
                    }
                    .hist-item {
                        min-height: 50px;
                        padding: 12px 12px;
                    }
                }

                @media (max-width: 360px) {
                    .hero-logo { font-size: clamp(36px, 14vw, 60px); }
                    .s-in-big { padding: 12px 40px 12px 42px; }
                }
            `}</style>

            <div className="sp">
                {!isHomepage && renderMobileFilters()}

                {modalFile && (
                    <FileModal
                        file={modalFile}
                        query={query}
                        onClose={handleCloseModal}
                        onDownload={handleDownload}
                        downloadingId={downloadingId}
                    />
                )}

                {/* ── TOP NAV ── */}
                {!isHomepage && (
                    <div className="top-search">
                        <div className="top-inner">
                            <div className="mlogo" onClick={handleReset}>
                                <span style={{ color: "#4f46e5" }}>C</span><span style={{ color: "#e11d48" }}>B</span>
                                <span style={{ color: "#d97706" }}>R</span><span style={{ color: "#4f46e5" }}>M</span>
                                <span style={{ color: "#059669" }}>S</span>
                            </div>
                            <div style={{ flex: 1, maxWidth: 520, minWidth: 0 }}>{renderInput(false)}</div>
                            <div className="desktop-filters">
                                {renderDeptSelect()}
                                {renderDatePop()}
                            </div>
                            <button
                                className={`mobile-filter-btn${hasActiveDateFilter || hasActiveDeptFilter ? " has-filter" : ""}`}
                                onClick={() => setShowMobileFilters(true)}
                            >
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="4" y1="6" x2="20" y2="6" /><line x1="8" y1="12" x2="16" y2="12" /><line x1="11" y1="18" x2="13" y2="18" />
                                </svg>
                                Filters{(hasActiveDateFilter || hasActiveDeptFilter) ? " ●" : ""}
                            </button>
                        </div>
                    </div>
                )}

                {/* ── HOMEPAGE ── */}
                {isHomepage && (
                    <div style={{
                        display: "flex", flexDirection: "column", alignItems: "center",
                        justifyContent: "flex-start", minHeight: "calc(100vh - 64px)",
                        position: "relative", overflow: "hidden", padding: "40px 0 0"
                    }}>
                        <style>{`
            /* ── Keyframes ── */
            @keyframes hpFadeUp {
                from { opacity: 0; transform: translateY(14px); }
                to   { opacity: 1; transform: translateY(0); }
            }
            @keyframes hpFloat {
                0%, 100% { transform: translateY(0px); }
                50%       { transform: translateY(-10px); }
            }
            @keyframes hpFloatSlow {
                0%, 100% { transform: translateY(0px) rotate(0deg); }
                50%       { transform: translateY(-7px) rotate(1.5deg); }
            }
            @keyframes hpPulse {
                0%, 100% { opacity: .3; }
                50%       { opacity: .9; }
            }
            @keyframes hpDash {
                to { stroke-dashoffset: -40; }
            }
            @keyframes hpSpin {
                from { transform: rotate(0deg); }
                to   { transform: rotate(360deg); }
            }
            @keyframes hpGlow {
                0%, 100% { filter: drop-shadow(0 0 6px var(--accent-glow)); }
                50%       { filter: drop-shadow(0 0 20px var(--accent-glow)); }
            }

            /* ── Animation classes ── */
            .hp-node  { animation: hpPulse 2.4s ease-in-out infinite; }
            .hp-node2 { animation: hpPulse 2.4s  .6s ease-in-out infinite; }
            .hp-node3 { animation: hpPulse 2.4s 1.2s ease-in-out infinite; }
            .hp-node4 { animation: hpPulse 2.4s 1.8s ease-in-out infinite; }
            .hp-line  { animation: hpDash 1.8s         linear infinite; stroke-dasharray: 6 6; }
            .hp-line2 { animation: hpDash 1.8s  .45s   linear infinite; stroke-dasharray: 6 6; }
            .hp-line3 { animation: hpDash 1.8s   .9s   linear infinite; stroke-dasharray: 6 6; }
            .hp-float  { animation: hpFloat     4s        ease-in-out infinite; }
            .hp-float2 { animation: hpFloat     4s  1.1s  ease-in-out infinite; }
            .hp-float3 { animation: hpFloatSlow 5s   .5s  ease-in-out infinite; }
            .hp-glow   { animation: hpGlow 2.8s ease-in-out infinite; }
            .hp-spin   { transform-origin: 340px 144px; animation: hpSpin 14s linear infinite; }

            .hp-svg { overflow: visible; }

            .hp-conn-accent { stroke: var(--accent); opacity: .45; }
            .hp-conn-amber  { stroke: #d97706;       opacity: .5;  }
            .hp-conn-green  { stroke: #059669;        opacity: .5;  }
            .hp-conn-faint  { stroke: var(--accent); opacity: .25; }

            .hp-card-fill   { fill: var(--bg-card); }
            .hp-card-stroke-accent { stroke: var(--accent); }
            .hp-card-stroke-amber  { stroke: #d97706; }
            .hp-card-stroke-green  { stroke: #059669; }
            .hp-card-stroke-border { stroke: var(--border-in); }

            .hp-halo-accent { fill: var(--accent);  opacity: .12; }
            .hp-halo-amber  { fill: #d97706;         opacity: .12; }
            .hp-halo-green  { fill: #059669;          opacity: .12; }
            .hp-halo-rose   { fill: #e11d48;          opacity: .12; }

            .hp-meta-line { stroke: var(--txt-3); stroke-linecap: round; }

            .hp-card-bg { fill: var(--bg-hover); stroke: var(--border-in); }

            .dark .sp .hp-shadow-filter feDropShadow { flood-opacity: .4; }
        `}</style>

                        {/* ── BACKGROUND LAYERS ── */}
                        <div aria-hidden style={{
                            position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none", opacity: .5,
                            backgroundImage: "radial-gradient(circle, var(--border-in) 1px, transparent 1px)",
                            backgroundSize: "30px 30px"
                        }} />
                        <div aria-hidden style={{
                            position: "absolute",
                            width: "min(760px, 120vw)", height: "min(760px, 120vw)",
                            borderRadius: "50%",
                            background: "radial-gradient(circle, var(--accent-glow) 0%, transparent 62%)",
                            pointerEvents: "none", zIndex: 0,
                            top: "50%", left: "50%", transform: "translate(-50%, -52%)"
                        }} />

                        {/* ── SVG ILLUSTRATION ── */}
                        <div style={{
                            position: "relative", zIndex: 1,
                            width: "100%", maxWidth: 700,
                            padding: "0 20px", marginBottom: 4,
                            animation: "hpFadeUp .5s .04s ease both"
                        }}>
                            <svg className="hp-svg" viewBox="0 0 700 270" fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                                style={{ width: "100%", height: "auto" }}>

                                <defs>
                                    <filter id="hp-shadow" className="hp-shadow-filter" x="-30%" y="-30%" width="160%" height="160%">
                                        <feDropShadow dx="0" dy="3" stdDeviation="5" floodColor="var(--accent)" floodOpacity=".12" />
                                    </filter>
                                    <filter id="hp-shadow-sm" x="-20%" y="-20%" width="140%" height="140%">
                                        <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="var(--txt)" floodOpacity=".07" />
                                    </filter>
                                </defs>

                                {/* ── DASHED CONNECTION LINES ── */}
                                <line className="hp-line  hp-conn-accent" x1="218" y1="105" x2="297" y2="129" strokeWidth="1.5" />
                                <line className="hp-line2 hp-conn-accent" x1="482" y1="105" x2="403" y2="129" strokeWidth="1.5" />
                                <line className="hp-line3 hp-conn-amber" x1="303" y1="158" x2="230" y2="196" strokeWidth="1.5" />
                                <line className="hp-line  hp-conn-green" x1="377" y1="158" x2="460" y2="196" strokeWidth="1.5" />
                                <line className="hp-line2 hp-conn-accent" x1="340" y1="162" x2="340" y2="200" strokeWidth="1.5" />
                                <line className="hp-line3 hp-conn-faint" x1="157" y1="118" x2="222" y2="88" strokeWidth="1.2" />
                                <line className="hp-line  hp-conn-green" x1="544" y1="108" x2="480" y2="88" strokeWidth="1.2" opacity=".3" />

                                {/* ── CLOUD (top center) ── */}
                                <g className="hp-float hp-glow">
                                    <path className="hp-card-fill hp-card-stroke-accent"
                                        d="M262 114 Q236 114 234 93 Q234 72 257 70 Q259 53 278 51 Q287 37 308 39 Q319 26 342 28 Q369 22 384 41 Q403 39 411 56 Q432 56 434 75 Q438 96 421 103 Q419 116 398 116 Z"
                                        strokeWidth="2" filter="url(#hp-shadow)" />
                                    <line x1="280" y1="74" x2="316" y2="74" className="hp-card-stroke-accent" strokeWidth="1.5" strokeLinecap="round" opacity=".45" />
                                    <line x1="280" y1="83" x2="330" y2="83" className="hp-card-stroke-accent" strokeWidth="1.5" strokeLinecap="round" opacity=".3" />
                                    <line x1="280" y1="92" x2="305" y2="92" className="hp-card-stroke-accent" strokeWidth="1.5" strokeLinecap="round" opacity=".45" />
                                    <line x1="345" y1="62" x2="385" y2="62" className="hp-card-stroke-accent" strokeWidth="1.5" strokeLinecap="round" opacity=".3" />
                                    <line x1="345" y1="71" x2="400" y2="71" className="hp-card-stroke-accent" strokeWidth="1.5" strokeLinecap="round" opacity=".45" />
                                    <line x1="345" y1="80" x2="378" y2="80" className="hp-card-stroke-accent" strokeWidth="1.5" strokeLinecap="round" opacity=".3" />
                                    <g transform="translate(325,50)">
                                        <path d="M7 14 L7 4 M7 4 L3 8 M7 4 L11 8"
                                            className="hp-card-stroke-accent" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity=".9" />
                                        <path d="M1 17 Q1 14 7 14 Q13 14 13 17"
                                            className="hp-card-stroke-accent" strokeWidth="1.6" strokeLinecap="round" opacity=".5" />
                                    </g>
                                    <circle className="hp-node" cx="340" cy="22" r="4.5" fill="var(--accent)" opacity=".7" />
                                </g>

                                {/* ── DATABASE CYLINDER (center) ── */}
                                <g className="hp-float2">
                                    <ellipse className="hp-spin hp-card-stroke-accent"
                                        cx="340" cy="144" rx="56" ry="56"
                                        fill="none" strokeWidth="1" strokeDasharray="9 14" opacity=".18" />
                                    <ellipse className="hp-card-fill hp-card-stroke-accent"
                                        cx="340" cy="128" rx="46" ry="14" strokeWidth="2" filter="url(#hp-shadow)" />
                                    <rect className="hp-card-fill hp-card-stroke-accent"
                                        x="294" y="128" width="92" height="38" strokeWidth="2" />
                                    <ellipse className="hp-card-fill hp-card-stroke-accent"
                                        cx="340" cy="166" rx="46" ry="14" strokeWidth="2" />
                                    <ellipse className="hp-card-stroke-accent"
                                        cx="340" cy="140" rx="46" ry="14" fill="none" strokeWidth="1" opacity=".25" />
                                    <ellipse className="hp-card-stroke-accent"
                                        cx="340" cy="153" rx="46" ry="14" fill="none" strokeWidth="1" opacity=".25" />
                                    <circle cx="322" cy="147" r="3.5" fill="var(--accent)" opacity=".75" />
                                    <circle cx="335" cy="147" r="3.5" fill="#e11d48" opacity=".75" />
                                    <circle cx="348" cy="147" r="3.5" fill="#059669" opacity=".75" />
                                    <text x="340" y="170" textAnchor="middle" fontSize="8"
                                        fontFamily="DM Sans, sans-serif" fill="var(--txt-3)"
                                        fontWeight="700" letterSpacing=".5" opacity=".6">DATABASE</text>
                                </g>

                                {/* ── DOCUMENT CARD LEFT (amber) ── */}
                                <g className="hp-float">
                                    <rect className="hp-card-fill hp-card-stroke-amber"
                                        x="172" y="193" width="82" height="58" rx="9"
                                        strokeWidth="1.8" filter="url(#hp-shadow-sm)" />
                                    <path className="hp-card-stroke-amber"
                                        d="M234 193 L234 206 L247 206" fill="none" strokeWidth="1.5" strokeLinejoin="round" />
                                    <rect className="hp-card-fill hp-card-stroke-amber"
                                        x="234" y="193" width="20" height="13" strokeWidth="1.5" />
                                    <line x1="184" y1="216" x2="230" y2="216" className="hp-card-stroke-amber hp-meta-line" strokeWidth="1.3" opacity=".5" />
                                    <line x1="184" y1="224" x2="222" y2="224" className="hp-card-stroke-amber hp-meta-line" strokeWidth="1.3" opacity=".38" />
                                    <line x1="184" y1="232" x2="226" y2="232" className="hp-card-stroke-amber hp-meta-line" strokeWidth="1.3" opacity=".5" />
                                    <line x1="184" y1="240" x2="216" y2="240" className="hp-card-stroke-amber hp-meta-line" strokeWidth="1.3" opacity=".3" />
                                    <circle className="hp-node2" cx="213" cy="193" r="4.5" fill="#d97706" opacity=".8" />
                                </g>

                                {/* ── SEARCH CARD BOTTOM (accent) ── */}
                                <g className="hp-float2">
                                    <rect className="hp-card-fill hp-card-stroke-accent"
                                        x="296" y="200" width="88" height="46" rx="10"
                                        strokeWidth="1.8" filter="url(#hp-shadow-sm)" />
                                    <rect className="hp-card-bg"
                                        x="306" y="210" width="68" height="12" rx="6" strokeWidth="1" />
                                    <circle cx="317" cy="216" r="3.5" className="hp-card-stroke-accent" fill="none" strokeWidth="1.5" />
                                    <line x1="319.5" y1="218.5" x2="322" y2="221" className="hp-card-stroke-accent" strokeWidth="1.5" strokeLinecap="round" />
                                    <line x1="325" y1="214" x2="366" y2="214" className="hp-card-stroke-accent" strokeWidth="1.2" strokeLinecap="round" opacity=".4" />
                                    <line x1="325" y1="218" x2="356" y2="218" className="hp-card-stroke-accent" strokeWidth="1.2" strokeLinecap="round" opacity=".28" />
                                    <line x1="308" y1="228" x2="376" y2="228" stroke="var(--border)" strokeWidth="1" />
                                    <line x1="308" y1="234" x2="368" y2="234" className="hp-card-stroke-accent" strokeWidth="1.2" strokeLinecap="round" opacity=".35" />
                                    <line x1="308" y1="239" x2="352" y2="239" className="hp-card-stroke-accent" strokeWidth="1.2" strokeLinecap="round" opacity=".25" />
                                    <circle className="hp-node" cx="340" cy="200" r="4.5" fill="var(--accent)" opacity=".8" />
                                </g>

                                {/* ── DOCUMENT CARD RIGHT (green) ── */}
                                <g className="hp-float3">
                                    <rect className="hp-card-fill hp-card-stroke-green"
                                        x="446" y="193" width="82" height="58" rx="9"
                                        strokeWidth="1.8" filter="url(#hp-shadow-sm)" />
                                    <path className="hp-card-stroke-green"
                                        d="M508 193 L508 206 L521 206" fill="none" strokeWidth="1.5" strokeLinejoin="round" />
                                    <rect className="hp-card-fill hp-card-stroke-green"
                                        x="508" y="193" width="20" height="13" strokeWidth="1.5" />
                                    <line x1="458" y1="216" x2="504" y2="216" className="hp-card-stroke-green hp-meta-line" strokeWidth="1.3" opacity=".5" />
                                    <line x1="458" y1="224" x2="498" y2="224" className="hp-card-stroke-green hp-meta-line" strokeWidth="1.3" opacity=".38" />
                                    <line x1="458" y1="232" x2="502" y2="232" className="hp-card-stroke-green hp-meta-line" strokeWidth="1.3" opacity=".5" />
                                    <line x1="458" y1="240" x2="492" y2="240" className="hp-card-stroke-green hp-meta-line" strokeWidth="1.3" opacity=".3" />
                                    <circle className="hp-node3" cx="467" cy="193" r="4.5" fill="#059669" opacity=".8" />
                                </g>

                                {/* ── FLOATING TAG — LEFT (accent) ── */}
                                <g className="hp-float" filter="url(#hp-shadow-sm)">
                                    <rect className="hp-card-fill hp-card-stroke-border"
                                        x="58" y="104" width="100" height="30" rx="8" strokeWidth="1.5" />
                                    <circle cx="76" cy="119" r="5.5" className="hp-halo-accent" />
                                    <circle cx="76" cy="119" r="2.8" fill="var(--accent)" />
                                    <line x1="88" y1="114" x2="148" y2="114" className="hp-meta-line" strokeWidth="1.2" />
                                    <line x1="88" y1="121" x2="140" y2="121" className="hp-meta-line" strokeWidth="1.2" opacity=".55" />
                                    <line x1="88" y1="128" x2="130" y2="128" className="hp-meta-line" strokeWidth="1.2" opacity=".35" />
                                    <circle className="hp-node4" cx="58" cy="119" r="3.5" fill="var(--accent)" opacity=".4" />
                                </g>

                                {/* ── FLOATING TAG — RIGHT (green) ── */}
                                <g className="hp-float2" filter="url(#hp-shadow-sm)">
                                    <rect className="hp-card-fill hp-card-stroke-border"
                                        x="542" y="96" width="100" height="30" rx="8" strokeWidth="1.5" />
                                    <circle cx="560" cy="111" r="5.5" className="hp-halo-green" />
                                    <circle cx="560" cy="111" r="2.8" fill="#059669" />
                                    <line x1="572" y1="106" x2="630" y2="106" className="hp-meta-line" strokeWidth="1.2" />
                                    <line x1="572" y1="113" x2="626" y2="113" className="hp-meta-line" strokeWidth="1.2" opacity=".55" />
                                    <line x1="572" y1="120" x2="614" y2="120" className="hp-meta-line" strokeWidth="1.2" opacity=".35" />
                                    <circle className="hp-node2" cx="642" cy="111" r="3.5" fill="#059669" opacity=".4" />
                                </g>

                                {/* ── SMALL TAG — TOP RIGHT (rose) ── */}
                                <g className="hp-float3" filter="url(#hp-shadow-sm)">
                                    <rect className="hp-card-fill hp-card-stroke-border"
                                        x="546" y="46" width="86" height="28" rx="7" strokeWidth="1.5" />
                                    <circle cx="562" cy="60" r="5" className="hp-halo-rose" />
                                    <circle cx="562" cy="60" r="2.5" fill="#e11d48" />
                                    <line x1="573" y1="56" x2="622" y2="56" className="hp-meta-line" strokeWidth="1.2" />
                                    <line x1="573" y1="63" x2="615" y2="63" className="hp-meta-line" strokeWidth="1.2" opacity=".5" />
                                </g>

                                {/* ── SMALL TAG — TOP LEFT (amber) ── */}
                                <g className="hp-float" filter="url(#hp-shadow-sm)">
                                    <rect className="hp-card-fill hp-card-stroke-border"
                                        x="68" y="46" width="86" height="28" rx="7" strokeWidth="1.5" />
                                    <circle cx="84" cy="60" r="5" className="hp-halo-amber" />
                                    <circle cx="84" cy="60" r="2.5" fill="#d97706" />
                                    <line x1="95" y1="56" x2="144" y2="56" className="hp-meta-line" strokeWidth="1.2" />
                                    <line x1="95" y1="63" x2="136" y2="63" className="hp-meta-line" strokeWidth="1.2" opacity=".5" />
                                </g>
                            </svg>
                        </div>

                        {/* ── TEXT + SEARCH ──
                            searchSectionRef is attached here so scrollIntoView({block:"center"})
                            centers the logo + tagline + input as a unified group on focus.
                        */}
                        <div
                            ref={searchSectionRef}
                            style={{
                                position: "relative", zIndex: 1, width: "100%",
                                display: "flex", flexDirection: "column", alignItems: "center",
                                padding: "0 16px"
                            }}
                        >
                            <div
                                className="cbrms-logo"
                                style={{
                                    marginBottom: 8,
                                    textAlign: "center",
                                    animation: "hpFadeUp .5s .18s ease both",
                                    fontFamily: "'Fredoka One', cursive",
                                    fontWeight: 400,
                                    fontSize: "clamp(52px, 13vw, 88px)",
                                    letterSpacing: "2px",
                                    lineHeight: 1,
                                    userSelect: "none",
                                    background: "linear-gradient(180deg, #ffffff 0%, #bae6fd 55%, #7dd3fc 100%)",
                                    WebkitBackgroundClip: "text",
                                    WebkitTextFillColor: "transparent",
                                    backgroundClip: "text",
                                    filter: "drop-shadow(0 3px 12px rgba(125,211,252,0.3))",
                                }}
                            >
                                CBRMS
                            </div>{/* Search input */}
                            <div style={{
                                width: "100%", maxWidth: 580,
                                animation: "hpFadeUp .55s .3s ease both",
                                position: "relative",
                                zIndex: 10,
                            }}>
                                {renderInput(true)}
                            </div>
                            {/* Tagline */}<br></br>
                            <p style={{
                                color: "var(--txt-2)", fontSize: 14.5, marginBottom: 30,
                                textAlign: "center", maxWidth: 430, lineHeight: 1.7,
                                animation: "hpFadeUp .5s .24s ease both"
                            }}>
                                A Cloud Based Research Management System — search, discover, and download institutional research files.
                            </p>


                        </div>
                    </div>
                )}

                {/* ── RESULTS ── */}
                {hasSearched && (
                    <div className="results-body-inner" style={{ maxWidth: 960, margin: "0 auto", padding: "calc(64px + 68px + 16px) 16px 100px" }}>
                        {!loading && meta && (
                            <div className="results-meta-bar">
                                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", minWidth: 0 }}>
                                    <p style={{ color: "var(--txt-3)", fontSize: 12.5, margin: 0, whiteSpace: "nowrap" }}>
                                        <strong style={{ color: "var(--txt-2)" }}>{meta.total.toLocaleString()}</strong> result{meta.total !== 1 ? "s" : ""} for{" "}
                                        <em style={{ color: "var(--txt)" }}>"{query}"</em>
                                    </p>
                                    <div className="filter-tags">
                                        {hasActiveDeptFilter && (
                                            <span className="filter-tag">
                                                {departments.find(d => String(d.id) === departmentId)?.name ?? "Dept"}
                                                <button onClick={() => handleDeptChange("")}>✕</button>
                                            </span>
                                        )}
                                        {hasActiveDateFilter && (
                                            <span className="filter-tag">
                                                {dateFrom && `${dateFrom}`}{dateFrom && dateTo && " – "}{dateTo && `${dateTo}`}
                                                <button onClick={handleClearDates}>✕</button>
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <button className="btn btn-ghost" style={{ padding: "5px 12px", fontSize: 12, flexShrink: 0 }} onClick={handleReset}>← New Search</button>
                            </div>
                        )}

                        {loading && (
                            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "60px 0", justifyContent: "center", color: "var(--txt-3)" }}>
                                <div className="spinner" /><span style={{ fontSize: 13 }}>Searching…</span>
                            </div>
                        )}

                        {!loading && results.length === 0 && (
                            <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--txt-3)" }}>
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: "0 auto 14px", display: "block", opacity: .25 }}>
                                    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
                                </svg>
                                <p style={{ fontSize: 17, color: "var(--txt-2)", fontFamily: "'DM Serif Display', serif", marginBottom: 6 }}>No results for "{query}"</p>
                                <p style={{ fontSize: 13 }}>Try different keywords or adjust the filters.</p>
                            </div>
                        )}

                        {!loading && results.length > 0 && (
                            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                {results.map((file, idx) => (
                                    <div
                                        key={file.id}
                                        className="rcard"
                                        style={{ animationDelay: `${idx * 35}ms` }}
                                        onClick={() => handleOpenModal(file)}
                                        role="button"
                                        tabIndex={0}
                                        onKeyDown={e => e.key === "Enter" && handleOpenModal(file)}
                                    >
                                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                                            <span className="rtitle">{highlightText(file.details?.fileName || file.name, query)}</span>
                                            <button
                                                className="card-dl-btn"
                                                disabled={downloadingId === file.id}
                                                onClick={e => { e.stopPropagation(); handleDownload(file); }}
                                                title="Download"
                                            >
                                                {downloadingId === file.id ? (
                                                    <span style={{ width: 11, height: 11, border: "1.5px solid var(--border)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spin .55s linear infinite", display: "inline-block" }} />
                                                ) : (
                                                    <>
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                                                        </svg>
                                                        <span>DL</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>

                                        {file.details?.publication_date && (
                                            <div style={{ marginTop: 6 }}>
                                                <span className="pub-date">
                                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                                        <rect x="3" y="4" width="18" height="18" rx="2" />
                                                        <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                                                    </svg>
                                                    {fmtDate(file.details.publication_date)}
                                                </span>
                                            </div>
                                        )}

                                        {file.details?.description && (
                                            <p style={{ color: "var(--txt-2)", fontSize: 13, marginTop: 7, lineHeight: 1.65, margin: "7px 0 0" }}>
                                                {highlightText(
                                                    file.details.description.length > 160
                                                        ? file.details.description.slice(0, 160) + "…"
                                                        : file.details.description,
                                                    query
                                                )}
                                            </p>
                                        )}

                                        <div className="stats-row">
                                            {!!file.details?.size && (
                                                <span className="stat-pill">
                                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                                                    </svg>
                                                    {formatSize(file.details.size)}
                                                </span>
                                            )}
                                            <span className="stat-pill s-views">
                                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                                                </svg>
                                                {(file.details?.views ?? 0).toLocaleString()}
                                            </span>
                                            <span className="stat-pill s-dls">
                                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                                                </svg>
                                                {(file.details?.downloads ?? 0).toLocaleString()}
                                            </span>
                                            <span className="view-hint" style={{ marginLeft: "auto" }}>
                                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                                                </svg>
                                                Tap to view
                                            </span>
                                        </div>

                                        {file.details?.authors && (
                                            <div className="meta-row">
                                                <span className="meta-item">
                                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                                                    </svg>
                                                    {highlightText(file.details.authors, query)}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Pagination */}
                        {!loading && meta && meta.last_page > 1 && (
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, marginTop: 36, flexWrap: "wrap" }}>
                                <button className="pgbtn" disabled={page <= 1} onClick={() => handlePageChange(page - 1)}>‹</button>
                                {paginationPages().map((p, i) =>
                                    p === "..." ? (
                                        <span key={`e${i}`} style={{ color: "var(--txt-3)", padding: "0 2px", fontSize: 13 }}>…</span>
                                    ) : (
                                        <button key={p} className={`pgbtn${p === page ? " active" : ""}`} onClick={() => handlePageChange(p as number)}>{p}</button>
                                    )
                                )}
                                <button className="pgbtn" disabled={page >= (meta?.last_page ?? 1)} onClick={() => handlePageChange(page + 1)}>›</button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </>
    );
}
