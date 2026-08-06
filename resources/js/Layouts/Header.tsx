import { PageProps } from "@/types";
import { Link, usePage } from "@inertiajs/react";
import ThemeToggle from "./ThemeToggle";
import Dropdown from "@/Components/Dropdown";
import { ChevronDownIcon, LayoutDashboard, LogOut, Shield, User2 } from "lucide-react";

interface BackendUser {
    username?: string;
    role?: string;
    profile?: {
        fname?: string;
        lname?: string;
        avatar?: string;
    };
    roles?: { name: string }[];
}

export default function Header() {
    const { auth } = usePage<PageProps>().props;
    const backendUser = (usePage<PageProps>().props as any).backendUser as BackendUser | undefined;

    const authUser = auth.user as any;
    const roles = backendUser?.roles ?? authUser?.roles ?? [];
    const profile = backendUser?.profile ?? authUser?.profile;
    const username = backendUser?.username ?? authUser?.username ?? authUser?.name;

    const currentUrl = usePage().url;
    const isOnLogin = currentUrl.startsWith("/login");

    const isAdmin = roles?.some((r: any) => r.name === "admin") || auth.role === "admin";
    const isUser = roles?.some((r: any) => r.name === "user") || auth.role === "user";

    const dashboardHref = auth.user
        ? isAdmin
            ? "/admin/dashboard"
            : "/user/dashboard"
        : null;

    const initials =
        [profile?.fname, profile?.lname]
            .filter(Boolean)
            .map((n: string) => n[0])
            .slice(0, 2)
            .join("")
            .toUpperCase() ||
        username?.[0]?.toUpperCase() ||
        "?";

    const displayName =
        [profile?.fname, profile?.lname].filter(Boolean).join(" ") ||
        username ||
        "User";

    const roleLabel = isAdmin ? "Administrator" : isUser ? "User" : "Member";
    const RoleIcon = isAdmin ? Shield : User2;

    return (
        <header className="
            fixed top-0 left-0 right-0 z-50
            bg-white/70 dark:bg-gray-950/70
            backdrop-blur-xl
            border-b border-gray-200/60 dark:border-white/[0.06]
            supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-gray-950/60
        ">
            <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">

                {/* ── Brand ── */}
                <Link href="/" className="flex items-center gap-3 group shrink-0">
                    <div className="
                        relative w-9 h-9 rounded-xl overflow-hidden
                        ring-1 ring-black/10 dark:ring-white/10
                        shadow-sm group-hover:shadow-md group-hover:ring-indigo-400/40
                        transition-all duration-200
                    ">
                        <img src="/bglogo.jpeg" alt="Logo" className="w-full h-full object-cover" />
                    </div>
                    <span className="hidden sm:block text-sm font-bold tracking-wider text-gray-800 dark:text-white uppercase">
                        CBRMS
                    </span>
                </Link>

                {/* ── Right Actions ── */}
                <div className="flex items-center gap-1.5">
                    <ThemeToggle />

                    <div className="w-px h-5 bg-gray-200 dark:bg-white/10 mx-1" aria-hidden="true" />

                    {auth.user ? (
                        <Dropdown>
                            <Dropdown.Trigger>
                                <button className="
                                    flex items-center gap-2.5
                                    rounded-xl px-2.5 py-1.5
                                    hover:bg-gray-100 dark:hover:bg-white/[0.06]
                                    border border-transparent
                                    hover:border-gray-200 dark:hover:border-white/10
                                    transition-all duration-150
                                    focus:outline-none focus:ring-2 focus:ring-indigo-500/50
                                    group
                                ">
                                    {/* Avatar */}
                                    {profile?.avatar ? (
                                        <img
                                            src={`/storage/${profile.avatar}`}
                                            alt={displayName}
                                            className="h-8 w-8 rounded-lg object-cover ring-2 ring-indigo-500/20"
                                        />
                                    ) : (
                                        <div className="
                                            h-8 w-8 rounded-lg
                                            bg-gradient-to-br from-indigo-500 to-violet-600
                                            text-white text-xs font-bold
                                            flex items-center justify-center
                                            shadow-sm shadow-indigo-500/30
                                            ring-2 ring-indigo-400/20
                                            select-none shrink-0
                                        ">
                                            {initials}
                                        </div>
                                    )}

                                    {/* Name + Role */}
                                    <div className="hidden sm:flex flex-col items-start leading-none">
                                        <span className="text-sm font-semibold text-gray-800 dark:text-white">
                                            {displayName}
                                        </span>
                                        <span className="flex items-center gap-1 mt-0.5 text-[10px] font-medium text-gray-400 dark:text-gray-500">
                                            <RoleIcon className="w-2.5 h-2.5" />
                                            {roleLabel}
                                        </span>
                                    </div>

                                    <ChevronDownIcon className="
                                        h-3.5 w-3.5 text-gray-400 hidden sm:block
                                        group-hover:text-gray-600 dark:group-hover:text-gray-300
                                        transition-all duration-150
                                        group-data-[state=open]:rotate-180
                                    " />
                                </button>
                            </Dropdown.Trigger>

                            <Dropdown.Content>
                                {/* ── User info header ── */}
                                <div className="
                                    px-3 py-2.5
                                    border-b border-gray-100 dark:border-gray-700/60
                                    bg-gray-50 dark:bg-gray-800/60
                                    rounded-t-lg
                                ">
                                    <p className="
                                        text-xs font-semibold truncate
                                        text-gray-800 dark:text-gray-100
                                    ">
                                        {displayName}
                                    </p>
                                    <p className="
                                        text-[10px] mt-0.5
                                        flex items-center gap-1
                                        text-gray-400 dark:text-gray-500
                                    ">
                                        <RoleIcon className="w-2.5 h-2.5" />
                                        {roleLabel}
                                    </p>
                                </div>

                                {/* ── Dashboard ── */}
                                <Dropdown.Link href={dashboardHref!}>
                                    <span className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                                        <LayoutDashboard className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />
                                        Dashboard
                                    </span>
                                </Dropdown.Link>

                                <div className="my-1 border-t border-gray-100 dark:border-gray-700/60" />

                                {/* ── Log Out ── */}
                                <Dropdown.Link href={route("logout")} method="post" as="button">
                                    <span className="flex items-center gap-2 text-sm text-red-500 dark:text-red-400">
                                        <LogOut className="h-3.5 w-3.5" />
                                        Log Out
                                    </span>
                                </Dropdown.Link>
                            </Dropdown.Content>
                        </Dropdown>
                    ) : (
                        isOnLogin ? null : (
                            <Link
                                href="/login"
                                className="
                                    inline-flex items-center gap-1.5 px-4 py-2
                                    text-sm font-semibold rounded-xl
                                    bg-indigo-600 hover:bg-indigo-700
                                    dark:bg-indigo-500 dark:hover:bg-indigo-600
                                    text-white shadow-sm shadow-indigo-500/30
                                    transition-all duration-150
                                    focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
                                    dark:focus:ring-offset-gray-950
                                "
                            >
                                Sign in
                            </Link>
                        )
                    )}
                </div>
            </nav>
        </header>
    );
}
