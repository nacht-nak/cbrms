import InputError from '@/Components/InputError';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { LockKeyhole, Mail, ChevronDownIcon } from 'lucide-react';
import Header from '@/Layouts/Header';

export default function Login({
    status,
    canResetPassword,
    error,
}: {
    status?: string;
    canResetPassword: boolean;
    error?: string;
}) {
    const { errors: pageErrors } = usePage().props as any;
    const { data, setData, post, processing, errors, reset } = useForm({
        login: '',
        password: '',
        remember: false as boolean,
    });

    const [showPassword, setShowPassword] = useState(false);
    const [showAltLogin, setShowAltLogin] = useState(false);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('login'), { onFinish: () => reset('password') });
    };

    return (
        <GuestLayout>
            <Head title="Sign in" />
            <Header />

            <div className="w-full max-w-sm mx-auto">

                {/* ── Logo & Heading ── */}
                <div className="mb-8 text-center">
                    <div className="inline-flex items-center justify-center mb-5">
                        <div className="
                            relative w-16 h-16 rounded-2xl overflow-hidden
                            ring-1 ring-black/10 dark:ring-white/10
                            shadow-lg shadow-black/10 dark:shadow-black/40
                        ">
                            <img src="/bglogo.jpeg" alt="Logo" className="w-full h-full object-cover" />
                        </div>
                    </div>

                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                        Welcome back
                    </h1>
                    <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
                        Sign in to your CBRMS account
                    </p>
                </div>

                {/* ── Status Message ── */}
                {status && (
                    <div className="
                        mb-5 px-4 py-3 rounded-xl text-sm font-medium
                        bg-emerald-50 dark:bg-emerald-950/40
                        border border-emerald-200 dark:border-emerald-800
                        text-emerald-700 dark:text-emerald-300
                    ">
                        {status}
                    </div>
                )}
                {error && (
                    <div className="
                        mb-5 px-4 py-3 rounded-xl text-sm font-medium
                        bg-red-50 dark:bg-red-950/40
                        border border-red-200 dark:border-red-800
                        text-red-700 dark:text-red-300
                    ">
                        {error}
                    </div>
                )}

                {/* ── Form Card ── */}
                <div className="
                    rounded-2xl p-6
                    bg-white dark:bg-gray-900
                    border border-gray-200/80 dark:border-white/[0.07]
                    shadow-xl shadow-black/5 dark:shadow-black/30
                ">
                    {/* ── Google Button (Primary) ── */}
                    <a
                        href={route('auth.google')}
                        className="
                            w-full flex items-center justify-center gap-2.5 py-2.5 px-4
                            text-sm font-semibold rounded-xl
                            border border-gray-200 dark:border-white/10
                            bg-white dark:bg-gray-800/60
                            text-gray-700 dark:text-gray-200
                            hover:bg-gray-50 dark:hover:bg-gray-800
                            shadow-sm transition-all duration-150
                            focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
                            dark:focus:ring-offset-gray-900
                        "
                    >
                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        Sign in with Google
                    </a>

                    {/* ── Alternative Login Toggle ── */}
                    <div className="mt-4">
                        <button
                            type="button"
                            onClick={() => setShowAltLogin((v) => !v)}
                            className="
                                w-full flex items-center justify-center gap-2
                                py-2 px-4 text-sm font-medium rounded-xl
                                text-gray-500 dark:text-gray-400
                                hover:text-gray-700 dark:hover:text-gray-200
                                hover:bg-gray-50 dark:hover:bg-gray-800/40
                                transition-all duration-150
                                focus:outline-none focus:ring-2 focus:ring-indigo-500/40
                            "
                        >
                            <span>Use alternative login</span>
                            <ChevronDownIcon
                                className={`w-4 h-4 transition-transform duration-300 ${showAltLogin ? 'rotate-180' : ''}`}
                            />
                        </button>
                    </div>

                    {/* ── Collapsible Login Form ── */}
                    <div
                        className={`overflow-hidden transition-all duration-300 ease-in-out ${showAltLogin ? 'max-h-[600px] opacity-100 mt-4' : 'max-h-0 opacity-0'
                            }`}
                    >
                        <div className="border-t border-gray-100 dark:border-white/[0.06] pt-5">
                            <form onSubmit={submit} className="space-y-5">

                                {/* Username / Email */}
                                <div className="space-y-1.5">
                                    <label
                                        htmlFor="login"
                                        className="block text-sm font-semibold text-gray-700 dark:text-gray-200"
                                    >
                                        Username or Email
                                    </label>
                                    <div className="relative">
                                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                                            <Mail className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                                        </div>
                                        <input
                                            id="login"
                                            type="text"
                                            name="login"
                                            value={data.login}
                                            autoComplete="username"
                                            placeholder="you@example.com"
                                            onChange={(e) => setData('login', e.target.value)}
                                            className={`
                                                w-full pl-10 pr-4 py-2.5 text-sm rounded-xl
                                                border bg-gray-50 dark:bg-gray-800/60
                                                text-gray-900 dark:text-gray-100
                                                placeholder-gray-400 dark:placeholder-gray-600
                                                transition-all duration-150
                                                focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500
                                                focus:bg-white dark:focus:bg-gray-800
                                                ${errors.login
                                                    ? 'border-red-400 dark:border-red-500 bg-red-50 dark:bg-red-950/20'
                                                    : 'border-gray-200 dark:border-white/10'
                                                }
                                            `}
                                        />
                                    </div>
                                    <InputError message={errors.login} className="mt-1" />
                                </div>

                                {/* Password */}
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <label
                                            htmlFor="password"
                                            className="block text-sm font-semibold text-gray-700 dark:text-gray-200"
                                        >
                                            Password
                                        </label>
                                        {canResetPassword && (
                                            <Link
                                                href={route('password.request')}
                                                className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors"
                                            >
                                                Forgot password?
                                            </Link>
                                        )}
                                    </div>
                                    <div className="relative">
                                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                                            <LockKeyhole className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                                        </div>
                                        <input
                                            id="password"
                                            type={showPassword ? 'text' : 'password'}
                                            name="password"
                                            value={data.password}
                                            autoComplete="current-password"
                                            placeholder="••••••••"
                                            onChange={(e) => setData('password', e.target.value)}
                                            className={`
                                                w-full pl-10 pr-11 py-2.5 text-sm rounded-xl
                                                border bg-gray-50 dark:bg-gray-800/60
                                                text-gray-900 dark:text-gray-100
                                                placeholder-gray-400 dark:placeholder-gray-600
                                                transition-all duration-150
                                                focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500
                                                focus:bg-white dark:focus:bg-gray-800
                                                ${errors.password
                                                    ? 'border-red-400 dark:border-red-500 bg-red-50 dark:bg-red-950/20'
                                                    : 'border-gray-200 dark:border-white/10'
                                                }
                                            `}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword((v) => !v)}
                                            tabIndex={-1}
                                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                                            className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                        >
                                            {showPassword
                                                ? <EyeSlashIcon className="w-4 h-4" />
                                                : <EyeIcon className="w-4 h-4" />
                                            }
                                        </button>
                                    </div>
                                    <InputError message={errors.password} className="mt-1" />
                                </div>

                                {/* Remember Me */}
                                <label className="flex items-center gap-3 cursor-pointer select-none group">
                                    <input
                                        type="checkbox"
                                        name="remember"
                                        checked={data.remember}
                                        onChange={(e) => setData('remember', e.target.checked)}
                                        className="
                                            w-4 h-4 rounded
                                            border-gray-300 dark:border-gray-600
                                            bg-white dark:bg-gray-800
                                            text-indigo-600
                                            focus:ring-2 focus:ring-indigo-500 focus:ring-offset-0
                                            transition-colors cursor-pointer
                                        "
                                    />
                                    <span className="text-sm text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-200 transition-colors">
                                        Remember me for 30 days
                                    </span>
                                </label>

                                {/* Submit */}
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="
                                        w-full py-2.5 px-4 text-sm font-semibold rounded-xl
                                        bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800
                                        dark:bg-indigo-500 dark:hover:bg-indigo-600
                                        text-white
                                        shadow-lg shadow-indigo-500/25
                                        flex items-center justify-center gap-2
                                        transition-all duration-150
                                        disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none
                                        focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
                                        dark:focus:ring-offset-gray-900
                                        mt-1
                                    "
                                >
                                    {processing && (
                                        <svg className="animate-spin h-4 w-4 text-white/80" viewBox="0 0 24 24" fill="none">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                                        </svg>
                                    )}
                                    {processing ? 'Signing in…' : 'Sign in'}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>

                {/* ── Footer hint ── */}
                <p className="mt-5 text-center text-xs text-gray-400 dark:text-gray-600">
                    Access is restricted to authorized personnel only.
                </p>
            </div>
        </GuestLayout>
    );
}
