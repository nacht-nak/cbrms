import { useState, PropsWithChildren, ReactNode, useEffect } from 'react';
import { Link, usePage } from '@inertiajs/react';
import Dropdown from '@/Components/Dropdown';
import Sidebar from '@/Layouts/Sidebar';
import type { Breadcrumbs } from '@/types/breadcrumbs';
import type { User } from '@/types/user';
import type { ConversationItem } from '@/types/message';
import {
    Bars3Icon,
    SunIcon,
    MoonIcon,
    ChevronDownIcon,
    ChevronRightIcon,
} from '@heroicons/react/24/outline';
import NotificationBell from '@/Components/NotificationBell';
import FloatingChat from '@/Pages/Messages/FloatingChat';
import MessageDropdown from '@/Pages/Messages/MessageDropdown';

export default function Authenticated({
    header,
    children,
    breadcrumbs = [],
}: PropsWithChildren<{ header?: ReactNode; breadcrumbs?: Breadcrumbs }>) {
    const page = usePage().props as any;
    const backendUser = page.auth.user as User | null;

    const conversations: ConversationItem[] = page.conversations ?? [];
    const guestConversations = page.guestConversations ?? [];
    const isAdmin: boolean = page.isAdmin ?? false;

    if (!backendUser) return null;

    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [collapsed, setCollapsed] = useState(false);
    const [darkMode, setDarkMode] = useState(false);

    useEffect(() => {
        if (
            localStorage.theme === 'dark' ||
            (!('theme' in localStorage) &&
                window.matchMedia('(prefers-color-scheme: dark)').matches)
        ) {
            document.documentElement.classList.add('dark');
            setDarkMode(true);
        } else {
            document.documentElement.classList.remove('dark');
            setDarkMode(false);
        }
    }, []);

    const toggleDarkMode = () => {
        document.documentElement.classList.toggle('dark');
        localStorage.theme = darkMode ? 'light' : 'dark';
        setDarkMode(!darkMode);
    };

    const userInitials = [backendUser.profile?.fname, backendUser.profile?.lname]
        .filter(Boolean)
        .map((n) => n![0])
        .slice(0, 2)
        .join('')
        .toUpperCase() || backendUser.username[0].toUpperCase();

    const userDisplayName = [backendUser.profile?.fname, backendUser.profile?.lname]
        .filter(Boolean).join(' ') || backendUser.username;

    const userRole = backendUser.roles?.some((r: any) => r.name === 'admin')
        ? 'Admin'
        : backendUser.roles?.some((r: any) => r.name === 'user')
            ? 'User'
            : (backendUser as any).role ?? 'Member';

    return (
        <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-300">
            <Sidebar
                sidebarOpen={sidebarOpen}
                setSidebarOpen={setSidebarOpen}
                collapsed={collapsed}
                setCollapsed={setCollapsed}
                user={backendUser}
            />

            {/* Main column */}
            <div className="flex-1 flex flex-col min-w-0">

                {/* ── Topbar ── */}
                <header className="sticky top-0 z-30 bg-white/70 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-800/60 transition-colors duration-300">
                    <div className="px-3 sm:px-4 lg:px-6">
                        <div className="flex h-14 sm:h-16 items-center justify-between gap-2">

                            {/* Left: hamburger / collapse */}
                            <div className="flex items-center gap-1">
                                {/* Mobile hamburger */}
                                <button
                                    className="lg:hidden p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-all duration-150"
                                    onClick={() => setSidebarOpen(true)}
                                    aria-label="Open menu"
                                    style={{ minWidth: 40, minHeight: 40 }}
                                >
                                    <Bars3Icon className="h-5 w-5" />
                                </button>

                                {/* Desktop collapse */}
                                <button
                                    className="hidden lg:inline-flex p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-all duration-150"
                                    onClick={() => setCollapsed((s) => !s)}
                                    aria-label="Toggle sidebar"
                                >
                                    <Bars3Icon
                                        className={`h-5 w-5 transition-transform duration-300 ${collapsed ? 'rotate-90' : ''}`}
                                    />
                                </button>
                            </div>

                            {/* Right: actions + user */}
                            <div className="flex items-center gap-0.5 sm:gap-1">
                                {/* Dark mode toggle */}
                                <button
                                    onClick={toggleDarkMode}
                                    className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-yellow-400 transition-all duration-150"
                                    aria-label="Toggle theme"
                                    style={{ minWidth: 40, minHeight: 40 }}
                                >
                                    {darkMode ? (
                                        <SunIcon className="h-5 w-5 text-yellow-400" />
                                    ) : (
                                        <MoonIcon className="h-5 w-5" />
                                    )}
                                </button>

                                {/* Messages dropdown */}
                                <MessageDropdown
                                    conversations={conversations}
                                    guestConversations={guestConversations}
                                    isAdmin={isAdmin}
                                />

                                <NotificationBell />

                                <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-0.5 sm:mx-1" />

                                {/* User Dropdown */}
                                <Dropdown>
                                    <Dropdown.Trigger>
                                        <button className="flex items-center gap-2 rounded-xl px-1.5 sm:px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-150 group">
                                            {/* Avatar */}
                                            <div className="h-8 w-8 rounded-xl overflow-hidden shrink-0 shadow-md ring-2 ring-indigo-400/20">
                                                {backendUser.profile?.avatar ? (
                                                    <img
                                                        src={`/storage/${backendUser.profile?.avatar}`}
                                                        alt={backendUser.username}
                                                        className="h-8 w-8 object-cover"
                                                    />
                                                ) : (
                                                    <div className="h-8 w-8 bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center text-xs font-bold">
                                                        {userInitials}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Name + role — hidden on small screens */}
                                            <div className="hidden sm:flex flex-col items-start">
                                                <span className="text-sm font-semibold leading-none text-slate-700 dark:text-slate-200 max-w-[120px] truncate">
                                                    {userDisplayName}
                                                </span>
                                                <span className="text-[10px] text-slate-400 mt-0.5">
                                                    {userRole}
                                                </span>
                                            </div>

                                            <ChevronDownIcon className="h-4 w-4 text-slate-400 hidden sm:block group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors duration-150" />
                                        </button>
                                    </Dropdown.Trigger>
                                    <Dropdown.Content>
                                        {/* Show name/role inside dropdown on mobile since topbar hides it */}
                                        <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-700 sm:hidden">
                                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                                                {userDisplayName}
                                            </p>
                                            <p className="text-xs text-slate-400 mt-0.5">{userRole}</p>
                                        </div>
                                        <Dropdown.Link href={route('profile.edit')}>Profile</Dropdown.Link>
                                        <Dropdown.Link href={route('logout')} method="post" as="button">
                                            Log Out
                                        </Dropdown.Link>
                                    </Dropdown.Content>
                                </Dropdown>
                            </div>
                        </div>
                    </div>
                </header>

                {/* ── Breadcrumbs ── */}
                {breadcrumbs?.length > 0 && (
                    <div className="px-3 sm:px-4 lg:px-6 py-2.5 sm:py-3 border-b border-slate-100 dark:border-slate-800/60">
                        <nav className="flex flex-wrap items-center gap-1 sm:gap-1.5 text-xs sm:text-sm" aria-label="Breadcrumb">
                            {breadcrumbs.map((b, i) => (
                                <span key={i} className="flex items-center gap-1 sm:gap-1.5 min-w-0">
                                    {b.href ? (
                                        <Link
                                            href={b.href}
                                            className="text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors duration-150 font-medium truncate max-w-[100px] sm:max-w-none"
                                        >
                                            {b.title}
                                        </Link>
                                    ) : (
                                        <span className="text-slate-700 dark:text-slate-200 font-semibold truncate max-w-[140px] sm:max-w-none">
                                            {b.title}
                                        </span>
                                    )}
                                    {i < breadcrumbs.length - 1 && (
                                        <ChevronRightIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-slate-300 dark:text-slate-600 shrink-0" />
                                    )}
                                </span>
                            ))}
                        </nav>
                    </div>
                )}

                {/* Page header */}
                {header && <div className="px-3 sm:px-4 lg:px-6 pt-4 sm:pt-6 pb-2">{header}</div>}

                {/* ── Main content ── */}
                <main className="flex-1 overflow-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 max-w-7xl mx-auto w-full">
                    {children}
                </main>
            </div>

            {/* Floating Chat */}
            <FloatingChat
                conversations={conversations}
                guestConversations={guestConversations}
                isAdmin={isAdmin}
            />
        </div>
    );
}
