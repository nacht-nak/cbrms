import InputError from '@/Components/InputError';
import { Transition } from '@headlessui/react';
import { Link, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler, forwardRef, useRef, useState } from 'react';

type Gender = 'male' | 'female' | 'other' | '';

interface Profile {
    fname: string; mname: string | null; lname: string; suffix: string | null;
    gender: Gender; birthdate: string; contact_number: string | null;
    address: string | null; avatar: string | null;
}
interface AuthUser {
    username: string; email: string; email_verified_at: string | null; profile: Profile | null;
}

// ─── Design tokens — explicit colours for both modes ─────────────────────────
const fieldBase =
    'block w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-all duration-200 ' +
    'border-gray-300 bg-white text-gray-900 placeholder-gray-400 ' +
    'focus:border-violet-500 focus:ring-2 focus:ring-violet-500/25 ' +
    'dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 ' +
    'dark:focus:border-violet-400 dark:focus:ring-violet-400/25';

// ─── Primitives ───────────────────────────────────────────────────────────────
const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { isFocused?: boolean }>(
    ({ className = '', isFocused, ...props }, ref) => (
        <input ref={ref} autoFocus={isFocused} className={`${fieldBase} ${className}`} {...props} />
    ),
);
Input.displayName = 'Input';

function Field({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    return <div className={`flex flex-col gap-1.5 ${className}`}>{children}</div>;
}

function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
    return (
        <label htmlFor={htmlFor}
            className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300">
            {children}
        </label>
    );
}

// ─── Section card — solid header colours that work in both modes ──────────────
function SectionCard({ icon, title, description, children }: {
    icon: React.ReactNode; title: string; description?: string; children: React.ReactNode;
}) {
    return (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            {/* Header: light=gray-50, dark=gray-800 with visible text */}
            <div className="flex items-center gap-3 border-b border-gray-200 bg-gray-50 px-5 py-4 dark:border-gray-700 dark:bg-gray-800">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-gray-600 shadow-sm ring-1 ring-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:ring-gray-600">
                    {icon}
                </span>
                <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
                    {description && <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>}
                </div>
            </div>
            <div className="space-y-4 px-5 py-5">{children}</div>
        </div>
    );
}

function SaveButton({ processing, label = 'Save Changes' }: { processing: boolean; label?: string }) {
    return (
        <button type="submit" disabled={processing}
            className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-gray-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-violet-600 dark:hover:bg-violet-500">
            {processing ? (
                <><svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" /></svg>Saving…</>
            ) : label}
        </button>
    );
}

function SuccessBadge({ show }: { show: boolean }) {
    return (
        <Transition show={show} enter="transition-all duration-300 ease-out" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="transition-all duration-200 ease-in" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/30">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4.5 12.75l6 6 9-13.5" /></svg>
                Saved
            </span>
        </Transition>
    );
}

// ─── Icons ────────────────────────────────────────────────────────────────────
const PhotoIcon = () => <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 18h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v10.5A1.5 1.5 0 003.75 18z" /></svg>;
const AccountIcon = () => <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>;
const PersonIcon = () => <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6 6h.008v.008H6V6z" /></svg>;

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function UpdateProfileInformation({ mustVerifyEmail, status, className = '' }: {
    mustVerifyEmail: boolean; status?: string; className?: string;
}) {
    const user = usePage().props.auth.user as AuthUser;
    const profile = user?.profile;
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(profile?.avatar ? `/storage/${profile.avatar}` : null);
    const [isDragging, setIsDragging] = useState(false);

    const { data, setData, post, errors, processing, recentlySuccessful } = useForm({
        _method: 'PATCH',
        username: user?.username ?? '', email: user?.email ?? '', avatar: null as File | null,
        fname: profile?.fname ?? '', mname: profile?.mname ?? '', lname: profile?.lname ?? '',
        suffix: profile?.suffix ?? '', gender: (profile?.gender ?? '') as Gender,
        birthdate: profile?.birthdate ?? '', contact_number: profile?.contact_number ?? '', address: profile?.address ?? '',
    });

    const applyFile = (file: File | null) => { setData('avatar', file); if (file) setAvatarPreview(URL.createObjectURL(file)); };
    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsDragging(false); const file = e.dataTransfer.files?.[0] ?? null; if (file?.type.startsWith('image/')) applyFile(file); };
    const submit: FormEventHandler = (e) => { e.preventDefault(); post(route('profile.update')); };
    const initials = [data.fname?.[0], data.lname?.[0]].filter(Boolean).map((c) => c!.toUpperCase()).join('') || '?';

    return (
        <section className={`mx-auto w-full max-w-2xl space-y-5 ${className}`}>
            <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Profile Information</h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage your account details and personal information.</p>
            </div>

            <form onSubmit={submit} className="space-y-4">

                {/* Avatar */}
                <SectionCard title="Profile Photo" icon={<PhotoIcon />}>
                    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
                        <div className="relative shrink-0">
                            {avatarPreview
                                ? <img src={avatarPreview} alt="Avatar" className="h-20 w-20 rounded-2xl object-cover ring-2 ring-gray-300 dark:ring-gray-600" />
                                : <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-xl font-bold text-white">{initials}</div>}
                            <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white bg-emerald-400 dark:border-gray-800" />
                        </div>
                        <div className="w-full flex-1">
                            <div
                                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                onDragLeave={() => setIsDragging(false)}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                                className={['flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-5 text-center transition-all duration-200',
                                    isDragging
                                        ? 'border-violet-500 bg-violet-50 dark:border-violet-400 dark:bg-violet-500/10'
                                        : 'border-gray-300 hover:border-violet-400 hover:bg-gray-50 dark:border-gray-600 dark:hover:border-violet-500 dark:hover:bg-gray-700/50',
                                ].join(' ')}>
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-700">
                                    <svg className="h-4 w-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                        <span className="text-violet-600 dark:text-violet-400">Click to upload</span> or drag and drop
                                    </p>
                                    <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">JPG, PNG or WebP · max 2 MB</p>
                                </div>
                            </div>
                            <input ref={fileInputRef} id="avatar" type="file" accept="image/jpg,image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => applyFile(e.target.files?.[0] ?? null)} />
                            <InputError className="mt-2" message={errors.avatar} />
                        </div>
                    </div>
                </SectionCard>

                {/* Account */}
                <SectionCard title="Account" description="Login credentials and email address" icon={<AccountIcon />}>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <Field>
                            <Label htmlFor="username">Username</Label>
                            <Input id="username" value={data.username} onChange={(e) => setData('username', e.target.value)} required isFocused autoComplete="username" placeholder="your_username" />
                            <InputError message={errors.username} />
                        </Field>
                        <Field>
                            <Label htmlFor="email">Email Address</Label>
                            <Input id="email" type="email" value={data.email} onChange={(e) => setData('email', e.target.value)} required autoComplete="email" placeholder="you@example.com" />
                            <InputError message={errors.email} />
                        </Field>
                    </div>
                    {mustVerifyEmail && user.email_verified_at === null && (
                        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-500/30 dark:bg-amber-500/10">
                            <svg className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>
                            <div className="text-sm">
                                <p className="font-semibold text-amber-800 dark:text-amber-300">Email not verified</p>
                                <p className="mt-0.5 text-amber-700 dark:text-amber-400">
                                    <Link href={route('verification.send')} method="post" as="button" className="underline underline-offset-2 hover:text-amber-900 dark:hover:text-amber-200">Resend verification email</Link>
                                </p>
                                {status === 'verification-link-sent' && <p className="mt-1 font-medium text-emerald-700 dark:text-emerald-400">✓ Verification link sent.</p>}
                            </div>
                        </div>
                    )}
                </SectionCard>

                {/* Personal Info */}
                <SectionCard title="Personal Information" description="Name, gender, birthdate and contact details" icon={<PersonIcon />}>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <Field><Label htmlFor="fname">First Name</Label><Input id="fname" value={data.fname} onChange={(e) => setData('fname', e.target.value)} required autoComplete="given-name" placeholder="Juan" /><InputError message={errors.fname} /></Field>
                        <Field><Label htmlFor="mname">Middle Name</Label><Input id="mname" value={data.mname} onChange={(e) => setData('mname', e.target.value)} autoComplete="additional-name" placeholder="Optional" /><InputError message={errors.mname} /></Field>
                        <Field><Label htmlFor="lname">Last Name</Label><Input id="lname" value={data.lname} onChange={(e) => setData('lname', e.target.value)} required autoComplete="family-name" placeholder="dela Cruz" /><InputError message={errors.lname} /></Field>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <Field><Label htmlFor="suffix">Suffix</Label><Input id="suffix" value={data.suffix} onChange={(e) => setData('suffix', e.target.value)} placeholder="Jr., Sr., III…" /><InputError message={errors.suffix} /></Field>
                        <Field>
                            <Label htmlFor="gender">Gender</Label>
                            <select id="gender" value={data.gender} onChange={(e) => setData('gender', e.target.value as Gender)} required className={`${fieldBase} dark:[color-scheme:dark]`}>
                                <option value="" disabled>Select…</option>
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                                <option value="other">Prefer not to say</option>
                            </select>
                            <InputError message={errors.gender} />
                        </Field>
                        <Field><Label htmlFor="birthdate">Birthdate</Label><Input id="birthdate" type="date" value={data.birthdate} onChange={(e) => setData('birthdate', e.target.value)} required className="dark:[color-scheme:dark]" /><InputError message={errors.birthdate} /></Field>
                    </div>
                    <Field>
                        <Label htmlFor="contact_number">Contact Number</Label>
                        <div className="relative">
                            <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center">
                                <svg className="h-4 w-4 text-gray-400 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>
                            </span>
                            <Input id="contact_number" type="tel" value={data.contact_number} onChange={(e) => setData('contact_number', e.target.value)} autoComplete="tel" className="pl-10" placeholder="+63 9XX XXX XXXX" />
                        </div>
                        <InputError message={errors.contact_number} />
                    </Field>
                    <Field>
                        <Label htmlFor="address">Address</Label>
                        <textarea id="address" rows={3} value={data.address} onChange={(e) => setData('address', e.target.value)} placeholder="Street, City, Province, ZIP" className={`${fieldBase} resize-none`} />
                        <InputError message={errors.address} />
                    </Field>
                </SectionCard>

                <div className="flex items-center gap-3 pb-2">
                    <SaveButton processing={processing} />
                    <SuccessBadge show={recentlySuccessful} />
                </div>
            </form>
        </section>
    );
}
