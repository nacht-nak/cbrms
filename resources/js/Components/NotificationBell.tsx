import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { BellIcon, CheckIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { usePage } from '@inertiajs/react';
import axios from 'axios';
import type { User } from '@/types/user';

interface Notification {
    id: string;
    data: {
        type: 'file_uploaded' | 'file_status_changed';
        message: string;
        file_id: number;
        file_name: string;
        new_status?: string;
        old_status?: string;
        uploaded_by?: string;
    };
    read_at: string | null;
    created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
    active: 'text-emerald-600 dark:text-emerald-400',
    inactive: 'text-slate-500 dark:text-slate-400',
    archived: 'text-amber-600 dark:text-amber-400',
};

export default function NotificationBell() {
    const { auth } = usePage().props as any;
    const user = auth.user as User;
    const isAdmin = user.roles?.some((r: any) => r.name === 'admin');

    const [open, setOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [dropdownPos, setDropdownPos] = useState<{ top: number; right: number }>({ top: 0, right: 0 });
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);

    const btnRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    // Detect mobile
    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 640);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    // ─── Fetch ────────────────────────────────────────────────────────────────
    const fetchNotifications = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await axios.get('/api/notifications');
            setNotifications(data.notifications);
            setUnreadCount(data.unread_count);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

    // ─── Real-time listeners ──────────────────────────────────────────────────
    useEffect(() => {
        if (isAdmin) {
            window.Echo.private('admins').listen('.file.uploaded', (e: any) => {
                setNotifications((prev) => [{
                    id: crypto.randomUUID(),
                    data: {
                        type: 'file_uploaded',
                        message: `${e.uploaded_by} uploaded a new file: ${e.name}`,
                        file_id: e.id,
                        file_name: e.name,
                        uploaded_by: e.uploaded_by,
                    },
                    read_at: null,
                    created_at: e.uploaded_at,
                }, ...prev]);
                setUnreadCount((c) => c + 1);
            });
        }

        window.Echo.private(`users.${user.id}`).listen('.file.status.changed', (e: any) => {
            setNotifications((prev) => [{
                id: crypto.randomUUID(),
                data: {
                    type: 'file_status_changed',
                    message: `Your file "${e.name}" status changed from ${e.old_status} to ${e.new_status}`,
                    file_id: e.id,
                    file_name: e.name,
                    new_status: e.new_status,
                    old_status: e.old_status,
                },
                read_at: null,
                created_at: e.changed_at,
            }, ...prev]);
            setUnreadCount((c) => c + 1);
        });

        return () => {
            if (isAdmin) window.Echo.leave('admins');
            window.Echo.leave(`users.${user.id}`);
        };
    }, [user.id, isAdmin]);

    // ─── Lock body scroll on mobile ───────────────────────────────────────────
    useEffect(() => {
        if (isMobile && open) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isMobile, open]);

    // ─── Outside click (desktop only) ─────────────────────────────────────────
    useEffect(() => {
        if (!open || isMobile) return;
        const handler = (e: MouseEvent) => {
            if (
                panelRef.current && !panelRef.current.contains(e.target as Node) &&
                btnRef.current && !btnRef.current.contains(e.target as Node)
            ) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open, isMobile]);

    const handleOpen = useCallback(() => {
        if (btnRef.current) {
            const rect = btnRef.current.getBoundingClientRect();
            setDropdownPos({
                top: rect.bottom + 8,
                right: window.innerWidth - rect.right,
            });
        }
        setOpen((s) => !s);
    }, []);

    const close = useCallback(() => setOpen(false), []);

    // ─── Actions ──────────────────────────────────────────────────────────────
    const markAsRead = async (id: string) => {
        await axios.post(`/api/notifications/${id}/read`);
        setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
    };

    const markAllAsRead = async () => {
        await axios.post('/api/notifications/read-all');
        setNotifications((prev) => prev.map((n) => ({ ...n, read_at: new Date().toISOString() })));
        setUnreadCount(0);
    };

    const deleteOne = async (e: React.MouseEvent, id: string, isUnread: boolean) => {
        e.stopPropagation();
        await axios.delete(`/api/notifications/${id}`);
        setNotifications((prev) => prev.filter((n) => n.id !== id));
        if (isUnread) setUnreadCount((c) => Math.max(0, c - 1));
    };

    const deleteAll = async () => {
        await axios.delete('/api/notifications');
        setNotifications([]);
        setUnreadCount(0);
    };

    const formatTime = (iso: string) => {
        const date = new Date(iso);
        const diff = Math.floor((Date.now() - date.getTime()) / 1000);
        if (diff < 60) return 'just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return date.toLocaleDateString();
    };

    // ─── Shared content ───────────────────────────────────────────────────────

    const HeaderRow = (
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm sm:text-base">
                Notifications
                {unreadCount > 0 && (
                    <span className="ml-2 text-xs bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 px-2 py-0.5 rounded-full">
                        {unreadCount} new
                    </span>
                )}
            </h3>
            <div className="flex items-center gap-2">
                {notifications.length > 0 && (
                    <>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllAsRead}
                                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                            >
                                <CheckIcon className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Mark all read</span>
                                <span className="sm:hidden">Read all</span>
                            </button>
                        )}
                        <button
                            onClick={deleteAll}
                            className="text-xs text-rose-500 dark:text-rose-400 hover:underline flex items-center gap-1"
                        >
                            <TrashIcon className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Clear all</span>
                        </button>
                    </>
                )}
                {/* Close button (mobile only for bottom sheet) */}
                {isMobile && (
                    <button onClick={close} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 ml-1">
                        <XMarkIcon className="h-4 w-4" />
                    </button>
                )}
            </div>
        </div>
    );

    const NotifList = (
        <div className="overflow-y-auto flex-1 divide-y divide-slate-50 dark:divide-slate-800">
            {loading && (
                <div className="p-6 text-center text-slate-400 text-sm">Loading…</div>
            )}

            {!loading && notifications.length === 0 && (
                <div className="p-8 text-center">
                    <BellIcon className="h-10 w-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">No notifications yet</p>
                </div>
            )}

            {notifications.map((notif) => (
                <div
                    key={notif.id}
                    onClick={() => !notif.read_at && markAsRead(notif.id)}
                    className={`group px-4 py-3.5 sm:py-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 active:bg-slate-100 dark:active:bg-slate-800/70 transition-colors duration-100 ${!notif.read_at ? 'bg-indigo-50/50 dark:bg-indigo-950/30' : ''}`}
                >
                    <div className="flex items-start gap-3">
                        <div className={`mt-0.5 shrink-0 h-8 w-8 rounded-xl flex items-center justify-center text-sm ${notif.data.type === 'file_uploaded'
                            ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400'
                            : 'bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400'
                            }`}>
                            {notif.data.type === 'file_uploaded' ? '📁' : '🔄'}
                        </div>

                        <div className="flex-1 min-w-0">
                            <p className="text-sm text-slate-700 dark:text-slate-200 leading-snug">
                                {notif.data.message}
                            </p>
                            {notif.data.new_status && (
                                <span className={`text-xs font-medium mt-0.5 inline-block ${STATUS_COLORS[notif.data.new_status] ?? ''}`}>
                                    → {notif.data.new_status}
                                </span>
                            )}
                            <p className="text-[11px] text-slate-400 mt-1">
                                {formatTime(notif.created_at)}
                            </p>
                        </div>

                        <div className="flex flex-col items-center gap-1.5 shrink-0 mt-0.5">
                            {!notif.read_at && (
                                <span className="h-2 w-2 rounded-full bg-indigo-500" />
                            )}
                            <button
                                onClick={(e) => deleteOne(e, notif.id, !notif.read_at)}
                                /* Always visible on mobile (no hover), hover-only on desktop */
                                className="sm:opacity-0 sm:group-hover:opacity-100 p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-all duration-150"
                                title="Delete notification"
                                style={{ minWidth: 28, minHeight: 28 }}
                            >
                                <TrashIcon className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );

    // ─── Portal overlay ───────────────────────────────────────────────────────

    const Portal = open ? createPortal(
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-[998]"
                style={{ background: isMobile ? 'rgba(0,0,0,0.4)' : 'transparent' }}
                onClick={close}
                aria-hidden="true"
            />

            {isMobile ? (
                /* ══ Mobile: bottom sheet ══ */
                <div
                    ref={panelRef}
                    className="fixed bottom-0 left-0 right-0 z-[999] flex flex-col bg-white dark:bg-slate-900 rounded-t-2xl shadow-2xl border-t border-slate-200 dark:border-slate-800"
                    style={{ maxHeight: 'calc(100dvh - 80px)' }}
                >
                    {/* Drag handle */}
                    <div className="flex justify-center pt-3 pb-1 shrink-0">
                        <div className="h-1 w-10 rounded-full bg-slate-300 dark:bg-slate-700" />
                    </div>

                    {HeaderRow}
                    {NotifList}

                    {/* Safe-area bottom padding */}
                    <div style={{ height: 'env(safe-area-inset-bottom, 0px)' }} className="shrink-0" />
                </div>
            ) : (
                /* ══ Desktop: positioned dropdown ══ */
                <div
                    ref={panelRef}
                    className="fixed z-[999] w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden"
                    style={{
                        top: dropdownPos.top,
                        right: dropdownPos.right,
                        maxHeight: 'calc(100dvh - 120px)',
                    }}
                >
                    {HeaderRow}
                    <div className="max-h-[400px] overflow-y-auto divide-y divide-slate-50 dark:divide-slate-800">
                        {loading && <div className="p-6 text-center text-slate-400 text-sm">Loading…</div>}
                        {!loading && notifications.length === 0 && (
                            <div className="p-8 text-center">
                                <BellIcon className="h-10 w-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                                <p className="text-sm text-slate-400">No notifications yet</p>
                            </div>
                        )}
                        {notifications.map((notif) => (
                            <div
                                key={notif.id}
                                onClick={() => !notif.read_at && markAsRead(notif.id)}
                                className={`group px-4 py-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors duration-100 ${!notif.read_at ? 'bg-indigo-50/50 dark:bg-indigo-950/30' : ''}`}
                            >
                                <div className="flex items-start gap-3">
                                    <div className={`mt-0.5 shrink-0 h-8 w-8 rounded-xl flex items-center justify-center text-sm ${notif.data.type === 'file_uploaded'
                                        ? 'bg-indigo-100 dark:bg-indigo-900/50'
                                        : 'bg-amber-100 dark:bg-amber-900/50'
                                        }`}>
                                        {notif.data.type === 'file_uploaded' ? '📁' : '🔄'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-slate-700 dark:text-slate-200 leading-snug">{notif.data.message}</p>
                                        {notif.data.new_status && (
                                            <span className={`text-xs font-medium mt-0.5 inline-block ${STATUS_COLORS[notif.data.new_status] ?? ''}`}>
                                                → {notif.data.new_status}
                                            </span>
                                        )}
                                        <p className="text-[11px] text-slate-400 mt-1">{formatTime(notif.created_at)}</p>
                                    </div>
                                    <div className="flex flex-col items-center gap-1.5 shrink-0 mt-0.5">
                                        {!notif.read_at && <span className="h-2 w-2 rounded-full bg-indigo-500" />}
                                        <button
                                            onClick={(e) => deleteOne(e, notif.id, !notif.read_at)}
                                            className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-all duration-150"
                                        >
                                            <TrashIcon className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </>,
        document.body
    ) : null;

    // ─── UI ───────────────────────────────────────────────────────────────────
    return (
        <div className="relative">
            <button
                ref={btnRef}
                onClick={handleOpen}
                className="relative p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-all duration-150"
                style={{ minWidth: 40, minHeight: 40 }}
                aria-label="Notifications"
            >
                <BellIcon className="h-5 w-5" />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 h-4 w-4 flex items-center justify-center bg-rose-500 text-white text-[9px] font-bold rounded-full ring-2 ring-white dark:ring-slate-900">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {Portal}
        </div>
    );
}
