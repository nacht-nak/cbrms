<?php

namespace App\Http\Controllers;

use App\Models\Department;
use App\Models\File;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class SearchController extends Controller
{
    public function departments()
    {
        $departments = Department::where('name', '!=', 'Administrator')
            ->orderBy('name')
            ->get(['id', 'name']);

        return response()->json($departments);
    }

    public function index(Request $request)
    {
        $request->validate([
            'q'             => 'required|string|min:1|max:255',
            'page'          => 'nullable|integer|min:1',
            'per_page'      => 'nullable|integer|min:1|max:50',
            'date_from'     => 'nullable|date',
            'date_to'       => 'nullable|date|after_or_equal:date_from',
            'department_id' => 'nullable|integer|exists:departments,id',
        ]);

        $query        = trim($request->input('q'));
        $perPage      = (int) $request->input('per_page', 10);
        $dateFrom     = $request->input('date_from');
        $dateTo       = $request->input('date_to');
        $departmentId = $request->input('department_id');

        $results = File::query()
            ->with('details')
            ->where('type', 'file')
            ->whereHas('details', fn($dq) => $dq->where('status', 'active'))
            ->where(function ($q) use ($query) {
                $q->where('name', 'LIKE', "%{$query}%")
                    ->orWhereHas('details', function ($dq) use ($query) {
                        $dq->where('status', 'active')
                            ->where(function ($inner) use ($query) {
                                $inner->where('fileName',    'LIKE', "%{$query}%")
                                    ->orWhere('authors',     'LIKE', "%{$query}%")
                                    ->orWhere('description', 'LIKE', "%{$query}%")
                                    ->orWhere('location',    'LIKE', "%{$query}%")
                                    ->orWhereRaw("DATE_FORMAT(publication_date, '%M %d %Y') LIKE ?", ["%{$query}%"])
                                    ->orWhereRaw("YEAR(publication_date) LIKE ?", ["%{$query}%"]);
                            });
                    });
            })
            ->when($departmentId, function ($q) use ($departmentId) {
                $q->whereHas(
                    'user.profile',
                    fn($pq) =>
                    $pq->where('department_id', $departmentId)
                );
            })
            ->when($dateFrom, function ($q) use ($dateFrom) {
                $q->whereHas(
                    'details',
                    fn($dq) =>
                    $dq->whereDate('publication_date', '>=', $dateFrom)
                );
            })
            ->when($dateTo, function ($q) use ($dateTo) {
                $q->whereHas(
                    'details',
                    fn($dq) =>
                    $dq->whereDate('publication_date', '<=', $dateTo)
                );
            })
            ->orderBy('name')
            ->paginate($perPage);

        return response()->json($results);
    }

    public function download(int $id)
    {
        $file = File::with('details')
            ->where('type', 'file')
            ->findOrFail($id);   // 404 if record not found

        // ── Resolve the storage-relative path ──────────────────────────────
        // The `path` column on the File model may be stored in several formats:
        //   "files/report.pdf"             → already storage-relative  ✓
        //   "/storage/files/report.pdf"    → public symlink path       → strip prefix
        //   "storage/files/report.pdf"     → same without leading /    → strip prefix
        //   "/var/www/.../storage/app/..." → absolute path             → use directly

        $rawPath = $file->path;

        if (!$rawPath) {
            abort(404, 'No file path recorded for this entry.');
        }

        // Strip /storage/ or storage/ prefix that Laravel's public disk adds
        // so we get a path relative to storage/app (what Storage::exists expects)
        $storagePath = preg_replace('#^/?storage/#', '', $rawPath);

        // Try the default disk first, then the public disk
        $disk = null;
        if (Storage::disk('local')->exists($storagePath)) {
            $disk = 'local';
        } elseif (Storage::disk('public')->exists($storagePath)) {
            $disk = 'public';
        }

        // Last resort: treat rawPath as an absolute filesystem path
        if (!$disk) {
            $absolutePath = str_starts_with($rawPath, '/')
                ? $rawPath
                : storage_path('app/' . $storagePath);

            if (!file_exists($absolutePath)) {
                abort(404, 'File not found on disk. Path tried: ' . $storagePath);
            }

            // Increment download counter
            $file->details?->increment('downloads');

            $downloadName = $file->details?->fileName ?? basename($absolutePath);
            return response()->download($absolutePath, $downloadName);
        }

        // Increment download counter
        $file->details?->increment('downloads');

        $downloadName = $file->details?->fileName ?? basename($storagePath);

        return Storage::disk($disk)->download($storagePath, $downloadName);
    }

    public function recordView(int $id)
    {
        $file = File::with('details')
            ->where('type', 'file')
            ->findOrFail($id);

        if ($file->details) {
            $file->details->increment('views');
        }

        return response()->json([
            'views' => $file->details?->views ?? 0,
        ]);
    }
}
