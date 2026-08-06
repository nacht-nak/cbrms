import InputError from '@/Components/InputError';
import { Transition } from '@headlessui/react';
import { useForm } from '@inertiajs/react';
import { FormEventHandler, useRef } from 'react';

const fieldBase =
    'block w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-all duration-200 ' +
    'border-gray-300 bg-white text-gray-900 placeholder-gray-400 ' +
    'focus:border-violet-500 focus:ring-2 focus:ring-violet-500/25 ' +
    'dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 ' +
    'dark:focus:border-violet-400 dark:focus:ring-violet-400/25';

function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
    return (
        <label htmlFor={htmlFor} className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300">
            {children}
        </label>
    );
}

function Field({ children }: { children: React.ReactNode }) {
    return <div className="flex flex-col gap-1.5">{children}</div>;
}

export default function UpdatePasswordForm({ className = '' }: { className?: string }) {
    const passwordInput = useRef<HTMLInputElement>(null);
    const currentPasswordInput = useRef<HTMLInputElement>(null);

    const { data, setData, errors, put, reset, processing, recentlySuccessful } = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const updatePassword: FormEventHandler = (e) => {
        e.preventDefault();
        put(route('password.update'), {
            preserveScroll: true,
            onSuccess: () => reset(),
            onError: (errors) => {
                if (errors.password) { reset('password', 'password_confirmation'); passwordInput.current?.focus(); }
                if (errors.current_password) { reset('current_password'); currentPasswordInput.current?.focus(); }
            },
        });
    };

    return (
        <section className={`mx-auto w-full max-w-2xl space-y-5 ${className}`}>
            <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Update Password</h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Use a long, random password to keep your account secure.
                </p>
            </div>

            {/* Card */}
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
                {/* Card header */}
                <div className="flex items-center gap-3 border-b border-gray-200 bg-gray-50 px-5 py-4 dark:border-gray-700 dark:bg-gray-800">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-gray-600 shadow-sm ring-1 ring-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:ring-gray-600">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                                d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                        </svg>
                    </span>
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Password</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Change your account password</p>
                    </div>
                </div>

                {/* Card body */}
                <form onSubmit={updatePassword} className="space-y-4 px-5 py-5">
                    <Field>
                        <Label htmlFor="current_password">Current Password</Label>
                        <input id="current_password" ref={currentPasswordInput} type="password"
                            value={data.current_password} onChange={(e) => setData('current_password', e.target.value)}
                            autoComplete="current-password" placeholder="••••••••" className={fieldBase} />
                        <InputError message={errors.current_password} />
                    </Field>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <Field>
                            <Label htmlFor="password">New Password</Label>
                            <input id="password" ref={passwordInput} type="password"
                                value={data.password} onChange={(e) => setData('password', e.target.value)}
                                autoComplete="new-password" placeholder="••••••••" className={fieldBase} />
                            <InputError message={errors.password} />
                        </Field>
                        <Field>
                            <Label htmlFor="password_confirmation">Confirm Password</Label>
                            <input id="password_confirmation" type="password"
                                value={data.password_confirmation} onChange={(e) => setData('password_confirmation', e.target.value)}
                                autoComplete="new-password" placeholder="••••••••" className={fieldBase} />
                            <InputError message={errors.password_confirmation} />
                        </Field>
                    </div>

                    <div className="flex items-center gap-3 pt-1">
                        <button type="submit" disabled={processing}
                            className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-gray-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-violet-600 dark:hover:bg-violet-500">
                            {processing ? (
                                <><svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" /></svg>Saving…</>
                            ) : 'Update Password'}
                        </button>

                        <Transition show={recentlySuccessful} enter="transition-all duration-300 ease-out" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="transition-all duration-200 ease-in" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/30">
                                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4.5 12.75l6 6 9-13.5" /></svg>
                                Saved
                            </span>
                        </Transition>
                    </div>
                </form>
            </div>
        </section>
    );
}
