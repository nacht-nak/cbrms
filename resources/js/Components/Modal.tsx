import {
    Dialog,
    DialogPanel,
    Transition,
    TransitionChild,
} from '@headlessui/react';
import { PropsWithChildren, Fragment } from 'react';

export default function Modal({
    children,
    show = false,
    maxWidth = '2xl',
    closeable = true,
    onClose = () => { },
    title,
}: PropsWithChildren<{
    show: boolean;
    maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
    closeable?: boolean;
    onClose: CallableFunction;
    title?: string;
}>) {
    const close = () => {
        if (closeable) onClose();
    };

    const maxWidthClass = {
        sm: 'sm:max-w-sm',
        md: 'sm:max-w-md',
        lg: 'sm:max-w-lg',
        xl: 'sm:max-w-xl',
        '2xl': 'sm:max-w-2xl',
    }[maxWidth];

    return (
        <Transition appear show={show} as={Fragment}>
            <Dialog
                as="div"
                className="relative z-50"
                onClose={close}
            >
                {/* Backdrop */}
                <TransitionChild
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/50 dark:bg-black/70" />
                </TransitionChild>

                {/* Modal Container */}
                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
                        <TransitionChild
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95 translate-y-4"
                            enterTo="opacity-100 scale-100 translate-y-0"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100 translate-y-0"
                            leaveTo="opacity-0 scale-95 translate-y-4"
                        >
                            <DialogPanel
                                className={`
                                    w-full ${maxWidthClass}
                                    rounded-xl
                                    bg-white dark:bg-gray-900
                                    text-gray-900 dark:text-gray-100
                                    shadow-xl
                                    transition-all
                                `}
                            >
                                {/* Header */}
                                {title && (
                                    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
                                        <Dialog.Title className="text-lg font-semibold">
                                            {title}
                                        </Dialog.Title>

                                        {closeable && (
                                            <button
                                                onClick={() => close()}
                                                className="rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700
                                                           dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                                            >
                                                ✕
                                            </button>
                                        )}
                                    </div>
                                )}

                                {/* Body */}
                                <div className="p-5 sm:p-6">
                                    {children}
                                </div>
                            </DialogPanel>
                        </TransitionChild>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}
