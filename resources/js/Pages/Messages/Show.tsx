import { useEffect, useRef, useState, useCallback } from 'react';
import { Head, router, useForm, usePage } from '@inertiajs/react';

import UserAvatar from '@/Components/UserAvatar';
import echo from '@/echo';
import type { Message, ConversationUser } from '@/types/message';
import type { User } from '@/types/user';
import { PaperAirplaneIcon, ChevronLeftIcon } from '@heroicons/react/24/solid';
import Authenticated from '@/Layouts/AuthenticatedLayout';

interface Props {
    conversation: { id: number };
    other_user: ConversationUser;
    messages: Message[];
}

export default function Show({ conversation, other_user, messages: initialMessages }: Props) {
    const { auth } = usePage().props as any;
    const authUser = auth.user as User;

    const [messages, setMessages] = useState<Message[]>(initialMessages);
    const bottomRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const { data, setData, processing, reset } = useForm({ body: '' });

    const displayName = [other_user.profile?.fname, other_user.profile?.lname]
        .filter(Boolean).join(' ') || other_user.username;

    // ── Real-time subscription ──────────────────────────────────────────────
    useEffect(() => {
        const channel = echo
            .private(`conversation.${conversation.id}`)
            .listen('.MessageSent', (e: Message) => {
                setMessages((prev) => {
                    if (prev.some((m) => m.id === e.id)) return prev;
                    return [...prev, e];
                });
            });

        return () => {
            channel.stopListening('.MessageSent');
            echo.leave(`conversation.${conversation.id}`);
        };
    }, [conversation.id]);

    // ── Auto-scroll ─────────────────────────────────────────────────────────
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // ── Auto-grow textarea ──────────────────────────────────────────────────
    const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setData('body', e.target.value);
        e.target.style.height = 'auto';
        e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
    };

    // ── Send ─────────────────────────────────────────────────────────────────
    const send = useCallback((e?: React.FormEvent) => {
        e?.preventDefault();
        if (!data.body.trim() || processing) return;

        router.post(
            route('messages.store', conversation.id),
            { body: data.body },
            {
                preserveScroll: true,
                onSuccess: () => {
                    reset('body');
                    if (textareaRef.current) {
                        textareaRef.current.style.height = 'auto';
                    }
                },
            },
        );
    }, [data.body, processing, conversation.id]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            send();
        }
    };

    const grouped = groupByDate(messages);

    return (
        <Authenticated
            breadcrumbs={[
                { title: 'Messages', href: route('messages.index') },
                { title: displayName },
            ]}
        >
            <Head title={`Message - @${other_user.username}`} />

            {/*
             * Mobile: use dvh for safe viewport, subtract a smaller header offset
             * Desktop: keep the original calc
             */}
            <div className="max-w-2xl mx-auto flex flex-col h-[calc(100dvh-7rem)] sm:h-[calc(100dvh-8rem)] lg:h-[calc(100vh-13rem)]">

                {/* ── Chat header ── */}
                <div className="flex items-center gap-3 pb-3 sm:pb-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
                    {/* Back button visible on all mobile sizes */}
                    <a
                        href={route('messages.index')}
                        className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all -ml-1"
                        aria-label="Back to messages"
                    >
                        <ChevronLeftIcon className="h-5 w-5" />
                    </a>

                    <UserAvatar user={other_user} size="md" />

                    <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 dark:text-slate-100 truncate text-sm sm:text-base">
                            {displayName}
                        </p>
                        <p className="text-xs text-slate-400">@{other_user.username}</p>
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
                                    const isMine = msg.sender_id === authUser.id;
                                    const isFirst = i === 0 || msgs[i - 1].sender_id !== msg.sender_id;
                                    const isLast = i === msgs.length - 1 || msgs[i + 1].sender_id !== msg.sender_id;

                                    return (
                                        <div
                                            key={msg.id}
                                            className={`flex items-end gap-2 ${isMine ? 'justify-end' : 'justify-start'} ${isFirst ? 'mt-3' : 'mt-0.5'}`}
                                        >
                                            {/* Avatar for other user — only on last bubble in a group */}
                                            {!isMine && (
                                                <div className="w-6 sm:w-7 shrink-0 self-end mb-1">
                                                    {isLast && <UserAvatar user={other_user} size="sm" />}
                                                </div>
                                            )}

                                            <div className={`max-w-[80%] sm:max-w-[70%] group relative ${isMine ? 'items-end' : 'items-start'} flex flex-col`}>
                                                <div
                                                    className={`px-3 sm:px-4 py-2 sm:py-2.5 text-sm shadow-sm leading-relaxed break-words whitespace-pre-wrap ${isMine
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
                                                        {isMine && (
                                                            <span className="ml-1">
                                                                {msg.read_at ? '✓✓' : '✓'}
                                                            </span>
                                                        )}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}

                    <div ref={bottomRef} />
                </div>

                {/* ── Input ── */}
                <form
                    onSubmit={send}
                    className="flex items-end gap-2 sm:gap-3 pt-3 sm:pt-4 border-t border-slate-200 dark:border-slate-800 shrink-0"
                    style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
                >
                    <textarea
                        ref={textareaRef}
                        value={data.body}
                        onChange={handleTextareaChange}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a message… (Enter to send)"
                        rows={1}
                        className="flex-1 resize-none rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 sm:px-4 py-2.5 sm:py-3 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all max-h-[140px] overflow-y-auto"
                    />
                    <button
                        type="submit"
                        disabled={processing || !data.body.trim()}
                        className="shrink-0 p-2.5 sm:p-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-all duration-150 shadow-md shadow-indigo-500/30 self-end active:scale-95"
                        style={{ minWidth: 44, minHeight: 44 }}
                    >
                        <PaperAirplaneIcon className="h-5 w-5" />
                    </button>
                </form>
            </div>
        </Authenticated>
    );
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function groupByDate(messages: Message[]): Record<string, Message[]> {
    return messages.reduce<Record<string, Message[]>>((acc, msg) => {
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
