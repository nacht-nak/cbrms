import { useState } from "react";
import { User } from "@/types";
import ViewUser from "@/Components/ViewUser";

type Props = {
    users: User[];
    loading: boolean;
    onEdit: (user: User) => void;
    onDelete: (id: number) => void;
    onResendVerification: (id: number) => Promise<void>;
};

export default function UserTable({ users, loading, onEdit, onDelete, onResendVerification }: Props) {
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [resendingId, setResendingId] = useState<number | null>(null);

    const handleResend = async (id: number) => {
        setResendingId(id);
        await onResendVerification(id);
        setResendingId(null);
    };
    const openModal = (user: User) => { setSelectedUser(user); setIsModalOpen(true); };
    const closeModal = () => { setSelectedUser(null); setIsModalOpen(false); };

    const handleDelete = async (id: number) => {
        setDeletingId(id);
        await onDelete(id);
        setDeletingId(null);
    };

    const fullName = (profile: User['profile']) => {
        if (!profile) return "Unknown User";
        return `${profile.fname} ${profile.mname ? profile.mname[0] + '.' : ''} ${profile.lname} ${profile.suffix || ''}`.trim();
    };

    const initials = (profile: User['profile']) => {
        if (!profile) return "?";
        return `${profile.fname?.[0] || ''}${profile.lname?.[0] || ''}`.toUpperCase();
    };

    const avatarColors = [
        "from-violet-500 to-purple-600",
        "from-blue-500 to-indigo-600",
        "from-emerald-500 to-teal-600",
        "from-rose-500 to-pink-600",
        "from-amber-500 to-orange-600",
        "from-cyan-500 to-sky-600",
    ];

    const getAvatarColor = (id: number) => avatarColors[id % avatarColors.length];

    // Empty state
    if (!loading && users.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
                            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                </div>
                <p className="font-semibold text-gray-700 dark:text-gray-300">No users found</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Try adjusting your search or create a new user.</p>
            </div>
        );
    }

    /* ─── Skeleton row (desktop) ─── */
    const SkeletonRow = () => (
        <tr className="animate-pulse">
            {[...Array(5)].map((_, i) => (
                <td key={i} className="px-5 py-4">
                    <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded-full w-3/4" />
                </td>
            ))}
        </tr>
    );

    /* ─── Mobile skeleton card ─── */
    const MobileSkeletonCard = () => (
        <div className="p-4 bg-white dark:bg-gray-900 rounded-2xl ring-1 ring-gray-100 dark:ring-gray-800 animate-pulse">
            <div className="flex items-center gap-3 mb-3">
                <div className="w-11 h-11 rounded-xl bg-gray-100 dark:bg-gray-800 shrink-0" />
                <div className="flex-1 space-y-2">
                    <div className="h-3.5 bg-gray-100 dark:bg-gray-800 rounded-full w-2/3" />
                    <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-full w-1/3" />
                </div>
            </div>
            <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-full w-3/4" />
        </div>
    );

    /* ─── Mobile card (full-width, touch-friendly) ─── */
    const MobileCard = ({ user }: { user: User }) => (
        <div className="bg-white dark:bg-gray-900 rounded-2xl ring-1 ring-gray-100 dark:ring-gray-800 shadow-sm overflow-hidden">
            {/* Card header */}
            <div className="flex items-center gap-3 p-4">
                {/* Avatar */}
                <div className="shrink-0">
                    {user.profile?.avatar ? (
                        <img
                            src={`/storage/${user.profile.avatar}`}
                            alt={fullName(user.profile)}
                            className="w-11 h-11 rounded-xl object-cover ring-2 ring-white dark:ring-gray-800 shadow-sm"
                        />
                    ) : (
                        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${getAvatarColor(user.id)}
                            flex items-center justify-center text-white text-sm font-bold shadow-sm`}>
                            {initials(user.profile)}
                        </div>
                    )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white text-sm leading-tight truncate">
                        {fullName(user.profile)}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">
                        <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-600 dark:text-gray-300">
                            @{user.username}
                        </span>
                    </p>
                </div>

                {/* Unverified badge */}
                {!user.email_verified_at && (
                    <span className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-full
                        bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400
                        text-xs font-medium ring-1 ring-amber-200 dark:ring-amber-800">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        Unverified
                    </span>
                )}
            </div>

            {/* Email row */}
            <div className="px-4 pb-3 flex items-center gap-2">
                <svg className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-50 dark:border-gray-800" />

            {/* Action buttons — full width, touch-safe (min 44px tap targets) */}
            <div className="flex divide-x divide-gray-50 dark:divide-gray-800">
                <button
                    onClick={() => openModal(user)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium
                        text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/60
                        hover:text-gray-800 dark:hover:text-gray-200 transition-colors duration-150 min-h-[44px]"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    View
                </button>

                <button
                    onClick={() => onEdit(user)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium
                        text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20
                        transition-colors duration-150 min-h-[44px]"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                </button>

                {!user.email_verified_at && (
                    <button
                        onClick={() => handleResend(user.id)}
                        disabled={resendingId === user.id}
                        className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium
                            text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20
                            transition-colors duration-150 min-h-[44px] disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {resendingId === user.id ? (
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                        ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                        )}
                        Resend
                    </button>
                )}

                <button
                    onClick={() => handleDelete(user.id)}
                    disabled={deletingId === user.id}
                    className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium
                        text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20
                        transition-colors duration-150 min-h-[44px] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    {deletingId === user.id ? (
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                    ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    )}
                    Delete
                </button>
            </div>
        </div>
    );

    /* ─── Desktop row ─── */
    const DesktopRow = ({ user }: { user: User }) => (
        <tr className="group hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-150">
            <td className="px-5 py-4 whitespace-nowrap">
                {user.profile?.avatar ? (
                    <img
                        src={`/storage/${user.profile.avatar}`}
                        alt={fullName(user.profile)}
                        className="w-10 h-10 rounded-xl object-cover ring-2 ring-white dark:ring-gray-800 shadow-sm"
                    />
                ) : (
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getAvatarColor(user.id)}
                        flex items-center justify-center text-white text-xs font-bold shadow-sm`}>
                        {initials(user.profile)}
                    </div>
                )}
            </td>
            <td className="px-5 py-4 whitespace-nowrap">
                <p className="font-semibold text-gray-900 dark:text-white text-sm">{fullName(user.profile)}</p>
            </td>
            <td className="px-5 py-4 whitespace-nowrap">
                <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-gray-100 dark:bg-gray-800
                    text-gray-600 dark:text-gray-300 text-xs font-mono font-medium">
                    @{user.username}
                </span>
            </td>
            <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-2">
                    {user.email}
                    {!user.email_verified_at && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full
                            bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400
                            text-xs font-medium ring-1 ring-amber-200 dark:ring-amber-800">
                            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            Unverified
                        </span>
                    )}
                </div>
            </td>
            <td className="px-5 py-4 whitespace-nowrap">
                <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                    <button
                        onClick={() => openModal(user)}
                        title="View"
                        className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200
                            hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-150"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                    </button>
                    <button
                        onClick={() => onEdit(user)}
                        title="Edit"
                        className="p-2 rounded-lg text-indigo-500 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300
                            hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all duration-150"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                    </button>
                    <button
                        onClick={() => handleDelete(user.id)}
                        disabled={deletingId === user.id}
                        title="Delete"
                        className="p-2 rounded-lg text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300
                            hover:bg-red-50 dark:hover:bg-red-900/30 transition-all duration-150
                            disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {deletingId === user.id
                            ? <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        }
                    </button>
                    {!user.email_verified_at && (
                        <button
                            onClick={() => handleResend(user.id)}
                            disabled={resendingId === user.id}
                            title="Resend Verification"
                            className="p-2 rounded-lg text-amber-500 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300
                                hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-all duration-150
                                disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {resendingId === user.id
                                ? <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                            }
                        </button>
                    )}
                </div>
                <div className="flex items-center gap-1.5 group-hover:hidden">
                    <span className="text-xs text-gray-300 dark:text-gray-600 italic">Hover to manage</span>
                </div>
            </td>
        </tr>
    );

    return (
        <>
            {/* ── Mobile cards (< sm) ── */}
            <div className="grid gap-3 sm:hidden">
                {loading
                    ? Array.from({ length: 4 }).map((_, i) => <MobileSkeletonCard key={i} />)
                    : users.map((user) => <MobileCard key={user.id} user={user} />)
                }
            </div>

            {/* ── Desktop table (≥ sm) ── */}
            <div className="hidden sm:block overflow-x-auto rounded-xl ring-1 ring-gray-100 dark:ring-gray-800">
                <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800">
                    <thead>
                        <tr className="bg-gray-50 dark:bg-gray-800/60">
                            {["Profile", "Full Name", "Username", "Email", "Actions"].map((h) => (
                                <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider
                                    text-gray-500 dark:text-gray-400">
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-50 dark:divide-gray-800">
                        {loading
                            ? Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
                            : users.map((user) => <DesktopRow key={user.id} user={user} />)
                        }
                    </tbody>
                </table>
            </div>

            {/* View Modal */}
            {isModalOpen && selectedUser && (
                <ViewUser user={selectedUser} onClose={closeModal} />
            )}
        </>
    );
}
