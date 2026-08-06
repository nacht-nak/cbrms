<?php

namespace App\Http\Controllers;

use App\Models\File;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class ArchivedController extends Controller
{
    public function index()
    {
        return Inertia::render('Files/ArchivedFiles');
    }

    public function list(Request $request)
    {
        $tab = $request->query('tab', 'all');

        $this->syncLegacyArchivedFiles();

        $query = File::with(['details', 'user'])
            ->withTrashed()
            ->where(function ($q) {
                $q->whereNotNull('archived_at')
                    ->orWhereNotNull('deleted_at');
            });

        if (!auth()->user()->hasRole('admin')) {
            $query->where('user_id', auth()->id());
        }

        if ($tab === 'archived') {
            $query->whereNotNull('archived_at')->whereNull('deleted_at');
        } elseif ($tab === 'trashed') {
            $query->onlyTrashed();
        }

        $files = $query->orderByDesc('updated_at')->get()->map(function ($file) {
            return array_merge($file->toArray(), [
                'days_left'   => $file->daysUntilPermanentDeletion(),
                'is_archived' => $file->isArchived(),
                'is_trashed'  => $file->isTrashed(),
            ]);
        });

        return response()->json(['data' => $files]);
    }

    /**
     * Use int $id instead of File $file to bypass route model binding,
     * which excludes soft-deleted records before the controller is reached.
     */
    public function restore(int $id)
    {
        $file = File::withTrashed()->findOrFail($id);
        $this->authorizeOwner($file);

        if ($file->trashed()) {
            $file->restore();
        }

        $file->update(['archived_at' => null]);

        if ($file->details) {
            $file->details->update(['status' => 'active']);
        }

        return response()->json([
            'message' => 'File restored successfully.',
            'file'    => $file->load('details'),
        ]);
    }

    public function forceDelete(int $id)
    {
        $file = File::withTrashed()->findOrFail($id);
        $this->authorizeOwner($file);
        $this->permanentlyDelete($file);

        return response()->json(['message' => 'Permanently deleted.']);
    }

    public function bulkRestore(Request $request)
    {
        $ids = $request->validate(['ids' => 'required|array', 'ids.*' => 'integer'])['ids'];

        File::withTrashed()
            ->whereIn('id', $ids)
            ->when(!auth()->user()->hasRole('admin'), fn($q) => $q->where('user_id', auth()->id()))
            ->each(function ($file) {
                if ($file->trashed()) $file->restore();
                $file->update(['archived_at' => null]);
                if ($file->details) $file->details->update(['status' => 'active']);
            });

        return response()->json(['message' => 'Files restored.']);
    }

    public function bulkForceDelete(Request $request)
    {
        $ids = $request->validate(['ids' => 'required|array', 'ids.*' => 'integer'])['ids'];

        File::withTrashed()
            ->whereIn('id', $ids)
            ->when(!auth()->user()->hasRole('admin'), fn($q) => $q->where('user_id', auth()->id()))
            ->each(fn($file) => $this->permanentlyDelete($file));

        return response()->json(['message' => 'Files permanently deleted.']);
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private function syncLegacyArchivedFiles(): void
    {
        DB::table('files')
            ->join('file_details', 'files.id', '=', 'file_details.file_id')
            ->whereNull('files.archived_at')
            ->whereNull('files.deleted_at')
            ->where('file_details.status', 'archived')
            ->update(['files.archived_at' => DB::raw('file_details.updated_at')]);
    }

    private function permanentlyDelete(File $file): void
    {
        if ($file->type === 'file' && $file->path) {
            Storage::disk('public')->delete($file->path);
        }

        if ($file->type === 'folder') {
            File::withTrashed()
                ->where('parent_id', $file->id)
                ->each(fn($child) => $this->permanentlyDelete($child));
        }

        $file->details?->forceDelete();
        $file->forceDelete();
    }

    private function authorizeOwner(File $file): void
    {
        abort_if(
            $file->user_id !== auth()->id() && !auth()->user()->hasRole('admin'),
            403
        );
    }
}
