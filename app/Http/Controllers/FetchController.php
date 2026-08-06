<?php

namespace App\Http\Controllers;

use App\Events\FileStatusChanged;
use App\Models\Department;
use App\Models\File;
use App\Notifications\FileStatusChangedNotification;
use Illuminate\Http\Request;

class FetchController extends Controller
{
    public function fetchFiles(Request $request)
    {
        $files = File::with(['details', 'user.profile.department'])
            ->where('type', '!=', 'folder')
            ->whereNotNull('user_id')
            ->whereHas('details', fn($q) => $q->whereIn('status', ['active', 'inactive']))
            ->latest()
            ->get();

        $grouped = $files->groupBy(function ($file) {
            return $file->user?->profile?->department_id ?? 0;
        });

        $departments = Department::all()->keyBy('id');
        $adminDeptId = $departments->first(fn($d) => strtolower($d->name) === 'administrator')?->id;

        $result = $grouped
            ->filter(fn($files, $deptId) => $deptId > 0 && $deptId !== $adminDeptId)
            ->map(function ($files, $deptId) use ($departments) {
                $dept = $departments->get($deptId);
                return [
                    'id'    => $dept?->id ?? $deptId,
                    'name'  => $dept?->name ?? 'Unknown Department',
                    'logo'  => $dept?->logo ?? null,
                    'files' => $files->map(function ($file) {
                        $profile = $file->user?->profile;
                        return array_merge($file->toArray(), [
                            'uploader' => [
                                'id'     => $file->user_id,
                                'name'   => trim(($profile?->fname ?? '') . ' ' . ($profile?->lname ?? '')),
                                'avatar' => $profile?->avatar ?? null,
                            ],
                        ]);
                    })->values(),
                ];
            })
            ->values();

        return response()->json($result);
    }

    /**
     * Update the status of a file's details.
     * Allowed statuses match FileDetails: inactive, active, archived
     */
    public function updateStatus(Request $request, File $file)
    {
        $request->validate([
            'status' => ['required', 'string', 'in:inactive,active,archived'],
        ]);

        $details = $file->details;

        if (!$details) {
            return response()->json(['message' => 'File details not found.'], 404);
        }

        $oldStatus = $details->status;
        $newStatus = $request->status;

        if ($oldStatus === $newStatus) {
            return response()->json(['message' => 'Status unchanged.', 'status' => $oldStatus]);
        }

        $details->update(['status' => $newStatus]);

        // Fire real-time event to the file owner
        event(new FileStatusChanged($file, $newStatus, $oldStatus));

        // Persist notification for the file owner
        $file->user?->notify(new FileStatusChangedNotification($file, $newStatus, $oldStatus));

        return response()->json([
            'message' => 'Status updated successfully.',
            'status'  => $newStatus,
        ]);
    }
}
