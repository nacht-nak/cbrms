import { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import Authenticated from '@/Layouts/AuthenticatedLayout';
import UserAvatar from '@/Components/UserAvatar';
import type { ConversationItem } from '@/types/message';
import {
    MagnifyingGlassIcon,
    ChatBubbleLeftRightIcon,
    UserGroupIcon,
    GlobeAltIcon,
    ClockIcon,
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

interface Props {
    conversations: ConversationItem[];
    guestConversations: GuestConversation[];
    isAdmin: boolean;
}

type Tab = 'users' | 'guests';

function formatTime(iso: string | null) {
    if (!iso) return '';
    const date = new Date(iso);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 86400000);
    if (diff === 0) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diff === 1) return 'Yesterday';
    if (diff < 7) return date.toLocaleDateString([], { weekday: 'short' });
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function Index({ conversations, guestConversations, isAdmin }: Props) {
    const [tab, setTab] = useState<Tab>('users');
    const [search, setSearch] = useState('');

    const totalUserUnread = conversations.reduce((s, c) => s + (c.unread ?? 0), 0);
    const totalGuestUnread = guestConversations.reduce((s, c) => s + (c.unread ?? 0), 0);

    const filteredUsers = conversations.filter((c) => {
        const name = [c.other_user.profile?.fname, c.other_user.profile?.lname]
            .filter(Boolean).join(' ').toLowerCase();
        return name.includes(search.toLowerCase()) ||
            c.other_user.username.toLowerCase().includes(search.toLowerCase());
    });

    const filteredGuests = guestConversations.filter((g) =>
        g.guest_name.toLowerCase().includes(search.toLowerCase()) ||
        (g.ip_address ?? '').includes(search)
    );

    return (
        <Authenticated breadcrumbs={[{ title: 'Messages' }]}>
            <Head title="Messages" />
            <div className="max-w-2xl mx-auto px-0 sm:px-4">

                {/* ── Header ── */}
                <div className="flex items-center justify-between mb-4 sm:mb-6 px-1 sm:px-0">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100">Messages</h1>
                        <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                            {tab === 'users'
                                ? `${conversations.length} conversation${conversations.length !== 1 ? 's' : ''}`
                                : `${guestConversations.length} guest thread${guestConversations.length !== 1 ? 's' : ''}`}
                        </p>
                    </div>
                    <Link
                        href={route('messages.users')}
                        className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs sm:text-sm font-medium transition-colors shadow-sm shadow-indigo-500/30"
                    >
                        <ChatBubbleLeftRightIcon className="h-4 w-4" />
                        <span className="hidden xs:inline sm:inline">New conversation</span>
                        <span className="xs:hidden sm:hidden">New</span>
                    </Link>
                </div>

                {/* ── Tabs (admin only) ── */}
                {isAdmin && (
                    <div className="flex gap-1 p-1 mb-3 sm:mb-4 rounded-xl bg-slate-100 dark:bg-slate-800/60 mx-1 sm:mx-0">
                        <button
                            onClick={() => { setTab('users'); setSearch(''); }}
                            className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${tab === 'users'
                                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                        >
                            <UserGroupIcon className="h-4 w-4" />
                            Users
                            {totalUserUnread > 0 && (
                                <span className="px-1.5 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-bold">
                                    {totalUserUnread}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => { setTab('guests'); setSearch(''); }}
                            className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${tab === 'guests'
                                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                        >
                            <GlobeAltIcon className="h-4 w-4" />
                            <span className="hidden xs:inline">Guest Support</span>
                            <span className="xs:hidden">Guests</span>
                            {totalGuestUnread > 0 && (
                                <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                                    {totalGuestUnread}
                                </span>
                            )}
                        </button>
                    </div>
                )}

                {/* ── Search ── */}
                <div className="relative mb-3 sm:mb-4 mx-1 sm:mx-0">
                    <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder={tab === 'users' ? 'Search by name or username…' : 'Search by guest name or IP…'}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                </div>

                {/* ════ USER CONVERSATIONS ════ */}
                {tab === 'users' && (
                    <>
                        {filteredUsers.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                                <ChatBubbleLeftRightIcon className="h-10 w-10 sm:h-12 sm:w-12 mb-3 opacity-30" />
                                <p className="font-medium text-sm sm:text-base">{search ? 'No results' : 'No conversations yet'}</p>
                                {!search && (
                                    <Link href={route('messages.users')} className="mt-3 text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
                                        Start one →
                                    </Link>
                                )}
                            </div>
                        ) : (
                            <ul className="space-y-1.5 sm:space-y-2 mx-1 sm:mx-0">
                                {filteredUsers.map((c) => {
                                    const name = [c.other_user.profile?.fname, c.other_user.profile?.lname]
                                        .filter(Boolean).join(' ') || c.other_user.username;

                                    return (
                                        <li key={c.id}>
                                            <Link
                                                href={route('messages.show', c.other_user.id)}
                                                className={`flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-2xl border transition-all duration-150 group active:scale-[0.99] ${c.unread > 0
                                                    ? 'bg-indigo-50/60 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800 hover:border-indigo-300'
                                                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-md'}`}
                                            >
                                                <div className="relative shrink-0">
                                                    <UserAvatar user={c.other_user} size="md" />
                                                    {c.unread > 0 && (
                                                        <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-indigo-500 ring-2 ring-white dark:ring-slate-900" />
                                                    )}
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <p className={`font-semibold text-sm sm:text-base truncate ${c.unread > 0 ? 'text-slate-900 dark:text-white' : 'text-slate-800 dark:text-slate-100'}`}>
                                                            {name}
                                                        </p>
                                                        {c.updated_at && (
                                                            <span className="text-[10px] sm:text-xs text-slate-400 shrink-0">
                                                                {formatTime(c.updated_at)}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className={`text-xs sm:text-sm truncate mt-0.5 ${c.unread > 0 ? 'text-slate-700 dark:text-slate-300 font-medium' : 'text-slate-400'}`}>
                                                        {c.last_message ?? 'No messages yet'}
                                                    </p>
                                                </div>

                                                {c.unread > 0 && (
                                                    <span className="shrink-0 flex items-center justify-center h-5 min-w-[20px] px-1 rounded-full bg-indigo-600 text-white text-[10px] font-bold">
                                                        {c.unread > 9 ? '9+' : c.unread}
                                                    </span>
                                                )}
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </>
                )}

                {/* ════ GUEST CONVERSATIONS (admin only) ════ */}
                {tab === 'guests' && isAdmin && (
                    <>
                        {filteredGuests.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                                <GlobeAltIcon className="h-10 w-10 sm:h-12 sm:w-12 mb-3 opacity-30" />
                                <p className="font-medium text-sm sm:text-base">{search ? 'No results' : 'No guest messages yet'}</p>
                                <p className="text-xs sm:text-sm mt-1">Guest inquiries will appear here</p>
                            </div>
                        ) : (
                            <ul className="space-y-1.5 sm:space-y-2 mx-1 sm:mx-0">
                                {filteredGuests.map((g) => (
                                    <li key={g.id}>
                                        <Link
                                            href={route('messages.guest.show', g.id)}
                                            className={`flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-2xl border transition-all duration-150 group active:scale-[0.99] ${g.unread > 0
                                                ? 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800 hover:border-rose-300'
                                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-md'}`}
                                        >
                                            {/* Guest avatar */}
                                            <div className={`shrink-0 h-9 w-9 sm:h-10 sm:w-10 rounded-full flex items-center justify-center text-sm font-bold text-white relative ${g.unread > 0 ? 'bg-rose-500' : 'bg-slate-400 dark:bg-slate-600'}`}>
                                                {g.guest_name.charAt(0).toUpperCase()}
                                                {g.unread > 0 && (
                                                    <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-rose-600 ring-2 ring-white dark:ring-slate-900" />
                                                )}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="flex items-center gap-1.5 min-w-0">
                                                        <p className={`font-semibold text-sm sm:text-base truncate ${g.unread > 0 ? 'text-slate-900 dark:text-white' : 'text-slate-800 dark:text-slate-100'}`}>
                                                            {g.guest_name}
                                                        </p>
                                                        <span className="shrink-0 px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-medium text-slate-500 dark:text-slate-400 hidden sm:inline">
                                                            Guest
                                                        </span>
                                                    </div>
                                                    {g.updated_at && (
                                                        <span className="text-[10px] sm:text-xs text-slate-400 shrink-0">
                                                            {formatTime(g.updated_at)}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <p className={`text-xs sm:text-sm truncate flex-1 ${g.unread > 0 ? 'text-slate-700 dark:text-slate-300 font-medium' : 'text-slate-400'}`}>
                                                        {g.last_message ?? 'No messages yet'}
                                                    </p>
                                                    {g.ip_address && (
                                                        <span className="shrink-0 hidden sm:flex items-center gap-1 text-[10px] text-slate-400">
                                                            <ClockIcon className="h-3 w-3" />
                                                            {g.ip_address}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {g.unread > 0 && (
                                                <span className="shrink-0 flex items-center justify-center h-5 min-w-[20px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                                                    {g.unread > 9 ? '9+' : g.unread}
                                                </span>
                                            )}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </>
                )}
            </div>
        </Authenticated>
    );
}
