import { Link } from '@inertiajs/react';
import { UsersIcon, BuildingOffice2Icon } from '@heroicons/react/24/outline';

type FooterLink = { name: string; route: string; icon: React.ElementType };

const footerLinks: FooterLink[] = [
    { name: 'Users', route: 'users', icon: UsersIcon },
    { name: 'Departments', route: 'departments', icon: BuildingOffice2Icon },
];

export default function SidebarFooter({ collapsed }: { collapsed?: boolean }) {
    return (
        <div className={`border-t border-gray-200 dark:border-gray-700 ${collapsed ? 'px-2 py-3' : 'px-3 py-4'}`}>
            {!collapsed && (
                <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                    Management
                </p>
            )}

            <nav className="space-y-0.5">
                {footerLinks.map((link) => {
                    const isActive = route().current(link.route);
                    const Icon = link.icon;

                    return (
                        <Link
                            key={link.name}
                            href={route(link.route)}
                            aria-label={link.name}
                            className={`
                                group relative flex items-center
                                ${collapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2'}
                                rounded-xl text-sm font-medium
                                transition-colors duration-150
                                ${isActive
                                    ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300'
                                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                                }
                            `}
                        >
                            {/* Active indicator bar */}
                            {isActive && (
                                <span className="absolute left-0 inset-y-1.5 w-0.5 rounded-full bg-indigo-600 dark:bg-indigo-400" />
                            )}

                            {/* Icon */}
                            <Icon
                                className={`
                                    flex-shrink-0 h-4 w-4 transition-colors
                                    ${isActive
                                        ? 'text-indigo-600 dark:text-indigo-400'
                                        : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300'
                                    }
                                `}
                            />

                            {/* Label */}
                            {!collapsed && (
                                <span className="truncate">{link.name}</span>
                            )}

                            {/* Tooltip (collapsed only) */}
                            {collapsed && (
                                <span className="
                                    pointer-events-none absolute left-full ml-3 z-50
                                    top-1/2 -translate-y-1/2
                                    whitespace-nowrap rounded-lg
                                    bg-gray-900 dark:bg-gray-700
                                    px-2.5 py-1.5 text-xs font-medium text-white
                                    shadow-lg
                                    opacity-0 scale-95
                                    group-hover:opacity-100 group-hover:scale-100
                                    transition-all duration-150 origin-left
                                ">
                                    {link.name}
                                    {/* Arrow */}
                                    <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900 dark:border-r-gray-700" />
                                </span>
                            )}
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}
