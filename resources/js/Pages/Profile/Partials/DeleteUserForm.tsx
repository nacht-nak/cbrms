import InputError from '@/Components/InputError';
import { useForm } from '@inertiajs/react';
import { FormEventHandler, useRef, useState } from 'react';

export default function DeleteUserForm({ className = '' }: { className?: string }) {
    const [confirmingUserDeletion, setConfirmingUserDeletion] = useState(false);
    const passwordInput = useRef<HTMLInputElement>(null);

    const { data, setData, delete: destroy, processing, reset, errors, clearErrors } = useForm({ password: '' });

    const confirmUserDeletion = () => { setConfirmingUserDeletion(true); setTimeout(() => passwordInput.current?.focus(), 100); };
    const deleteUser: FormEventHandler = (e) => { e.preventDefault(); destroy(route('profile.destroy'), { preserveScroll: true, onSuccess: () => closeModal(), onError: () => passwordInput.current?.focus(), onFinish: () => reset() }); };
    const closeModal = () => { setConfirmingUserDeletion(false); clearErrors(); reset(); };

    const fieldBase =
        'block w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-all duration-200 ' +
        'border-gray-300 bg-white text-gray-900 placeholder-gray-400 ' +
        'focus:border-red-500 focus:ring-2 focus:ring-red-500/25 ' +
        'dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 ' +
        'dark:focus:border-red-400 dark:focus:ring-red-400/25';

    return (
        <section className={`mx-auto w-full max-w-2xl space-y-5 ${className}`}>
            <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Delete Account</h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Permanently remove your account and all associated data.
                </p>
            </div>

            {/* Danger card */}
            <div className="overflow-hidden rounded-2xl border border-red-200 bg-white shadow-sm dark:border-red-500/20 dark:bg-gray-800">
                {/* Card header */}
                <div className="flex items-center gap-3 border-b border-red-100 bg-red-50 px-5 py-4 dark:border-red-500/20 dark:bg-red-500/10">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                        </svg>
                    </span>
                    <div>
                        <h3 className="text-sm font-semibold text-red-800 dark:text-red-300">Danger zone</h3>
                        <p className="text-xs text-red-600 dark:text-red-400">This action is permanent and cannot be undone</p>
                    </div>
                </div>

                {/* Card body */}
                <div className="px-5 py-5">
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                        Once your account is deleted, all of its resources and data will be permanently removed.
                        Please download any data you wish to retain before proceeding.
                    </p>
                    <button onClick={confirmUserDeletion}
                        className="mt-4 inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 shadow-sm transition-all duration-200 hover:bg-red-50 hover:border-red-300 active:scale-95 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                                d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                        Delete Account
                    </button>
                </div>
            </div>

            {/* Confirmation modal */}
            {confirmingUserDeletion && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeModal} />
                    <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-800">
                        {/* Modal header */}
                        <div className="flex items-center gap-3 border-b border-gray-200 bg-gray-50 px-6 py-4 dark:border-gray-700 dark:bg-gray-800">
                            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-100 dark:bg-red-500/15">
                                <svg className="h-5 w-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                                        d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                </svg>
                            </span>
                            <div>
                                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Delete account</h2>
                                <p className="text-xs text-gray-500 dark:text-gray-400">This action cannot be undone</p>
                            </div>
                        </div>

                        {/* Modal body */}
                        <form onSubmit={deleteUser} className="space-y-5 px-6 py-5">
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                                All your data will be permanently deleted. Enter your password to confirm.
                            </p>

                            <div className="flex flex-col gap-1.5">
                                <label htmlFor="delete_password"
                                    className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                                    Password
                                </label>
                                <input id="delete_password" type="password" ref={passwordInput}
                                    value={data.password} onChange={(e) => setData('password', e.target.value)}
                                    placeholder="Enter your password" className={fieldBase} />
                                <InputError message={errors.password} className="mt-1" />
                            </div>

                            <div className="flex items-center justify-end gap-3">
                                <button type="button" onClick={closeModal}
                                    className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-all duration-200 hover:bg-gray-50 active:scale-95 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600">
                                    Cancel
                                </button>
                                <button type="submit" disabled={processing || !data.password}
                                    className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-red-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50">
                                    {processing ? (
                                        <><svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" /></svg>Deleting…</>
                                    ) : 'Yes, delete my account'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </section>
    );
}
