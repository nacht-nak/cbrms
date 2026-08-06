import { Dispatch, SetStateAction } from 'react';
import { Link } from '@inertiajs/react';
import ApplicationLogo from '@/Components/ApplicationLogo';
import { XMarkIcon, HomeIcon } from '@heroicons/react/24/outline';
import SidebarFooter from '@/Layouts/SidebarFooter';
import { Archive, ChartArea, DatabaseBackup, FileIcon, FolderIcon } from 'lucide-react';
import { User } from '@/types/user';

type NavLink = { name: string; route: string; icon: any; badge?: string };

export default function Sidebar({
    sidebarOpen,
    setSidebarOpen,
    collapsed,
    setCollapsed,
    user,
}: {
    sidebarOpen: boolean;
    setSidebarOpen: Dispatch<SetStateAction<boolean>>;
    collapsed?: boolean;
    setCollapsed?: Dispatch<SetStateAction<boolean>>;
    user: User;
}) {
    const isActive = (routeName: string) => route().current(routeName);

    // Role-based navigation links
    const navLinksByRole: Record<string, NavLink[]> = {
        admin: [
            { name: 'Dashboard', route: 'admin.dashboard', icon: HomeIcon },
            { name: 'User Files', route: 'all-files', icon: FileIcon },
            { name: 'My File Manager', route: 'file-manager', icon: FolderIcon },
            { name: 'Report', route: 'admin.reports', icon: ChartArea },
            { name: 'Backup', route: 'admin.backup', icon: DatabaseBackup },
            { name: 'Archived', route: 'archived.index', icon: Archive }
        ],
        user: [
            { name: 'Dashboard', route: 'user.dashboard', icon: HomeIcon },
            { name: 'My File Manager', route: 'user.file-manager', icon: FolderIcon },
        ],
    };

    // Normalize roles safely
    const roles: string[] = [];
    if (Array.isArray(user.roles) && user.roles.length > 0) {
        user.roles.forEach((r) => {
            if (typeof r.name === 'string') {
                roles.push(r.name.toLowerCase());
            }
        });
    } else if (user.role && typeof user.role === 'string') {
        roles.push(user.role.toLowerCase());
    } else {
        roles.push('user');
    }
    const dashboardHref = roles.includes('admin') ? '/admin/dashboard' : '/user/dashboard';
    // Merge all nav links for all roles without duplicates
    const navLinks = Array.from(
        new Map(
            roles.flatMap((role) => navLinksByRole[role] || []).map(link => [link.name, link])
        ).values()
    );
    const NavItem = ({ link, forceExpanded = false }: { link: NavLink; forceExpanded?: boolean }) => {
        const active = isActive(link.route);
        const showLabel = forceExpanded || !collapsed;

        return (
            <Link
                key={link.name}
                href={route(link.route)}
                aria-label={link.name}
                className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${active
                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/25'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200'
                    } ${!showLabel ? 'justify-center' : ''}`}
            >
                {active && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-white/60 rounded-r-full" />
                )}
                <link.icon className={`h-5 w-5 shrink-0 ${active ? 'text-white' : ''}`} />
                {showLabel && (
                    <span className={`text-sm font-medium leading-none ${active ? 'text-white' : ''}`}>
                        {link.name}
                    </span>
                )}
                {showLabel && link.badge && (
                    <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300">
                        {link.badge}
                    </span>
                )}
                {!showLabel && (
                    <span className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 whitespace-nowrap rounded-lg bg-slate-900 dark:bg-slate-700 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 group-hover:opacity-100 transition-opacity duration-150 shadow-xl z-50">
                        {link.name}
                        <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-900 dark:border-r-slate-700" />
                    </span>
                )}
            </Link>
        );
    };

    const SidebarContent = ({ mobile = false }: { mobile?: boolean }) => (
        <>
            {/* Logo */}
            <div
                className={`flex items-center h-16 border-b border-slate-200/80 dark:border-slate-700/60 shrink-0 ${collapsed && !mobile ? 'justify-center px-4' : 'px-5 justify-between'
                    }`}
            >
                <Link href={dashboardHref} className="flex items-center gap-2.5 overflow-hidden">
                    <ApplicationLogo
                        className={`shrink-0 transition-all duration-300 ${collapsed && !mobile ? 'h-8 w-8' : 'h-8 w-auto'
                            }`}
                    />
                    {(!collapsed || mobile) && (
                        <span className="text-base font-bold text-slate-800 dark:text-white tracking-tight truncate">
                            CBRMS
                        </span>
                    )}
                </Link>

                {mobile && (
                    <button
                        onClick={() => setSidebarOpen(false)}
                        className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                        aria-label="Close sidebar"
                    >
                        <XMarkIcon className="h-5 w-5" />
                    </button>
                )}
            </div>

            {(!collapsed || mobile) && (
                <p className="px-4 pt-5 pb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 select-none">
                    Menu
                </p>
            )}

            <nav className={`flex-1 overflow-y-auto px-3 ${collapsed && !mobile ? 'pt-6' : 'pt-2'} space-y-1`}>
                {navLinks.map((link) => (
                    <NavItem key={link.name} link={link} forceExpanded={mobile} />
                ))}
            </nav>

            {roles.includes('admin') && (
                <div className="shrink-0 mt-auto border-t border-slate-200/80 dark:border-slate-700/60">
                    <SidebarFooter collapsed={collapsed && !mobile} />
                </div>
            )}
        </>
    );

    return (
        <>
            {/* Mobile overlay */}
            {sidebarOpen && (
                <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setSidebarOpen(false)}>
                    <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
                </div>
            )}

            {/* Mobile sidebar */}
            <aside
                className={`fixed inset-y-0 left-0 z-50 lg:hidden flex flex-col w-72 bg-white dark:bg-slate-900 shadow-2xl transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                <SidebarContent mobile />
            </aside>

            {/* Desktop sidebar */}
            <aside
                className={`hidden lg:flex lg:flex-col lg:sticky lg:top-0 lg:h-screen bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800/60 transition-all duration-300 ease-in-out shrink-0 ${collapsed ? 'lg:w-[72px]' : 'lg:w-64'
                    }`}
            >
                <SidebarContent />
            </aside>
        </>
    );
}
