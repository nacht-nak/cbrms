import { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import Authenticated from '@/Layouts/AuthenticatedLayout';
import UserAvatar from '@/Components/UserAvatar';
import type { ConversationUser } from '@/types/message';
import { MagnifyingGlassIcon, ChatBubbleLeftEllipsisIcon } from '@heroicons/react/24/outline';

interface Props {
    users: ConversationUser[];
}

export default function Users({ users }: Props) {
    const [search, setSearch] = useState('');

    const filtered = users.filter((u) => {
        const name = [u.profile?.fname, u.profile?.lname]
            .filter(Boolean).join(' ').toLowerCase();
        return (
            name.includes(search.toLowerCase()) ||
            u.username.toLowerCase().includes(search.toLowerCase())
        );
    });

    return (
        <Authenticated
            breadcrumbs={[
                { title: 'Messages', href: route('messages.index') },
                { title: 'New Conversation' },
            ]}
        >
            <Head title='Users Messages' />
            <div className="max-w-2xl mx-auto px-0 sm:px-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-4 sm:mb-6 px-1 sm:px-0">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100">
                            New Conversation
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                            Select a user to start messaging
                        </p>
                    </div>
                </div>

                {/* Search */}
                <div className="relative mb-3 sm:mb-4 mx-1 sm:mx-0">
                    <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search users..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        autoFocus
                    />
                </div>

                {/* Count */}
                {search && (
                    <p className="text-xs text-slate-400 mb-3 px-2 sm:px-1">
                        {filtered.length} result{filtered.length !== 1 ? 's' : ''} for "{search}"
                    </p>
                )}

                {/* List */}
                {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                        <MagnifyingGlassIcon className="h-10 w-10 sm:h-12 sm:w-12 mb-3 opacity-40" />
                        <p className="font-medium text-sm sm:text-base">No users found</p>
                        <p className="text-xs sm:text-sm mt-1">Try a different name or username</p>
                    </div>
                ) : (
                    <ul className="space-y-1.5 sm:space-y-2 mx-1 sm:mx-0">
                        {filtered.map((u) => {
                            const displayName = [u.profile?.fname, u.profile?.lname]
                                .filter(Boolean).join(' ') || u.username;

                            return (
                                <li key={u.id}>
                                    <Link
                                        href={route('messages.show', u.id)}
                                        className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-md active:scale-[0.99] transition-all duration-150 group"
                                    >
                                        <UserAvatar user={u} size="md" />

                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-sm sm:text-base text-slate-800 dark:text-slate-100 truncate">
                                                {displayName}
                                            </p>
                                            <p className="text-xs text-slate-400 mt-0.5">
                                                @{u.username}
                                            </p>
                                        </div>

                                        {/* Show message CTA always on mobile (no hover), hover-only on desktop */}
                                        <span className="shrink-0 flex items-center gap-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-150">
                                            <ChatBubbleLeftEllipsisIcon className="h-4 w-4" />
                                            <span className="hidden sm:inline">Message</span>
                                        </span>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </Authenticated>
    );
}
