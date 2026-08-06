import { useState, useEffect, useRef, useCallback } from 'react';
import { router, usePage } from '@inertiajs/react';
import echo from '@/echo';
import UserAvatar from '@/Components/UserAvatar';
import type { ConversationItem, Message } from '@/types/message';
import type { User } from '@/types/user';
import {
    ChatBubbleOvalLeftEllipsisIcon,
    XMarkIcon,
    ArrowLeftIcon,
    PaperAirplaneIcon,
    MagnifyingGlassIcon,
    TrashIcon,
    EllipsisVerticalIcon,
    GlobeAltIcon,
    UserGroupIcon,
} from '@heroicons/react/24/outline';

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

interface GuestMessage {
    id: number;
    from: 'guest' | 'admin';
    body: string;
    admin_id: number | null;
    read_at: string | null;
    created_at: string;
}

interface Props {
    conversations: ConversationItem[];
    guestConversations?: GuestConversation[];
    isAdmin?: boolean;
}

type Tab = 'users' | 'guests';
type View = 'list' | 'chat' | 'guest-chat';

// ── Constants ────────────────────────────────────────────────────────────────
const PANEL_W = 320;
const PANEL_H = 480;
const FAB_SIZE = 52;
const PANEL_GAP = 8;

function formatTime(iso: string | null) {
    if (!iso) return '';
    const date = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (days === 1) return 'Yesterday';
    if (days < 7) return date.toLocaleDateString([], { weekday: 'short' });
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function getCookie(name: string): string | null {
    const match = document.cookie.match(new RegExp('(^|;\\s*)' + name + '=([^;]*)'));
    return match ? decodeURIComponent(match[2]) : null;
}

function clamp(v: number, lo: number, hi: number) {
    return Math.min(Math.max(v, lo), hi);
}

function defaultFabPos() {
    return { x: window.innerWidth - FAB_SIZE - 20, y: window.innerHeight - FAB_SIZE - 20 };
}

/** Place the panel so it opens above/left of the FAB, clamped to viewport */
function panelPosFromFab(fab: { x: number; y: number }) {
    const m = 8;
    let px = fab.x + FAB_SIZE - PANEL_W;
    let py = fab.y - PANEL_H - PANEL_GAP;
    if (px < m) px = m;
    if (py < m) py = fab.y + FAB_SIZE + PANEL_GAP;
    if (py + PANEL_H > window.innerHeight - m) py = window.innerHeight - PANEL_H - m;
    if (px + PANEL_W > window.innerWidth - m) px = window.innerWidth - PANEL_W - m;
    return { x: px, y: py };
}

export default function FloatingChat({
    conversations: initialConversations,
    guestConversations: initialGuestConversations = [],
    isAdmin = false,
}: Props) {
    const { auth } = usePage().props as any;
    const authUser = auth.user as User;

    const [open, setOpen] = useState(false);
    const [view, setView] = useState<View>('list');
    const [tab, setTab] = useState<Tab>('users');
    const [search, setSearch] = useState('');
    const [isMobile, setIsMobile] = useState(false);

    const [conversations, setConversations] = useState<ConversationItem[]>(initialConversations);
    const [activeConversation, setActiveConversation] = useState<ConversationItem | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [loadingMessages, setLoadingMessages] = useState(false);

    const [guestConversations, setGuestConversations] = useState<GuestConversation[]>(initialGuestConversations);
    const [activeGuest, setActiveGuest] = useState<GuestConversation | null>(null);
    const [guestMessages, setGuestMessages] = useState<GuestMessage[]>([]);
    const [loadingGuestMessages, setLoadingGuestMessages] = useState(false);

    const [body, setBody] = useState('');
    const [sending, setSending] = useState(false);
    const [hoveredMsgId, setHoveredMsgId] = useState<number | null>(null);
    const [showChatMenu, setShowChatMenu] = useState(false);
    const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);

    // ── FAB drag state ────────────────────────────────────────────────────────
    const [fabPos, setFabPos] = useState<{ x: number; y: number } | null>(null);
    const fabDragging = useRef(false);
    const fabDidDrag = useRef(false);
    const fabDragStart = useRef({ mx: 0, my: 0, px: 0, py: 0 });

    // ── Panel drag state ──────────────────────────────────────────────────────
    const [panelPos, setPanelPos] = useState<{ x: number; y: number } | null>(null);
    const panelDragging = useRef(false);
    const panelDragStart = useRef({ mx: 0, my: 0, px: 0, py: 0 });

    // Init FAB position after mount
    useEffect(() => { setFabPos(defaultFabPos()); }, []);

    // Keep FAB + panel inside viewport on resize
    useEffect(() => {
        const onResize = () => {
            setFabPos((p) => p ? { x: clamp(p.x, 0, window.innerWidth - FAB_SIZE), y: clamp(p.y, 0, window.innerHeight - FAB_SIZE) } : p);
            setPanelPos((p) => p ? { x: clamp(p.x, 0, window.innerWidth - PANEL_W), y: clamp(p.y, 0, window.innerHeight - PANEL_H) } : p);
        };
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    // ── FAB pointer handlers ──────────────────────────────────────────────────
    const onFabWrapperPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        fabDragging.current = true;
        fabDidDrag.current = false;
        const cur = fabPos ?? defaultFabPos();
        fabDragStart.current = { mx: e.clientX, my: e.clientY, px: cur.x, py: cur.y };
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }, [fabPos]);

    const onFabWrapperPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        if (!fabDragging.current) return;
        const dx = e.clientX - fabDragStart.current.mx;
        const dy = e.clientY - fabDragStart.current.my;
        if (Math.abs(dx) > 4 || Math.abs(dy) > 4) fabDidDrag.current = true;
        const nx = clamp(fabDragStart.current.px + dx, 0, window.innerWidth - FAB_SIZE);
        const ny = clamp(fabDragStart.current.py + dy, 0, window.innerHeight - FAB_SIZE);
        setFabPos({ x: nx, y: ny });
        // Move open panel along with FAB while dragging
        if (open) setPanelPos(panelPosFromFab({ x: nx, y: ny }));
    }, [open]);

    const handleFabClick = useCallback((currentFabPos: { x: number; y: number } | null) => {
        setOpen((wasOpen) => {
            const nowOpen = !wasOpen;
            if (nowOpen && currentFabPos) setPanelPos(panelPosFromFab(currentFabPos));
            return nowOpen;
        });
    }, []);

    const onFabWrapperPointerUp = useCallback(() => {
        const wasDrag = fabDidDrag.current;
        fabDragging.current = false;
        fabDidDrag.current = false; // always reset so next tap works
        if (!wasDrag) {
            // Use the latest fabPos via ref to avoid stale closure
            setFabPos((cur) => {
                handleFabClick(cur);
                return cur; // don't change pos
            });
        }
    }, [handleFabClick]);

    // ── Panel header pointer handlers ─────────────────────────────────────────
    const onPanelHeaderPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        if (isMobile || (e.target as HTMLElement).closest('button')) return;
        panelDragging.current = true;
        const cur = panelPos ?? { x: 0, y: 0 };
        panelDragStart.current = { mx: e.clientX, my: e.clientY, px: cur.x, py: cur.y };
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }, [isMobile, panelPos]);

    const onPanelHeaderPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        if (!panelDragging.current) return;
        const dx = e.clientX - panelDragStart.current.mx;
        const dy = e.clientY - panelDragStart.current.my;
        setPanelPos({
            x: clamp(panelDragStart.current.px + dx, 0, window.innerWidth - PANEL_W),
            y: clamp(panelDragStart.current.py + dy, 0, window.innerHeight - PANEL_H),
        });
    }, []);

    const onPanelHeaderPointerUp = useCallback(() => { panelDragging.current = false; }, []);

    // ── Mobile detection ──────────────────────────────────────────────────────
    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 640);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    useEffect(() => {
        if (isMobile && open) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = '';
        return () => { document.body.style.overflow = ''; };
    }, [isMobile, open]);

    useEffect(() => { setConversations(initialConversations); }, [initialConversations]);
    useEffect(() => { setGuestConversations(initialGuestConversations); }, [initialGuestConversations]);

    useEffect(() => {
        if (!authUser?.id) return;
        const channel = echo.private(`App.Models.User.${authUser.id}`)
            .listen('.MessageSent', () => { router.reload({ only: ['conversations', 'guestConversations'] }); });
        return () => { channel.stopListening('.MessageSent'); };
    }, [authUser?.id]);

    const totalUserUnread = conversations.reduce((sum, c) => sum + (c.unread ?? 0), 0);
    const totalGuestUnread = guestConversations.reduce((sum, c) => sum + (c.unread ?? 0), 0);
    const totalUnread = totalUserUnread + totalGuestUnread;

    const filteredUsers = conversations.filter((c) => {
        const name = [c.other_user.profile?.fname, c.other_user.profile?.lname].filter(Boolean).join(' ').toLowerCase();
        return name.includes(search.toLowerCase()) || c.other_user.username.toLowerCase().includes(search.toLowerCase());
    });

    const filteredGuests = guestConversations.filter((g) =>
        g.guest_name.toLowerCase().includes(search.toLowerCase()) || (g.ip_address ?? '').includes(search)
    );

    const bottomRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const chatMenuRef = useRef<HTMLDivElement>(null);
    const messageCache = useRef<Record<number, Message[]>>({});
    const guestMsgCache = useRef<Record<number, GuestMessage[]>>({});

    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, guestMessages]);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (chatMenuRef.current && !chatMenuRef.current.contains(e.target as Node)) setShowChatMenu(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    useEffect(() => {
        if (!activeConversation) return;
        const channel = echo.private(`conversation.${activeConversation.id}`)
            .listen('.MessageSent', (e: Message) => {
                if (e.sender_id === authUser.id) return;
                setMessages((prev) => {
                    if (prev.some((m) => m.id === e.id)) return prev;
                    const updated = [...prev, e];
                    messageCache.current[activeConversation.id] = updated;
                    return updated;
                });
                setConversations((prev) => prev.map((c) => c.id === activeConversation.id ? { ...c, last_message: e.body, updated_at: e.created_at, unread: 0 } : c));
            });
        return () => { channel.stopListening('.MessageSent'); echo.leave(`conversation.${activeConversation.id}`); };
    }, [activeConversation?.id, authUser.id]);

    const openChat = async (conv: ConversationItem) => {
        setActiveConversation(conv); setView('chat'); setShowChatMenu(false); setConfirmDeleteAll(false); setBody('');
        const cached = messageCache.current[conv.id];
        if (cached) { setMessages(cached); setLoadingMessages(false); } else { setMessages([]); setLoadingMessages(true); }
        try {
            const res = await fetch(`/messages/${conv.other_user.id}/json`, { headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' } });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            const fetched: Message[] = data.messages ?? [];
            messageCache.current[conv.id] = fetched;
            setMessages(fetched);
            if (data.conversation_id) {
                setConversations((prev) => prev.map((c) => c.other_user.id === conv.other_user.id ? { ...c, id: data.conversation_id, unread: 0 } : c));
                setActiveConversation((prev) => prev ? { ...prev, id: data.conversation_id } : prev);
            } else {
                setConversations((prev) => prev.map((c) => c.id === conv.id ? { ...c, unread: 0 } : c));
            }
        } catch (err) {
            console.error('FloatingChat fetch error:', err);
            if (!messageCache.current[conv.id]) setMessages([]);
        } finally { setLoadingMessages(false); }
    };

    const openGuestChat = async (guest: GuestConversation) => {
        setActiveGuest(guest); setView('guest-chat'); setShowChatMenu(false); setConfirmDeleteAll(false); setBody('');
        const cached = guestMsgCache.current[guest.id];
        if (cached) { setGuestMessages(cached); setLoadingGuestMessages(false); } else { setGuestMessages([]); setLoadingGuestMessages(true); }
        try {
            const res = await fetch(`/bot/guest-thread/${guest.id}`, { headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' } });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            const fetched: GuestMessage[] = data.messages ?? [];
            guestMsgCache.current[guest.id] = fetched;
            setGuestMessages(fetched);
            setGuestConversations((prev) => prev.map((g) => g.id === guest.id ? { ...g, unread: 0 } : g));
        } catch (err) {
            console.error('FloatingChat guest fetch error:', err);
            if (!guestMsgCache.current[guest.id]) setGuestMessages([]);
        } finally { setLoadingGuestMessages(false); }
    };

    const goBack = () => {
        if (activeConversation) messageCache.current[activeConversation.id] = messages;
        if (activeGuest) guestMsgCache.current[activeGuest.id] = guestMessages;
        setView('list'); setActiveConversation(null); setActiveGuest(null);
        setMessages([]); setGuestMessages([]); setShowChatMenu(false); setConfirmDeleteAll(false); setBody('');
    };

    const sendUserMessage = useCallback(async () => {
        if (!body.trim() || sending || !activeConversation) return;
        setSending(true);
        const tempId = Date.now();
        const optimistic: Message = { id: tempId, conversation_id: activeConversation.id, sender_id: authUser.id, body: body.trim(), created_at: new Date().toISOString(), read_at: null } as any;
        setMessages((prev) => { const u = [...prev, optimistic]; messageCache.current[activeConversation.id] = u; return u; });
        const sent = body.trim();
        setBody('');
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
        try {
            const res = await fetch(`/messages/${activeConversation.id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-XSRF-TOKEN': getCookie('XSRF-TOKEN') ?? '', 'X-Requested-With': 'XMLHttpRequest' },
                body: JSON.stringify({ body: sent }),
            });
            if (res.ok) {
                try {
                    const data = await res.json();
                    if (data?.message?.id) setMessages((prev) => { const u = prev.map((m) => m.id === tempId ? { ...m, id: data.message.id } : m); messageCache.current[activeConversation.id] = u; return u; });
                } catch { /* non-JSON ok */ }
            }
            setConversations((prev) => prev.map((c) => c.id === activeConversation.id ? { ...c, last_message: sent, updated_at: new Date().toISOString() } : c));
        } catch {
            setMessages((prev) => { const u = prev.filter((m) => m.id !== tempId); messageCache.current[activeConversation.id] = u; return u; });
        } finally { setSending(false); }
    }, [body, sending, activeConversation, authUser.id]);

    const sendGuestReply = useCallback(async () => {
        if (!body.trim() || sending || !activeGuest) return;
        setSending(true);
        const tempId = Date.now();
        const optimistic: GuestMessage = { id: tempId, from: 'admin', body: body.trim(), admin_id: authUser.id, read_at: null, created_at: new Date().toISOString() };
        setGuestMessages((prev) => { const u = [...prev, optimistic]; guestMsgCache.current[activeGuest.id] = u; return u; });
        const sent = body.trim();
        setBody('');
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
        try {
            const res = await fetch(`/messages/guest/${activeGuest.id}/reply`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-XSRF-TOKEN': getCookie('XSRF-TOKEN') ?? '', 'X-Requested-With': 'XMLHttpRequest' },
                body: JSON.stringify({ body: sent }),
            });
            if (res.ok) {
                const data = await res.json();
                if (data?.message?.id) setGuestMessages((prev) => { const u = prev.map((m) => m.id === tempId ? { ...m, id: data.message.id } : m); guestMsgCache.current[activeGuest.id] = u; return u; });
            }
            setGuestConversations((prev) => prev.map((g) => g.id === activeGuest.id ? { ...g, last_message: sent, updated_at: new Date().toISOString() } : g));
        } catch {
            setGuestMessages((prev) => { const u = prev.filter((m) => m.id !== tempId); guestMsgCache.current[activeGuest.id] = u; return u; });
        } finally { setSending(false); }
    }, [body, sending, activeGuest, authUser.id]);

    const send = view === 'guest-chat' ? sendGuestReply : sendUserMessage;

    const deleteUserMessage = async (msg: Message) => {
        if (!activeConversation) return;
        setMessages((prev) => { const u = prev.filter((m) => m.id !== msg.id); messageCache.current[activeConversation.id] = u; return u; });
        try { await fetch(`/messages/${activeConversation.id}/message/${msg.id}`, { method: 'DELETE', headers: { Accept: 'application/json', 'X-XSRF-TOKEN': getCookie('XSRF-TOKEN') ?? '', 'X-Requested-With': 'XMLHttpRequest' } }); }
        catch { setMessages((prev) => { const r = [...prev, msg].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()); messageCache.current[activeConversation.id] = r; return r; }); }
    };

    const deleteGuestMessage = async (msg: GuestMessage) => {
        if (!activeGuest) return;
        setGuestMessages((prev) => { const u = prev.filter((m) => m.id !== msg.id); guestMsgCache.current[activeGuest.id] = u; return u; });
        try { await fetch(`/messages/guest/${activeGuest.id}/message/${msg.id}`, { method: 'DELETE', headers: { Accept: 'application/json', 'X-XSRF-TOKEN': getCookie('XSRF-TOKEN') ?? '', 'X-Requested-With': 'XMLHttpRequest' } }); }
        catch { setGuestMessages((prev) => { const r = [...prev, msg].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()); guestMsgCache.current[activeGuest.id] = r; return r; }); }
    };

    const deleteConversation = async () => {
        setConfirmDeleteAll(false);
        if (view === 'chat' && activeConversation) {
            const convId = activeConversation.id;
            setConversations((prev) => prev.filter((c) => c.id !== convId));
            delete messageCache.current[convId];
            goBack();
            await fetch(`/messages/${convId}`, { method: 'DELETE', headers: { Accept: 'application/json', 'X-XSRF-TOKEN': getCookie('XSRF-TOKEN') ?? '', 'X-Requested-With': 'XMLHttpRequest' } });
        } else if (view === 'guest-chat' && activeGuest) {
            const guestId = activeGuest.id;
            setGuestConversations((prev) => prev.filter((g) => g.id !== guestId));
            delete guestMsgCache.current[guestId];
            goBack();
            await fetch(`/messages/guest/${guestId}`, { method: 'DELETE', headers: { Accept: 'application/json', 'X-XSRF-TOKEN': getCookie('XSRF-TOKEN') ?? '', 'X-Requested-With': 'XMLHttpRequest' } });
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    };

    const displayName = view === 'chat' && activeConversation
        ? [activeConversation.other_user.profile?.fname, activeConversation.other_user.profile?.lname].filter(Boolean).join(' ') || activeConversation.other_user.username
        : view === 'guest-chat' && activeGuest ? activeGuest.guest_name : '';

    // ── Panel style ────────────────────────────────────────────────────────────
    const panelClasses = isMobile
        ? 'fixed inset-0 z-[55] flex flex-col bg-white dark:bg-slate-900'
        : 'fixed z-[55] w-80 rounded-2xl bg-white dark:bg-slate-900 shadow-2xl shadow-slate-900/25 dark:shadow-slate-950/60 border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden';

    const panelStyle: React.CSSProperties = isMobile ? {} : {
        height: `${PANEL_H}px`, width: `${PANEL_W}px`,
        left: `${panelPos?.x ?? 0}px`, top: `${panelPos?.y ?? 0}px`,
    };

    // Drag handle props spread onto each panel header
    const hdr = !isMobile ? {
        onPointerDown: onPanelHeaderPointerDown,
        onPointerMove: onPanelHeaderPointerMove,
        onPointerUp: onPanelHeaderPointerUp,
        style: { cursor: 'grab' } as React.CSSProperties,
    } : {};

    const DragPill = () => !isMobile
        ? <div className="absolute left-1/2 -translate-x-1/2 top-1.5 w-8 h-1 rounded-full bg-white/25 pointer-events-none" />
        : null;

    return (
        <>
            {/* ════ PANEL ════ */}
            {open && (
                <div className={panelClasses} style={panelStyle}>

                    {/* LIST VIEW */}
                    {view === 'list' && (
                        <>
                            <div className="flex items-center justify-between px-4 py-3 bg-indigo-600 text-white shrink-0 safe-top select-none relative" {...hdr}>
                                <DragPill />
                                <div>
                                    <h3 className="font-semibold text-sm">Messages</h3>
                                    {totalUnread > 0 && <p className="text-[10px] text-indigo-200">{totalUnread} unread</p>}
                                </div>
                                <button onClick={() => setOpen(false)} className="p-2 rounded-lg hover:bg-indigo-500 transition-colors" style={{ minWidth: 36, minHeight: 36 }}>
                                    <XMarkIcon className="h-5 w-5" />
                                </button>
                            </div>

                            {isAdmin && (
                                <div className="flex gap-1 p-1.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 shrink-0">
                                    <button onClick={() => { setTab('users'); setSearch(''); }} className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-md text-xs font-semibold transition-all ${tab === 'users' ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                                        <UserGroupIcon className="h-3.5 w-3.5" />Users
                                        {totalUserUnread > 0 && <span className="px-1 rounded-full bg-indigo-600 text-white text-[9px] font-bold">{totalUserUnread}</span>}
                                    </button>
                                    <button onClick={() => { setTab('guests'); setSearch(''); }} className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-md text-xs font-semibold transition-all ${tab === 'guests' ? 'bg-white dark:bg-slate-900 text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                                        <GlobeAltIcon className="h-3.5 w-3.5" />Guests
                                        {totalGuestUnread > 0 && <span className="px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold">{totalGuestUnread}</span>}
                                    </button>
                                </div>
                            )}

                            <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 shrink-0">
                                <div className="relative">
                                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <input type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)}
                                        className="w-full pl-9 pr-3 py-2 rounded-lg text-sm bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-400" />
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto">
                                {tab === 'users' && (
                                    filteredUsers.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                            <ChatBubbleOvalLeftEllipsisIcon className="h-10 w-10 mb-2 opacity-30" />
                                            <p className="text-sm">No conversations</p>
                                        </div>
                                    ) : filteredUsers.map((c) => {
                                        const name = [c.other_user.profile?.fname, c.other_user.profile?.lname].filter(Boolean).join(' ') || c.other_user.username;
                                        return (
                                            <button key={c.id} onClick={() => openChat(c)} className={`w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 active:bg-slate-100 transition-colors text-left ${c.unread > 0 ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : ''}`}>
                                                <div className="relative shrink-0">
                                                    <UserAvatar user={c.other_user} size="sm" />
                                                    {c.unread > 0 && <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-indigo-500 ring-2 ring-white dark:ring-slate-900" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-center gap-1">
                                                        <p className={`text-sm font-semibold truncate ${c.unread > 0 ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-200'}`}>{name}</p>
                                                        {c.updated_at && <span className="text-[10px] text-slate-400 shrink-0">{formatTime(c.updated_at)}</span>}
                                                    </div>
                                                    <p className={`text-xs truncate ${c.unread > 0 ? 'text-slate-600 dark:text-slate-300 font-medium' : 'text-slate-400'}`}>{c.last_message ?? 'No messages yet'}</p>
                                                </div>
                                                {c.unread > 0 && <span className="shrink-0 h-5 min-w-[20px] px-1 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center">{c.unread > 9 ? '9+' : c.unread}</span>}
                                            </button>
                                        );
                                    })
                                )}
                                {tab === 'guests' && isAdmin && (
                                    filteredGuests.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                            <GlobeAltIcon className="h-10 w-10 mb-2 opacity-30" />
                                            <p className="text-sm">No guest messages</p>
                                        </div>
                                    ) : filteredGuests.map((g) => (
                                        <button key={g.id} onClick={() => openGuestChat(g)} className={`w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors text-left ${g.unread > 0 ? 'bg-rose-50/40 dark:bg-rose-950/20' : ''}`}>
                                            <div className="relative shrink-0">
                                                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${g.unread > 0 ? 'bg-rose-500' : 'bg-slate-400 dark:bg-slate-600'}`}>{g.guest_name.charAt(0).toUpperCase()}</div>
                                                {g.unread > 0 && <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-center gap-1">
                                                    <div className="flex items-center gap-1 min-w-0">
                                                        <p className={`text-sm font-semibold truncate ${g.unread > 0 ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-200'}`}>{g.guest_name}</p>
                                                        <span className="shrink-0 text-[9px] font-bold px-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-400 uppercase">guest</span>
                                                    </div>
                                                    {g.updated_at && <span className="text-[10px] text-slate-400 shrink-0">{formatTime(g.updated_at)}</span>}
                                                </div>
                                                <p className={`text-xs truncate ${g.unread > 0 ? 'text-slate-600 dark:text-slate-300 font-medium' : 'text-slate-400'}`}>{g.last_message ?? 'No messages yet'}</p>
                                            </div>
                                            {g.unread > 0 && <span className="shrink-0 h-5 min-w-[20px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">{g.unread > 9 ? '9+' : g.unread}</span>}
                                        </button>
                                    ))
                                )}
                            </div>
                        </>
                    )}

                    {/* USER CHAT VIEW */}
                    {(view === 'chat' && activeConversation) && (
                        <>
                            <div className="flex items-center gap-2.5 px-3 py-2.5 bg-indigo-600 text-white shrink-0 safe-top select-none relative" {...hdr}>
                                <DragPill />
                                <button onClick={goBack} className="p-2 rounded-lg hover:bg-indigo-500 transition-colors" style={{ minWidth: 36, minHeight: 36 }}><ArrowLeftIcon className="h-5 w-5" /></button>
                                <UserAvatar user={activeConversation.other_user} size="sm" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold truncate">{displayName}</p>
                                    <p className="text-[10px] text-indigo-200">@{activeConversation.other_user.username}</p>
                                </div>
                                <div ref={chatMenuRef} className="relative">
                                    <button onClick={() => { setShowChatMenu((s) => !s); setConfirmDeleteAll(false); }} className="p-2 rounded-lg hover:bg-indigo-500 transition-colors" style={{ minWidth: 36, minHeight: 36 }}><EllipsisVerticalIcon className="h-5 w-5" /></button>
                                    {showChatMenu && (
                                        <div className="absolute right-0 top-9 w-48 rounded-xl bg-white dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden z-10">
                                            {!confirmDeleteAll ? (
                                                <button onClick={() => setConfirmDeleteAll(true)} className="flex items-center gap-2 w-full px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"><TrashIcon className="h-4 w-4" />Delete conversation</button>
                                            ) : (
                                                <div className="px-4 py-3">
                                                    <p className="text-xs text-slate-600 dark:text-slate-300 mb-3 font-medium">Delete all messages? This can't be undone.</p>
                                                    <div className="flex gap-2">
                                                        <button onClick={deleteConversation} className="flex-1 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors">Yes, delete</button>
                                                        <button onClick={() => setConfirmDeleteAll(false)} className="flex-1 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">Cancel</button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <button onClick={() => setOpen(false)} className="p-2 rounded-lg hover:bg-indigo-500 transition-colors" style={{ minWidth: 36, minHeight: 36 }}><XMarkIcon className="h-5 w-5" /></button>
                            </div>

                            <div className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
                                {loadingMessages ? (
                                    <div className="flex items-center justify-center h-full text-slate-400">
                                        <div className="flex gap-1.5">
                                            <span className="h-2 w-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <span className="h-2 w-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <span className="h-2 w-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                                        </div>
                                    </div>
                                ) : messages.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                        <p className="text-sm">No messages yet</p><p className="text-xs mt-1">Say hello! 👋</p>
                                    </div>
                                ) : messages.map((msg, i) => {
                                    const isMine = msg.sender_id === authUser.id;
                                    const isLast = i === messages.length - 1 || messages[i + 1].sender_id !== msg.sender_id;
                                    return (
                                        <div key={msg.id} className={`flex items-end gap-1 ${isMine ? 'justify-end' : 'justify-start'}`} onMouseEnter={() => setHoveredMsgId(msg.id)} onMouseLeave={() => setHoveredMsgId(null)} onTouchStart={() => setHoveredMsgId(msg.id)}>
                                            {isMine && hoveredMsgId === msg.id && (
                                                <button onClick={() => deleteUserMessage(msg)} className="p-1.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors shrink-0"><TrashIcon className="h-3.5 w-3.5" /></button>
                                            )}
                                            <div className={`max-w-[78%] px-3 py-2 text-sm leading-relaxed break-words rounded-2xl ${isMine ? 'bg-indigo-600 text-white rounded-br-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-sm'}`}>
                                                {msg.body}
                                                {isLast && (
                                                    <div className={`text-[10px] mt-0.5 ${isMine ? 'text-indigo-200 text-right' : 'text-slate-400'}`}>
                                                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        {isMine && <span className="ml-1">{msg.read_at ? '✓✓' : '✓'}</span>}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={bottomRef} />
                            </div>

                            <div className="flex items-end gap-2 px-3 py-3 border-t border-slate-100 dark:border-slate-800 shrink-0 safe-bottom">
                                <textarea ref={textareaRef} value={body} onChange={(e) => { setBody(e.target.value); e.target.style.height = 'auto'; e.target.style.height = `${Math.min(e.target.scrollHeight, 100)}px`; }} onKeyDown={handleKeyDown} placeholder="Type a message…" rows={1}
                                    className="flex-1 resize-none rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 transition-all max-h-24 overflow-y-auto" />
                                <button onClick={send} disabled={sending || !body.trim()} className="shrink-0 p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-all self-end" style={{ minWidth: 40, minHeight: 40 }}>
                                    <PaperAirplaneIcon className="h-4 w-4" />
                                </button>
                            </div>
                        </>
                    )}

                    {/* GUEST CHAT VIEW */}
                    {(view === 'guest-chat' && activeGuest) && (
                        <>
                            <div className="flex items-center gap-2.5 px-3 py-2.5 bg-rose-600 text-white shrink-0 safe-top select-none relative" {...hdr}>
                                <DragPill />
                                <button onClick={goBack} className="p-2 rounded-lg hover:bg-rose-500 transition-colors" style={{ minWidth: 36, minHeight: 36 }}><ArrowLeftIcon className="h-5 w-5" /></button>
                                <div className="h-8 w-8 rounded-full bg-rose-400 flex items-center justify-center text-white text-sm font-bold shrink-0">{activeGuest.guest_name.charAt(0).toUpperCase()}</div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold truncate">{activeGuest.guest_name}</p>
                                    <p className="text-[10px] text-rose-200">Guest · {activeGuest.ip_address ?? 'Unknown IP'}</p>
                                </div>
                                <div ref={chatMenuRef} className="relative">
                                    <button onClick={() => { setShowChatMenu((s) => !s); setConfirmDeleteAll(false); }} className="p-2 rounded-lg hover:bg-rose-500 transition-colors" style={{ minWidth: 36, minHeight: 36 }}><EllipsisVerticalIcon className="h-5 w-5" /></button>
                                    {showChatMenu && (
                                        <div className="absolute right-0 top-9 w-48 rounded-xl bg-white dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden z-10">
                                            {!confirmDeleteAll ? (
                                                <button onClick={() => setConfirmDeleteAll(true)} className="flex items-center gap-2 w-full px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"><TrashIcon className="h-4 w-4" />Delete conversation</button>
                                            ) : (
                                                <div className="px-4 py-3">
                                                    <p className="text-xs text-slate-600 dark:text-slate-300 mb-3 font-medium">Delete all messages? This can't be undone.</p>
                                                    <div className="flex gap-2">
                                                        <button onClick={deleteConversation} className="flex-1 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors">Yes, delete</button>
                                                        <button onClick={() => setConfirmDeleteAll(false)} className="flex-1 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">Cancel</button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <button onClick={() => setOpen(false)} className="p-2 rounded-lg hover:bg-rose-500 transition-colors" style={{ minWidth: 36, minHeight: 36 }}><XMarkIcon className="h-5 w-5" /></button>
                            </div>

                            <div className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
                                {loadingGuestMessages ? (
                                    <div className="flex items-center justify-center h-full text-slate-400">
                                        <div className="flex gap-1.5">
                                            <span className="h-2 w-2 rounded-full bg-rose-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <span className="h-2 w-2 rounded-full bg-rose-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <span className="h-2 w-2 rounded-full bg-rose-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                                        </div>
                                    </div>
                                ) : guestMessages.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-slate-400"><p className="text-sm">No messages yet</p></div>
                                ) : guestMessages.map((msg, i) => {
                                    const isAdminMsg = msg.from === 'admin';
                                    const isLast = i === guestMessages.length - 1 || guestMessages[i + 1].from !== msg.from;
                                    return (
                                        <div key={msg.id} className={`flex items-end gap-1 ${isAdminMsg ? 'justify-end' : 'justify-start'}`} onMouseEnter={() => setHoveredMsgId(msg.id)} onMouseLeave={() => setHoveredMsgId(null)} onTouchStart={() => setHoveredMsgId(msg.id)}>
                                            {isAdminMsg && hoveredMsgId === msg.id && (
                                                <button onClick={() => deleteGuestMessage(msg)} className="p-1.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors shrink-0"><TrashIcon className="h-3.5 w-3.5" /></button>
                                            )}
                                            <div className={`max-w-[78%] px-3 py-2 text-sm leading-relaxed break-words rounded-2xl ${isAdminMsg ? 'bg-indigo-600 text-white rounded-br-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-sm'}`}>
                                                {msg.body}
                                                {isLast && (
                                                    <div className={`text-[10px] mt-0.5 ${isAdminMsg ? 'text-indigo-200 text-right' : 'text-slate-400'}`}>
                                                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        {isAdminMsg && <span className="ml-1">{msg.read_at ? '✓✓' : '✓'}</span>}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={bottomRef} />
                            </div>

                            <div className="flex items-end gap-2 px-3 py-3 border-t border-slate-100 dark:border-slate-800 shrink-0 safe-bottom">
                                <textarea ref={textareaRef} value={body} onChange={(e) => { setBody(e.target.value); e.target.style.height = 'auto'; e.target.style.height = `${Math.min(e.target.scrollHeight, 100)}px`; }} onKeyDown={handleKeyDown} placeholder="Reply to guest…" rows={1}
                                    className="flex-1 resize-none rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-rose-400 transition-all max-h-24 overflow-y-auto" />
                                <button onClick={send} disabled={sending || !body.trim()} className="shrink-0 p-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-all self-end" style={{ minWidth: 40, minHeight: 40 }}>
                                    <PaperAirplaneIcon className="h-4 w-4" />
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* ════ DRAGGABLE FAB ════ */}
            {/*
                The outer div handles all pointer events for dragging (setPointerCapture keeps
                tracking even when the pointer leaves the element).
                The inner <button> is purely visual and stops pointer events from bubbling
                so they don't conflict with the wrapper's drag logic.
                onClick on the wrapper fires only when didDrag is false (short tap/click).
            */}
            <div
                className="fixed z-[60] touch-none select-none"
                style={{
                    left: fabPos ? `${fabPos.x}px` : undefined,
                    top: fabPos ? `${fabPos.y}px` : undefined,
                    visibility: fabPos ? 'visible' : 'hidden',
                    cursor: fabDragging.current ? 'grabbing' : 'grab',
                    width: `${FAB_SIZE}px`,
                    height: `${FAB_SIZE}px`,
                }}
                onPointerDown={onFabWrapperPointerDown}
                onPointerMove={onFabWrapperPointerMove}
                onPointerUp={onFabWrapperPointerUp}
            >
                <button
                    className="relative flex items-center justify-center rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-500/40 transition-colors duration-150 w-full h-full"
                    aria-label="Open chat"
                    tabIndex={-1}
                >
                    {open ? <XMarkIcon className="h-5 w-5" /> : <ChatBubbleOvalLeftEllipsisIcon className="h-6 w-6" />}
                    {!open && totalUnread > 0 && (
                        <span className="absolute -top-1 -right-1 flex items-center justify-center h-5 min-w-[20px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold ring-2 ring-white dark:ring-slate-950 pointer-events-none">
                            {totalUnread > 99 ? '99+' : totalUnread}
                        </span>
                    )}
                </button>
            </div>
        </>
    );
}
