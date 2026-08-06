<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class File extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'type',
        'parent_id',
        'path',
        'user_id',
        'is_public',
        'archived_at',
    ];

    protected $casts = [
        'archived_at' => 'datetime',
        'deleted_at'  => 'datetime',
    ];

    // ─── Relationships ────────────────────────────────────────────────────────

    public function parent()
    {
        return $this->belongsTo(File::class, 'parent_id');
    }

    public function children()
    {
        return $this->hasMany(File::class, 'parent_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function details()
    {
        return $this->hasOne(FileDetails::class);
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    public function isFile(): bool
    {
        return $this->type === 'file';
    }

    public function isArchived(): bool
    {
        return !is_null($this->archived_at) && is_null($this->deleted_at);
    }

    public function isTrashed(): bool
    {
        return !is_null($this->deleted_at);
    }

    /**
     * Days remaining before permanent deletion (from archived_at or deleted_at).
     */
    public function daysUntilPermanentDeletion(): int
    {
        $anchor = $this->deleted_at ?? $this->archived_at;
        if (!$anchor) return 30;

        $daysGone = now()->diffInDays($anchor);
        return max(0, 30 - (int) $daysGone);
    }

    // ─── Scopes ──────────────────────────────────────────────────────────────

    /**
     * Files that are archived but NOT soft-deleted.
     */
    public function scopeArchived($query)
    {
        return $query->withTrashed()
            ->whereNotNull('archived_at')
            ->whereNull('deleted_at');
    }

    /**
     * Files that are soft-deleted (in trash).
     */
    public function scopeTrashed($query)
    {
        return $query->onlyTrashed();
    }

    /**
     * All "inactive" files: archived + trashed.
     */
    public function scopeInactive($query)
    {
        return $query->withTrashed()
            ->where(function ($q) {
                $q->whereNotNull('archived_at')
                    ->orWhereNotNull('deleted_at');
            });
    }
}
