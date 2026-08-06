import type { ConversationUser } from '@/types/message';

interface Props {
    user: ConversationUser;
    size?: 'sm' | 'md' | 'lg';
}

const sizes = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base',
};

export default function UserAvatar({ user, size = 'md' }: Props) {
    const sizeClass = sizes[size];
    const initials = [user.profile?.fname, user.profile?.lname]
        .filter(Boolean)
        .map((n) => n![0])
        .join('')
        .toUpperCase() || user.username[0].toUpperCase();

    if (user.profile?.avatar) {
        return (
            <img
                src={`/storage/${user.profile.avatar}`}
                alt={user.username}
                className={`${sizeClass} rounded-xl object-cover ring-2 ring-indigo-400/20`}
            />
        );
    }

    return (
        <div
            className={`${sizeClass} rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-500/30 ring-2 ring-indigo-400/20`}
        >
            {initials}
        </div>
    );
}
