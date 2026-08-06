import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Link, router, usePage } from '@inertiajs/react';
import { ChatBubbleLeftRightIcon, GlobeAltIcon, XMarkIcon } from '@heroicons/react/24/outline';
import UserAvatar from '@/Components/UserAvatar';
import echo from '@/echo';
import type { ConversationItem } from '@/types/message';

interface GuestConversation {
    id: number;
    guest_id: string;
    guest_name: string;
    ip_address: string | null;
    last_seen_at: string | null;
    last_message: string | null;
    unread: number;
    updated_at: string | null;
}

interface MessageDropdownProps {
    conversations?: ConversationItem[];
    guestConversations?: GuestConversation[];
    isAdmin?: boolean;
}

type Tab = 'users' | 'guests';

function formatTime(iso: string) {
    const date = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (days === 1) return 'Yesterday';
    if (days < 7) return date.toLocaleDateString([], { weekday: 'short' });
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function MessageDropdown({
    conversations = [],
    guestConversations = [],
    isAdmin = false,
}: MessageDropdownProps) {
    const [open, setOpen] = useState(false);
    const [tab, setTab] = useState<Tab>('users');
    const [isMobile, setIsMobile] = useState(false);
    const [dropdownPos, setDropdownPos] = useState<{ top: number; right: number }>({ top: 0, right: 0 });

    const btnRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const { auth } = usePage().props as any;

    const totalUserUnread = conversations.reduce((sum, c) => sum + (c.unread ?? 0), 0);
    const totalGuestUnread = guestConversations.reduce((sum, c) => sum + (c.unread ?? 0), 0);
    const totalUnread = totalUserUnread + totalGuestUnread;

    // Detect mobile
    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 640);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    // Real-time update
    useEffect(() => {
        if (!auth?.user?.id) return;
        const channel = echo.private(`App.Models.User.${auth.user.id}`)
            .listen('.MessageSent', () => {
                router.reload({ only: ['conversations', 'guestConversations'] });
            });
        return () => { channel.stopListening('.MessageSent'); };
    }, [auth?.user?.id]);

    // Lock body scroll when mobile sheet is open
    useEffect(() => {
        if (isMobile && open) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isMobile, open]);

    // Close on outside click (desktop only — mobile uses backdrop)
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

    // ── Shared content sections ───────────────────────────────────────────────

    const TabBar = (
        <div className="flex gap-1 p-1.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 shrink-0">
            <button
                onClick={() => setTab('users')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${tab === 'users' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
            >
                <ChatBubbleLeftRightIcon className="h-3.5 w-3.5" />
                Users
                {totalUserUnread > 0 && (
                    <span className="px-1 py-0.5 rounded-full bg-indigo-600 text-white text-[9px] font-bold">{totalUserUnread}</span>
                )}
            </button>
            <button
                onClick={() => setTab('guests')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${tab === 'guests' ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
            >
                <GlobeAltIcon className="h-3.5 w-3.5" />
                Guests
                {totalGuestUnread > 0 && (
                    <span className="px-1 py-0.5 rounded-full bg-rose-500 text-white text-[9px] font-bold">{totalGuestUnread}</span>
                )}
            </button>
        </div>
    );

    const UserList = tab === 'users' ? (
        conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                <ChatBubbleLeftRightIcon className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-sm">No messages yet</p>
            </div>
        ) : (
            conversations.slice(0, 8).map((c) => {
                const displayName = [c.other_user.profile?.fname, c.other_user.profile?.lname]
                    .filter(Boolean).join(' ') || c.other_user.username;
                return (
                    <Link
                        key={c.id}
                        href={route('messages.show', c.other_user.id)}
                        onClick={close}
                        className={`flex items-center gap-3 px-4 py-4 sm:py-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 active:bg-slate-100 transition-colors duration-100 ${c.unread > 0 ? 'bg-indigo-50/50 dark:bg-indigo-950/20' : ''}`}
                    >
                        <div className="relative shrink-0">
                            <UserAvatar user={c.other_user} size="sm" />
                            {c.unread > 0 && <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-indigo-500 ring-2 ring-white dark:ring-slate-900" />}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                                <p className={`text-sm font-semibold truncate ${c.unread > 0 ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-200'}`}>{displayName}</p>
                                {c.updated_at && <span className="text-[10px] text-slate-400 shrink-0">{formatTime(c.updated_at)}</span>}
                            </div>
                            <p className={`text-xs truncate mt-0.5 ${c.unread > 0 ? 'text-slate-600 dark:text-slate-300 font-medium' : 'text-slate-400'}`}>
                                {c.last_message ?? 'No messages yet'}
                            </p>
                        </div>
                        {c.unread > 0 && (
                            <span className="shrink-0 flex items-center justify-center h-5 min-w-[20px] px-1 rounded-full bg-indigo-600 text-white text-[10px] font-bold">
                                {c.unread > 9 ? '9+' : c.unread}
                            </span>
                        )}
                    </Link>
                );
            })
        )
    ) : null;

    const GuestList = tab === 'guests' && isAdmin ? (
        guestConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                <GlobeAltIcon className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-sm">No guest messages yet</p>
            </div>
        ) : (
            guestConversations.slice(0, 8).map((g) => (
                <Link
                    key={g.id}
                    href={route('messages.guest.show', g.id)}
                    onClick={close}
                    className={`flex items-center gap-3 px-4 py-4 sm:py-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 active:bg-slate-100 transition-colors duration-100 ${g.unread > 0 ? 'bg-rose-50/50 dark:bg-rose-950/20' : ''}`}
                >
                    <div className="relative shrink-0">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${g.unread > 0 ? 'bg-rose-500' : 'bg-slate-400 dark:bg-slate-600'}`}>
                            {g.guest_name.charAt(0).toUpperCase()}
                        </div>
                        {g.unread > 0 && <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900" />}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                            <p className={`text-sm font-semibold truncate ${g.unread > 0 ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-200'}`}>{g.guest_name}</p>
                            {g.updated_at && <span className="text-[10px] text-slate-400 shrink-0">{formatTime(g.updated_at)}</span>}
                        </div>
                        <p className={`text-xs truncate mt-0.5 ${g.unread > 0 ? 'text-slate-600 dark:text-slate-300 font-medium' : 'text-slate-400'}`}>
                            {g.last_message ?? 'No messages yet'}
                        </p>
                    </div>
                    {g.unread > 0 && (
                        <span className="shrink-0 flex items-center justify-center h-5 min-w-[20px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                            {g.unread > 9 ? '9+' : g.unread}
                        </span>
                    )}
                </Link>
            ))
        )
    ) : null;

    const Footer = (
        <div
            className="border-t border-slate-100 dark:border-slate-800 p-2 shrink-0"
            style={{ paddingBottom: isMobile ? 'calc(0.5rem + env(safe-area-inset-bottom, 0px))' : undefined }}
        >
            <Link
                href={route('messages.users')}
                onClick={close}
                className="flex items-center justify-center w-full py-3 sm:py-2 rounded-xl text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 active:bg-indigo-100 transition-colors duration-150"
            >
                + New conversation
            </Link>
        </div>
    );

    // ── Portaled panel ────────────────────────────────────────────────────────

    const Portal = open ? createPortal(
        <>
            {/* Backdrop — tappable to close */}
            <div
                className="fixed inset-0 z-[998]"
                style={{ background: isMobile ? 'rgba(0,0,0,0.4)' : 'transparent' }}
                onClick={close}
                aria-hidden="true"
            />

            {isMobile ? (
                /* ══ Mobile bottom sheet ══ */
                <div
                    ref={panelRef}
                    className="fixed bottom-0 left-0 right-0 z-[999] flex flex-col bg-white dark:bg-slate-900 rounded-t-2xl shadow-2xl border-t border-slate-200 dark:border-slate-800"
                    style={{ maxHeight: 'calc(100dvh - 80px)' }}
                >
                    {/* Drag handle */}
                    <div className="flex justify-center pt-3 pb-1 shrink-0">
                        <div className="h-1 w-10 rounded-full bg-slate-300 dark:bg-slate-700" />
                    </div>

                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
                        <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">Messages</h3>
                            {totalUnread > 0 && (
                                <span className="px-1.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold">
                                    {totalUnread} new
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-3">
                            <Link href={route('messages.index')} onClick={close} className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                                See all
                            </Link>
                            <button onClick={close} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
                                <XMarkIcon className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    {isAdmin && TabBar}

                    <div className="flex-1 overflow-y-auto">
                        {UserList}
                        {GuestList}
                    </div>

                    {Footer}
                </div>
            ) : (
                /* ══ Desktop dropdown (portal + absolute-emulated via fixed) ══ */
                <div
                    ref={panelRef}
                    className="fixed z-[999] w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl shadow-slate-900/20 dark:shadow-slate-950/50 border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden"
                    style={{
                        top: dropdownPos.top,
                        right: dropdownPos.right,
                        maxHeight: 'calc(100dvh - 120px)',
                    }}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
                        <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">Messages</h3>
                            {totalUnread > 0 && (
                                <span className="px-1.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold">
                                    {totalUnread} new
                                </span>
                            )}
                        </div>
                        <Link href={route('messages.index')} onClick={close} className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 font-medium transition-colors">
                            See all
                        </Link>
                    </div>

                    {isAdmin && TabBar}

                    <div className="overflow-y-auto flex-1">
                        {UserList}
                        {GuestList}
                    </div>

                    {Footer}
                </div>
            )}
        </>,
        document.body
    ) : null;

    return (
        <div className="relative">
            <button
                ref={btnRef}
                onClick={handleOpen}
                className="relative p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-all duration-150"
                style={{ minWidth: 40, minHeight: 40 }}
                aria-label="Messages"
            >
                <ChatBubbleLeftRightIcon className="h-5 w-5" />
                {totalUnread > 0 && (
                    <span className="absolute top-1 right-1 flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-indigo-600 text-white text-[9px] font-bold leading-none">
                        {totalUnread > 99 ? '99+' : totalUnread}
                    </span>
                )}
            </button>

            {Portal}
        </div>
    );
}
