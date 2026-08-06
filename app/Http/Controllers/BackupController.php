<?php

namespace App\Http\Controllers;

use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Storage;

class BackupController extends Controller
{
    private string $disk = 'backups';

    private function backupFolder(): string
    {
        return config('app.name') . '/';
    }

    public function index()
    {
        $disk   = Storage::disk($this->disk);
        $folder = $this->backupFolder();

        if (!$disk->exists($folder)) {
            return response()->json(['backups' => []]);
        }

        $backups = collect($disk->files($folder))
            ->filter(fn($f) => str_ends_with($f, '.zip'))
            ->map(fn($file) => [
                'name'       => basename($file),
                'size'       => $disk->size($file),
                'size_human' => $this->formatBytes($disk->size($file)),
                'created_at' => Carbon::createFromTimestamp($disk->lastModified($file))->toDateTimeString(),
            ])
            ->sortByDesc('created_at')
            ->values();

        return response()->json(['backups' => $backups]);
    }

    public function create()
    {
        try {
            $exitCode = Artisan::call('backup:run');
            $output   = Artisan::output();

            if ($exitCode !== 0) {
                return response()->json([
                    'message' => 'Backup failed. ' . strip_tags($output),
                ], 500);
            }

            return response()->json(['message' => 'Backup created successfully.']);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Backup failed: ' . $e->getMessage()], 500);
        }
    }

    public function download(Request $request)
    {
        $filename = $request->query('file');
        $path     = $this->backupFolder() . $filename;

        if (!Storage::disk($this->disk)->exists($path)) {
            return response()->json(['message' => 'File not found.'], 404);
        }

        return Storage::disk($this->disk)->download($path, $filename);
    }

    public function delete(Request $request)
    {
        $filename = $request->query('file');
        $path     = $this->backupFolder() . $filename;

        if (!Storage::disk($this->disk)->exists($path)) {
            return response()->json(['message' => 'File not found.'], 404);
        }

        Storage::disk($this->disk)->delete($path);
        return response()->json(['message' => 'Backup deleted.']);
    }

    public function restore(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:sql,txt|max:102400',
        ]);

        $sql = file_get_contents($request->file('file')->getRealPath());

        try {
            \DB::unprepared($sql);
            return response()->json(['message' => 'Database restored successfully.']);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Restore failed: ' . $e->getMessage()], 500);
        }
    }

    private function formatBytes(int $bytes, int $precision = 2): string
    {
        $units = ['B', 'KB', 'MB', 'GB'];
        $pow   = floor(($bytes ? log($bytes) : 0) / log(1024));
        $pow   = min($pow, count($units) - 1);
        return round($bytes / (1024 ** $pow), $precision) . ' ' . $units[$pow];
    }
}
