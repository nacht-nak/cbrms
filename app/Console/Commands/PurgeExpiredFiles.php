<?php

namespace App\Console\Commands;

use App\Models\File;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class PurgeExpiredFiles extends Command
{
    protected $signature   = 'files:purge-expired {--dry-run : List files without deleting}';
    protected $description = 'Permanently delete archived/trashed files older than 30 days';

    public function handle(): int
    {
        $cutoff = now()->subDays(30);

        // Files that were soft-deleted more than 30 days ago
        $expired = File::withTrashed()
            ->where(function ($q) use ($cutoff) {
                // Trashed more than 30 days ago
                $q->whereNotNull('deleted_at')->where('deleted_at', '<=', $cutoff);
            })
            ->orWhere(function ($q) use ($cutoff) {
                // Archived (not deleted) more than 30 days ago
                $q->whereNotNull('archived_at')
                    ->whereNull('deleted_at')
                    ->where('archived_at', '<=', $cutoff);
            })
            ->get();

        if ($expired->isEmpty()) {
            $this->info('No expired files found.');
            return Command::SUCCESS;
        }

        if ($this->option('dry-run')) {
            $this->table(
                ['ID', 'Name', 'Type', 'Archived At', 'Deleted At'],
                $expired->map(fn($f) => [
                    $f->id,
                    $f->name,
                    $f->type,
                    $f->archived_at?->toDateString(),
                    $f->deleted_at?->toDateString(),
                ])
            );
            $this->warn("Dry run: {$expired->count()} file(s) would be permanently deleted.");
            return Command::SUCCESS;
        }

        $count = 0;
        foreach ($expired as $file) {
            $this->purge($file);
            $count++;
        }

        $this->info("Purged {$count} expired file(s).");
        return Command::SUCCESS;
    }

    private function purge(File $file): void
    {
        // Delete physical file from storage
        if ($file->type === 'file' && $file->path) {
            Storage::disk('public')->delete($file->path);
        }

        // Recursively purge children (for folders)
        if ($file->type === 'folder') {
            File::withTrashed()
                ->where('parent_id', $file->id)
                ->each(fn($child) => $this->purge($child));
        }

        // Remove file details and the file itself
        $file->details?->forceDelete();
        $file->forceDelete();

        $this->line("  ✓ Purged: [{$file->type}] {$file->name}");
    }
}
