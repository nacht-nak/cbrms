import { User } from "@/types";
import {
    XMarkIcon,
    EnvelopeIcon,
    UserIcon,
    PhoneIcon,
    MapPinIcon,
    CakeIcon,
    BuildingOffice2Icon,
    IdentificationIcon,
} from "@heroicons/react/24/outline";

type Props = {
    user: User;
    onClose: () => void;
};

const InfoRow = ({
    icon: Icon,
    label,
    value,
}: {
    icon: React.ElementType;
    label: string;
    value?: string | null;
}) => {
    if (!value) return null;
    return (
        <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center mt-0.5">
                <Icon className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
            </div>
            <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                    {label}
                </p>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-100 break-words">
                    {value}
                </p>
            </div>
        </div>
    );
};

export default function ViewUser({ user, onClose }: Props) {
    const profile = user.profile;

    const fullName = () => {
        if (!profile) return "";
        return [
            profile.fname,
            profile.mname ? profile.mname[0] + "." : null,
            profile.lname,
            profile.suffix || null,
        ]
            .filter(Boolean)
            .join(" ");
    };

    const initials = `${profile?.fname?.[0] ?? ""}${profile?.lname?.[0] ?? ""}`.toUpperCase();

    const formatDate = (date?: string | null) => {
        if (!date) return null;
        return new Date(date).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    };

    const formatGender = (g?: string | null) => {
        if (!g) return null;
        return g.charAt(0).toUpperCase() + g.slice(1);
    };

    // Close on backdrop click
    const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) onClose();
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/40 dark:bg-black/60 backdrop-blur-sm"
            onClick={handleBackdrop}
        >
            <div className="
                relative w-full max-w-md
                bg-white dark:bg-gray-900
                rounded-2xl shadow-2xl
                border border-gray-200 dark:border-gray-700
                overflow-hidden
                animate-[fadeScaleIn_0.2s_ease-out]
            ">
                {/* ── Top banner + avatar ── */}
                <div className="relative h-24 bg-gradient-to-br from-indigo-500 to-violet-600 dark:from-indigo-700 dark:to-violet-800">
                    {/* Close button */}
                    <button
                        onClick={onClose}
                        className="
                            absolute top-3 right-3
                            p-1.5 rounded-lg
                            bg-white/20 hover:bg-white/30
                            text-white transition-colors
                        "
                    >
                        <XMarkIcon className="w-4 h-4" />
                    </button>

                    {/* Avatar — overlaps banner */}
                    <div className="absolute -bottom-10 left-6">
                        {profile?.avatar ? (
                            <img
                                src={`/storage/${profile.avatar}`}
                                alt={fullName()}
                                className="w-20 h-20 rounded-2xl object-cover border-4 border-white dark:border-gray-900 shadow-lg"
                                onError={(e) => {
                                    e.currentTarget.style.display = "none";
                                    (e.currentTarget.nextElementSibling as HTMLElement | null)
                                        ?.style.setProperty("display", "flex");
                                }}
                            />
                        ) : null}
                        {/* Initials fallback — shown when no avatar or image fails to load */}
                        <div
                            className="w-20 h-20 rounded-2xl border-4 border-white dark:border-gray-900 shadow-lg bg-gradient-to-br from-indigo-400 to-violet-500 items-center justify-center"
                            style={{ display: profile?.avatar ? "none" : "flex" }}
                        >
                            <span className="text-2xl font-bold text-white tracking-wide">
                                {initials}
                            </span>
                        </div>
                    </div>
                </div>

                {/* ── Name + badges ── */}
                <div className="px-6 pt-14 pb-4 border-b border-gray-100 dark:border-gray-800">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
                        {fullName()}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        @{user.username}
                    </p>

                    <div className="flex flex-wrap gap-2 mt-3">
                        {/* Role badge */}
                        {user.role && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300">
                                <IdentificationIcon className="w-3 h-3" />
                                {user.role}
                            </span>
                        )}
                        {/* Department badge */}
                        {profile?.department?.name && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300">
                                <BuildingOffice2Icon className="w-3 h-3" />
                                {profile.department.name}
                            </span>
                        )}
                        {/* Gender badge */}
                        {profile?.gender && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                                {formatGender(profile.gender)}
                            </span>
                        )}
                    </div>
                </div>

                {/* ── Info grid ── */}
                <div className="px-6 py-5 space-y-4 max-h-[340px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700">
                    <InfoRow icon={EnvelopeIcon} label="Email" value={user.email} />
                    <InfoRow icon={PhoneIcon} label="Contact Number" value={profile?.contact_number} />
                    <InfoRow icon={CakeIcon} label="Birthdate" value={formatDate(profile?.birthdate)} />
                    <InfoRow icon={MapPinIcon} label="Address" value={profile?.address} />
                    <InfoRow icon={UserIcon} label="Full Name" value={fullName()} />
                </div>

                {/* ── Footer ── */}
                <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 flex justify-end">
                    <button
                        onClick={onClose}
                        className="
                            px-5 py-2 text-sm font-semibold rounded-xl
                            bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800
                            dark:bg-indigo-500 dark:hover:bg-indigo-600
                            text-white shadow-lg shadow-indigo-500/25
                            transition-all
                            focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900
                        "
                    >
                        Close
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes fadeScaleIn {
                    from { opacity: 0; transform: scale(0.96) translateY(8px); }
                    to   { opacity: 1; transform: scale(1)    translateY(0); }
                }
            `}</style>
        </div>
    );
}
