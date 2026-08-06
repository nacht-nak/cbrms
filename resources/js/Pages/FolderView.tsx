import { useEffect, useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import { getFiles, createFolder, uploadFile, deleteFile, getFolderPath, renameFolder } from '@/helper/api';
import { FileItem, PageProps } from '@/types';
import Breadcrumbs from '@/Components/Breadcrumbs';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import FileModal from '@/Layouts/FileModal';
import FileInfo from './FileInfo';
import Swal from 'sweetalert2';
import { toast } from 'sonner';
import FolderModal from '@/Layouts/FolderModal';
import FolderInfo from './FolderInfo';
import axios from 'axios';

function SkeletonCard() {
    return (
        <div className="relative rounded-2xl overflow-hidden bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-4 space-y-3 animate-pulse">
            <div className="w-12 h-12 rounded-xl bg-slate-200 dark:bg-white/10 mx-auto" />
            <div className="h-3 bg-slate-200 dark:bg-white/10 rounded-full w-3/4 mx-auto" />
            <div className="h-2 bg-slate-200 dark:bg-white/10 rounded-full w-1/2 mx-auto" />
        </div>
    );
}

function SkeletonGrid({ count = 5 }: { count?: number }) {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {Array.from({ length: count }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
    );
}

function SectionLabel({ icon, label, count }: { icon: string; label: string; count: number }) {
    return (
        <div className="flex items-center gap-3 mb-4">
            <span className="text-lg">{icon}</span>
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">{label}</span>
            <span className="ml-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400 text-xs font-semibold tabular-nums">{count}</span>
            <div className="flex-1 h-px bg-slate-200 dark:bg-white/10" />
        </div>
    );
}

function EmptyState({ onUpload, onCreate }: { onUpload: () => void; onCreate: () => void }) {
    return (
        <div className="flex flex-col items-center justify-center py-16 sm:py-24 gap-5 text-center px-4">
            <div className="w-20 h-20 rounded-3xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center text-4xl shadow-inner">🗂️</div>
            <div>
                <p className="text-slate-700 dark:text-slate-300 font-semibold text-lg">This folder is empty</p>
                <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">Create a subfolder or upload a file to get started.</p>
            </div>
            <div className="flex gap-3">
                <button onClick={onCreate} className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-700 dark:text-white text-sm font-medium border border-slate-200 dark:border-white/10 transition-all min-h-[44px]">📁 New Folder</button>
                <button onClick={onUpload} className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-all shadow-lg shadow-indigo-500/20 min-h-[44px]">⬆️ Upload File</button>
            </div>
        </div>
    );
}

function SecondaryBtn({ onClick, disabled, title, children }: any) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            title={title}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
        >
            {children}
        </button>
    );
}

export default function FolderView() {
    const { props } = usePage<PageProps & { folderId: number }>();

    const folderId = props.folderId ? Number(props.folderId) : null;
    const authUser = props.auth.user;
    const isAdminUser = props.auth.role === 'admin';
    const rolePrefix = props.auth.role === 'admin' ? '/admin' : '/user';

    const [files, setFiles] = useState<FileItem[]>([]);
    const [path, setPath] = useState<{ id: number; name: string }[]>([]);
    const [loading, setLoading] = useState(false);
    const [deleting, setDeleting] = useState<number | null>(null);

    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [uploadModalOpen, setUploadModalOpen] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [fileUpload, setFileUpload] = useState<File | null>(null);
    const [editingFile, setEditingFile] = useState<FileItem | null>(null);
    const [fileMeta, setFileMeta] = useState({
        fileName: '', description: '', authors: '', publication_date: '', location: '',
    });

    const loadFiles = async () => {
        if (!folderId) { router.visit(`${rolePrefix}/file-manager`); return; }
        setLoading(true);
        try { setFiles(await getFiles(folderId)); } catch { setFiles([]); }
        try { setPath(await getFolderPath(folderId)); } catch { setPath([]); }
        setLoading(false);
    };

    useEffect(() => {
        loadFiles(); // or loadFiles() in FolderView

        const poll = setInterval(loadFiles, 10_000);

        const channel = (window as any).Echo?.channel('files');
        channel?.listen('.FileStatusChanged', (e: { fileId: number; newStatus: string }) => {
            setFiles(prev =>
                prev.map(f =>
                    f.id === e.fileId && f.details
                        ? { ...f, details: { ...f.details, status: e.newStatus as any } }
                        : f
                )
            );
        });

        return () => {
            clearInterval(poll);
            channel?.stopListening('.FileStatusChanged');
            (window as any).Echo?.leave('files');
        };
    }, [folderId]); // FolderView uses [folderId]; FileManager uses []

    const goToFolder = (id: number) => router.visit(`${rolePrefix}/file-manager/${id}`);

    const handleCreateFolder = async () => {
        if (!newFolderName || !folderId) return;
        await createFolder(newFolderName, folderId);
        setNewFolderName(''); setCreateModalOpen(false); loadFiles();
    };

    const handleUploadFile = async () => {
        if (!fileUpload && !editingFile) return;
        await uploadFile(fileUpload, folderId, fileMeta, editingFile?.id);
        setUploadModalOpen(false); setFileUpload(null); setEditingFile(null);
        setFileMeta({ fileName: '', description: '', authors: '', publication_date: '', location: '' });
        loadFiles();
    };

    const handleEdit = (file: FileItem) => {
        setFileMeta({
            fileName: file.details?.fileName ?? '',
            description: file.details?.description ?? '',
            authors: file.details?.authors ?? '',
            publication_date: file.details?.publication_date ?? '',
            location: file.details?.location ?? '',
        });
        setFileUpload(null); setEditingFile(file); setUploadModalOpen(true);
    };

    const handleDelete = async (file: FileItem) => {
        const isDark = document.documentElement.classList.contains('dark');
        const result = await Swal.fire({
            title: `Delete this ${file.type}?`,
            text: file.type === 'folder' ? 'All files and subfolders inside will also be deleted!' : 'This action cannot be undone!',
            icon: 'warning', showCancelButton: true,
            confirmButtonText: 'Yes, delete it!', cancelButtonText: 'Cancel',
            background: isDark ? '#1e293b' : '#ffffff', color: isDark ? '#e2e8f0' : '#1e293b',
            confirmButtonColor: '#ef4444', cancelButtonColor: isDark ? '#475569' : '#94a3b8',
        });
        if (result.isConfirmed) {
            setDeleting(file.id);
            try { await deleteFile(file.id); loadFiles(); }
            catch { toast.error('Failed to delete ' + file.type); }
            finally { setDeleting(null); }
        }
    };

    const handleEditFolder = async (file: FileItem, newName: string) => {
        const result = await renameFolder(file.id, newName);
        if (result) loadFiles();
    };

    const handleStatusChange = async (file: FileItem, status: string) => {
        try {
            await axios.patch(`/api/all-files/${file.id}/status`, { status });
            toast.success('Status updated.');
            setFiles((prev) =>
                prev.map((f) =>
                    f.id === file.id && f.details
                        ? { ...f, details: { ...f.details, status: status as "active" | "inactive" | "archived" } }
                        : f
                )
            );
        } catch {
            toast.error('Failed to update status.');
        }
    };

    const openUpload = () => {
        setEditingFile(null);
        setFileMeta({ fileName: '', description: '', authors: '', publication_date: '', location: '' });
        setFileUpload(null); setUploadModalOpen(true);
    };

    const currentFolderName = path.length ? path[path.length - 1].name : 'Folder';
    const folders = files.filter((f) => f.type === 'folder');
    const fileItems = files.filter((f) => f.type !== 'folder');
    const isEmpty = !loading && files.length === 0;

    return (
        <AuthenticatedLayout>
            <Head title={`File Manager — ${currentFolderName}`} />
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
                .fm-root { font-family: 'DM Sans', sans-serif; }
                .fm-card-lift { transition: transform .2s ease, box-shadow .2s ease; }
                .fm-card-lift:hover { transform: translateY(-3px); }
                @keyframes slideBar { 0% { left: -40%; } 100% { left: 100%; } }
                .scrollbar-none { scrollbar-width: none; -ms-overflow-style: none; }
                .scrollbar-none::-webkit-scrollbar { display: none; }
            `}</style>

            <div className="fm-root -mx-4 sm:-mx-6 -my-6 px-4 sm:px-6 py-6 min-h-full bg-slate-50 dark:bg-[#0d0f1a]" style={{ backgroundImage: 'var(--fm-bg-gradient)' }}>
                <style>{`
                    :root { --fm-bg-gradient: radial-gradient(ellipse 70% 40% at 50% -10%, rgba(99,102,241,.06) 0%, transparent 60%); }
                    .dark  { --fm-bg-gradient: radial-gradient(ellipse 80% 50% at 50% -20%, rgba(99,102,241,.18) 0%, transparent 60%), radial-gradient(ellipse 40% 30% at 80% 80%, rgba(139,92,246,.10) 0%, transparent 60%); }
                `}</style>

                <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
                    <Breadcrumbs path={path} rootHref={`${rolePrefix}/file-manager`} />

                    {/* ── Header ── */}
                    <div className="flex flex-col gap-4">
                        {/* Title row */}
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-800 dark:text-white truncate max-w-[200px] sm:max-w-none">
                                    {currentFolderName}
                                </h1>
                                {!loading && (
                                    <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5">
                                        {files.length} item{files.length !== 1 ? 's' : ''} in this folder
                                    </p>
                                )}
                            </div>
                            {/* Refresh — always visible */}
                            <SecondaryBtn onClick={loadFiles} disabled={loading} title="Refresh">
                                <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            </SecondaryBtn>
                        </div>

                        {/* Action buttons row — scrollable on mobile */}
                        <div className="flex items-center gap-2 overflow-x-auto pb-0.5 -mb-0.5 scrollbar-none">
                            {isAdminUser && (
                                <button
                                    onClick={() => router.visit(`${rolePrefix}/file-manager/import-excel`)}
                                    className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white text-sm font-medium transition-all whitespace-nowrap shrink-0 min-h-[42px]"
                                >
                                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none">
                                        <rect width="24" height="24" rx="3" fill="#217346" />
                                        <path d="M7 7l3.5 5L7 17h2.5l2.25-3.5L14 17h2.5l-3.5-5 3.5-5H14l-2.25 3.5L9.5 7H7z" fill="white" />
                                    </svg>
                                    <span>Import Excel</span>
                                </button>
                            )}

                            <button
                                onClick={() => setCreateModalOpen(true)}
                                className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white text-sm font-medium transition-all whitespace-nowrap shrink-0 min-h-[42px]"
                            >
                                <svg className="w-4 h-4 text-yellow-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                                </svg>
                                <span>New Folder</span>
                            </button>

                            <button
                                onClick={openUpload}
                                className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-all shadow-lg shadow-indigo-600/25 whitespace-nowrap shrink-0 min-h-[42px]"
                            >
                                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                </svg>
                                <span>Upload File</span>
                            </button>
                        </div>
                    </div>

                    {/* ── Loading bar ── */}
                    {loading && (
                        <div className="relative h-0.5 w-full rounded-full overflow-hidden bg-slate-200 dark:bg-white/5">
                            <div className="absolute inset-y-0 w-2/5 rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500" style={{ animation: 'slideBar 1.4s ease-in-out infinite' }} />
                        </div>
                    )}

                    {/* ── Modals ── */}
                    <FolderModal createModalOpen={createModalOpen} setCreateModalOpen={setCreateModalOpen} newFolderName={newFolderName} setNewFolderName={setNewFolderName} handleCreateFolder={handleCreateFolder} />
                    <FileModal fileMeta={fileMeta} setFileMeta={setFileMeta} fileUpload={fileUpload} setFileUpload={setFileUpload} uploadModalOpen={uploadModalOpen} setUploadModalOpen={(open) => { if (!open) setEditingFile(null); setUploadModalOpen(open); }} handleUploadFile={handleUploadFile} editingFile={editingFile} />

                    {/* ── Content ── */}
                    {loading ? (
                        <div className="space-y-8">
                            {[5, 8].map((n, i) => (
                                <div key={i}>
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="h-3 w-16 rounded-full bg-slate-200 dark:bg-white/10 animate-pulse" />
                                        <div className="flex-1 h-px bg-slate-200 dark:bg-white/10" />
                                    </div>
                                    <SkeletonGrid count={n} />
                                </div>
                            ))}
                        </div>
                    ) : isEmpty ? (
                        <EmptyState onUpload={openUpload} onCreate={() => setCreateModalOpen(true)} />
                    ) : (
                        <div className="space-y-10">
                            {folders.length > 0 && (
                                <section>
                                    <SectionLabel icon="📁" label="Folders" count={folders.length} />
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                                        {folders.map((file) => (
                                            <div key={file.id} className="fm-card-lift">
                                                <FolderInfo file={file} goToFolder={goToFolder} handleDelete={handleDelete} handleEdit={handleEditFolder} />
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}
                            {fileItems.length > 0 && (
                                <section>
                                    <SectionLabel icon="📄" label="Files" count={fileItems.length} />
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                                        {fileItems.map((file) => (
                                            <div key={file.id} className={`fm-card-lift relative ${deleting === file.id ? 'opacity-50 pointer-events-none' : ''}`}>
                                                {deleting === file.id && (
                                                    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-black/30 backdrop-blur-sm">
                                                        <svg className="w-5 h-5 animate-spin text-red-400" fill="none" viewBox="0 0 24 24">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                                        </svg>
                                                    </div>
                                                )}
                                                <FileInfo
                                                    file={file}
                                                    handleDelete={handleDelete}
                                                    onEdit={handleEdit}
                                                    authUser={authUser}
                                                    isAdminUser={isAdminUser}
                                                    onStatusChange={handleStatusChange}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
