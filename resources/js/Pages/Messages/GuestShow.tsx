import { useState, useRef, useEffect, useCallback } from 'react';
import { Head, router } from '@inertiajs/react';
import Authenticated from '@/Layouts/AuthenticatedLayout';
import {
    PaperAirplaneIcon,
    ChevronLeftIcon,
    GlobeAltIcon,
    TrashIcon,
    EllipsisVerticalIcon,
} from '@heroicons/react/24/solid';

interface GuestInfo {
    id: number;
    guest_id: string;
    guest_name: string;
    ip_address: string | null;
    last_seen_at: string | null;
}

interface GuestMessage {
    id: number;
    from: 'guest' | 'admin';
    body: string;
    admin_id: number | null;
    read_at: string | null;
    created_at: string;
}

interface Props {
    guest: GuestInfo;
    messages: GuestMessage[];
}

function groupByDate(messages: GuestMessage[]): Record<string, GuestMessage[]> {
    return messages.reduce<Record<string, GuestMessage[]>>((acc, msg) => {
        const date = new Date(msg.created_at);
        const now = new Date();
        const diff = Math.floor((now.getTime() - date.getTime()) / 86400000);
        let label: string;
        if (diff === 0) label = 'Today';
        else if (diff === 1) label = 'Yesterday';
        else if (diff < 7) label = date.toLocaleDateString([], { weekday: 'long' });
        else label = date.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });
        if (!acc[label]) acc[label] = [];
        acc[label].push(msg);
        return acc;
    }, {});
}

function getCookie(name: string): string | null {
    const match = document.cookie.match(new RegExp('(^|;\\s*)' + name + '=([^;]*)'));
    return match ? decodeURIComponent(match[2]) : null;
}

export default function GuestShow({ guest, messages: initialMessages }: Props) {
    const [messages, setMessages] = useState<GuestMessage[]>(initialMessages);
    const [body, setBody] = useState('');
    const [sending, setSending] = useState(false);
    const [hoveredMsgId, setHoveredMsgId] = useState<number | null>(null);
    const [showMenu, setShowMenu] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);

    const bottomRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setShowMenu(false);
                setConfirmDelete(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // ── Send reply ────────────────────────────────────────────────────────────
    const send = useCallback(async () => {
        if (!body.trim() || sending) return;
        setSending(true);

        const tempId = Date.now();
        const optimistic: GuestMessage = {
            id: tempId,
            from: 'admin',
            body: body.trim(),
            admin_id: null,
            read_at: null,
            created_at: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, optimistic]);
        const sent = body.trim();
        setBody('');
        if (textareaRef.current) textareaRef.current.style.height = 'auto';

        try {
            const res = await fetch(route('messages.guest.reply', guest.id), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-XSRF-TOKEN': getCookie('XSRF-TOKEN') ?? '',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify({ body: sent }),
            });

            if (res.ok) {
                const data = await res.json();
                if (data?.message?.id) {
                    setMessages((prev) =>
                        prev.map((m) => (m.id === tempId ? { ...m, id: data.message.id } : m))
                    );
                }
            }
        } catch {
            setMessages((prev) => prev.filter((m) => m.id !== tempId));
        } finally {
            setSending(false);
        }
    }, [body, sending, guest.id]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            send();
        }
    };

    // ── Delete a single message ───────────────────────────────────────────────
    const deleteMessage = async (msg: GuestMessage) => {
        setMessages((prev) => prev.filter((m) => m.id !== msg.id));
        try {
            await fetch(route('messages.guest.destroy.message', { guestAccount: guest.id, guestMessage: msg.id }), {
                method: 'DELETE',
                headers: {
                    Accept: 'application/json',
                    'X-XSRF-TOKEN': getCookie('XSRF-TOKEN') ?? '',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });
        } catch {
            setMessages((prev) =>
                [...prev, msg].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
            );
        }
    };

    // ── Delete entire conversation ────────────────────────────────────────────
    const deleteConversation = async () => {
        setConfirmDelete(false);
        setShowMenu(false);
        try {
            await fetch(route('messages.guest.destroy', guest.id), {
                method: 'DELETE',
                headers: {
                    Accept: 'application/json',
                    'X-XSRF-TOKEN': getCookie('XSRF-TOKEN') ?? '',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });
        } finally {
            router.visit(route('messages.index'));
        }
    };

    const grouped = groupByDate(messages);

    return (
        <Authenticated
            breadcrumbs={[
                { title: 'Messages', href: route('messages.index') },
                { title: `${guest.guest_name} (Guest)` },
            ]}
        >
            <Head title={`Guest — ${guest.guest_name}`} />

            <div className="max-w-2xl mx-auto flex flex-col h-[calc(100dvh-7rem)] sm:h-[calc(100dvh-8rem)] lg:h-[calc(100vh-13rem)]">

                {/* ── Header ── */}
                <div className="flex items-center gap-2 sm:gap-3 pb-3 sm:pb-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
                    {/* Back always shown on non-lg */}
                    <a
                        href={route('messages.index')}
                        className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all -ml-1 shrink-0"
                        aria-label="Back to messages"
                    >
                        <ChevronLeftIcon className="h-5 w-5" />
                    </a>

                    {/* Guest avatar */}
                    <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-rose-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                        {guest.guest_name.charAt(0).toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                            <p className="font-semibold text-sm sm:text-base text-slate-800 dark:text-slate-100 truncate">
                                {guest.guest_name}
                            </p>
                            <span className="px-1.5 sm:px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap">
                                Guest
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5 flex-wrap">
                            {guest.ip_address && (
                                <p className="text-xs text-slate-400 flex items-center gap-1">
                                    <GlobeAltIcon className="h-3 w-3 shrink-0" />
                                    <span className="truncate max-w-[100px] sm:max-w-none">{guest.ip_address}</span>
                                </p>
                            )}
                            {guest.last_seen_at && (
                                <p className="text-xs text-slate-400 hidden sm:block">
                                    · Last seen {new Date(guest.last_seen_at).toLocaleString()}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* ⋮ menu */}
                    <div ref={menuRef} className="relative shrink-0">
                        <button
                            onClick={() => { setShowMenu((s) => !s); setConfirmDelete(false); }}
                            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                            style={{ minWidth: 40, minHeight: 40 }}
                            aria-label="More options"
                        >
                            <EllipsisVerticalIcon className="h-5 w-5" />
                        </button>

                        {showMenu && (
                            <div className="absolute right-0 top-11 w-48 rounded-xl bg-white dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden z-10">
                                {!confirmDelete ? (
                                    <button
                                        onClick={() => setConfirmDelete(true)}
                                        className="flex items-center gap-2 w-full px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                                    >
                                        <TrashIcon className="h-4 w-4" />
                                        Delete conversation
                                    </button>
                                ) : (
                                    <div className="px-4 py-3">
                                        <p className="text-xs text-slate-600 dark:text-slate-300 mb-3 font-medium">
                                            Delete all messages? This can't be undone.
                                        </p>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={deleteConversation}
                                                className="flex-1 py-2 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors"
                                            >
                                                Yes, delete
                                            </button>
                                            <button
                                                onClick={() => setConfirmDelete(false)}
                                                className="flex-1 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Messages ── */}
                <div className="flex-1 overflow-y-auto py-3 sm:py-4 space-y-1 pr-1 scroll-smooth">
                    {Object.entries(grouped).map(([date, msgs]) => (
                        <div key={date}>
                            {/* Date separator */}
                            <div className="flex items-center gap-3 my-3 sm:my-4">
                                <hr className="flex-1 border-slate-200 dark:border-slate-800" />
                                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider shrink-0">
                                    {date}
                                </span>
                                <hr className="flex-1 border-slate-200 dark:border-slate-800" />
                            </div>

                            <div className="space-y-1">
                                {msgs.map((msg, i) => {
                                    const isAdmin = msg.from === 'admin';
                                    const isFirst = i === 0 || msgs[i - 1].from !== msg.from;
                                    const isLast = i === msgs.length - 1 || msgs[i + 1].from !== msg.from;

                                    return (
                                        <div
                                            key={msg.id}
                                            className={`flex items-end gap-2 ${isAdmin ? 'justify-end' : 'justify-start'} ${isFirst ? 'mt-3' : 'mt-0.5'}`}
                                            onMouseEnter={() => setHoveredMsgId(msg.id)}
                                            onMouseLeave={() => setHoveredMsgId(null)}
                                            onTouchStart={() => setHoveredMsgId(msg.id)}
                                        >
                                            {/* Guest avatar on last bubble */}
                                            {!isAdmin && (
                                                <div className="w-6 sm:w-7 shrink-0 self-end mb-1">
                                                    {isLast && (
                                                        <div className="h-6 w-6 sm:h-7 sm:w-7 rounded-full bg-rose-500 flex items-center justify-center text-white text-xs font-bold">
                                                            {guest.guest_name.charAt(0).toUpperCase()}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            <div className={`max-w-[80%] sm:max-w-[70%] group relative flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}>
                                                <div
                                                    className={`px-3 sm:px-4 py-2 sm:py-2.5 text-sm shadow-sm leading-relaxed break-words whitespace-pre-wrap ${isAdmin
                                                        ? `bg-indigo-600 text-white ${isFirst ? 'rounded-t-2xl' : 'rounded-t-lg'} ${isLast ? 'rounded-bl-2xl rounded-br-sm' : 'rounded-l-2xl rounded-r-lg'}`
                                                        : `bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 ${isFirst ? 'rounded-t-2xl' : 'rounded-t-lg'} ${isLast ? 'rounded-br-2xl rounded-bl-sm' : 'rounded-r-2xl rounded-l-lg'}`
                                                        }`}
                                                >
                                                    {msg.body}
                                                </div>

                                                {isLast && (
                                                    <span className="text-[10px] mt-1 px-1 text-slate-400">
                                                        {new Date(msg.created_at).toLocaleTimeString([], {
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                        })}
                                                        {isAdmin && <span className="ml-1">{msg.read_at ? '✓✓' : '✓'}</span>}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Delete button on hover/touch — admin messages only */}
                                            {isAdmin && hoveredMsgId === msg.id && (
                                                <button
                                                    onClick={() => deleteMessage(msg)}
                                                    className="p-1.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors shrink-0 self-center"
                                                    title="Delete message"
                                                    style={{ minWidth: 32, minHeight: 32 }}
                                                >
                                                    <TrashIcon className="h-3.5 w-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}

                    {messages.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 py-16">
                            <GlobeAltIcon className="h-10 w-10 mb-2 opacity-30" />
                            <p className="text-sm">No messages yet</p>
                        </div>
                    )}

                    <div ref={bottomRef} />
                </div>

                {/* ── Reply input ── */}
                <div
                    className="flex items-end gap-2 sm:gap-3 pt-3 sm:pt-4 border-t border-slate-200 dark:border-slate-800 shrink-0"
                    style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
                >
                    <textarea
                        ref={textareaRef}
                        value={body}
                        onChange={(e) => {
                            setBody(e.target.value);
                            e.target.style.height = 'auto';
                            e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
                        }}
                        onKeyDown={handleKeyDown}
                        placeholder="Reply to guest… (Enter to send)"
                        rows={1}
                        className="flex-1 resize-none rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 sm:px-4 py-2.5 sm:py-3 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all max-h-[140px] overflow-y-auto"
                    />
                    <button
                        onClick={send}
                        disabled={sending || !body.trim()}
                        className="shrink-0 p-2.5 sm:p-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-all duration-150 shadow-md shadow-indigo-500/30 self-end active:scale-95"
                        style={{ minWidth: 44, minHeight: 44 }}
                    >
                        <PaperAirplaneIcon className="h-5 w-5" />
                    </button>
                </div>
            </div>
        </Authenticated>
    );
}
