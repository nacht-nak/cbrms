<?php

namespace App\Http\Controllers;

use App\Models\File;
use App\Models\FileDetails;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index()
    {
        // Overview Stats
        $totalFiles     = File::where('type', 'file')->count();
        $totalFolders   = File::where('type', 'folder')->count();
        $totalUsers     = User::count();
        $totalViews     = FileDetails::sum('views');
        $totalDownloads = FileDetails::sum('downloads');

        // Active vs Archived vs Inactive
        $filesByStatus = FileDetails::select('status', DB::raw('count(*) as count'))
            ->groupBy('status')
            ->pluck('count', 'status');

        // Recent Files (last 7 uploads with details)
        $recentFiles = File::with(['details', 'user'])
            ->where('type', 'file')
            ->latest()
            ->take(7)
            ->get()
            ->map(fn($file) => [
                'id'         => $file->id,
                'name'       => $file->name,
                'user'       => $file->user?->username ?? 'Unknown',
                'status'     => $file->details?->status ?? 'inactive',
                'views'      => $file->details?->views ?? 0,
                'downloads'  => $file->details?->downloads ?? 0,
                'size'       => $file->details?->size ?? 0,
                'created_at' => $file->created_at?->diffForHumans(),
            ]);

        // Top 5 most viewed files
        $topViewed = FileDetails::with('file')
            ->orderByDesc('views')
            ->take(5)
            ->get()
            ->map(fn($detail) => [
                'name'      => $detail->file?->name ?? 'Unknown',
                'views'     => $detail->views,
                'downloads' => $detail->downloads,
            ]);

        // Uploads per month (last 6 months)
        // Fix: group AND order by the same DATE_FORMAT expression — compatible
        // with MySQL's strict only_full_group_by mode.
        $uploadsPerMonth = File::where('type', 'file')
            ->where('created_at', '>=', now()->subMonths(6))
            ->select(
                DB::raw("DATE_FORMAT(created_at, '%b %Y') as month"),
                DB::raw("DATE_FORMAT(created_at, '%Y-%m') as sort_key"),
                DB::raw('count(*) as count')
            )
            ->groupBy(
                DB::raw("DATE_FORMAT(created_at, '%b %Y')"),
                DB::raw("DATE_FORMAT(created_at, '%Y-%m')")
            )
            ->orderBy(DB::raw("DATE_FORMAT(created_at, '%Y-%m')"), 'asc')
            ->get()
            ->map(fn($row) => [
                'month' => $row->month,
                'count' => (int) $row->count,
            ]);

        // New users this month
        $newUsersThisMonth = User::whereMonth('created_at', now()->month)
            ->whereYear('created_at', now()->year)
            ->count();

        return Inertia::render('Dashboard', [
            'stats' => [
                'totalFiles'        => $totalFiles,
                'totalFolders'      => $totalFolders,
                'totalUsers'        => $totalUsers,
                'totalViews'        => $totalViews,
                'totalDownloads'    => $totalDownloads,
                'newUsersThisMonth' => $newUsersThisMonth,
            ],
            'filesByStatus'   => $filesByStatus,
            'recentFiles'     => $recentFiles,
            'topViewed'       => $topViewed,
            'uploadsPerMonth' => $uploadsPerMonth,
        ]);
    }


    public function UserDashboard()
    {
        $user = Auth::user();

        $fileIds = File::where('user_id', $user->id)->pluck('id');

        $stats = [
            'totalFiles'     => File::where('user_id', $user->id)
                ->where('type', 'file')
                ->count(),

            'totalViews'     => FileDetails::whereIn('file_id', $fileIds)
                ->sum('views'),

            'totalDownloads' => FileDetails::whereIn('file_id', $fileIds)
                ->sum('downloads'),

            'totalFolders'   => File::where('user_id', $user->id)
                ->where('type', 'folder')
                ->count(),
        ];

        $recentFiles = File::with('details')
            ->where('user_id', $user->id)
            ->latest()
            ->take(5)
            ->get()
            ->map(fn($file) => [
                'name'      => $file->details?->fileName ?? $file->name,  // ✅ details (plural)
                'type'      => $file->type,
                'date'      => $file->created_at->diffForHumans(),
                'status'    => $file->details?->status ?? 'inactive',      // ✅
                'views'     => $file->details?->views ?? 0,                // ✅
                'downloads' => $file->details?->downloads ?? 0,            // ✅
            ]);

        $recentActivities = File::with('details')
            ->where('user_id', $user->id)
            ->latest()
            ->take(5)
            ->get()
            ->map(fn($file) => [
                'action' => match ($file->details?->status) {              // ✅
                    'active'   => 'Uploaded',
                    'archived' => 'Archived',
                    default    => 'Added',
                },
                'file'  => $file->details?->fileName ?? $file->name,      // ✅
                'time'  => $file->created_at->diffForHumans(),
                'color' => match ($file->details?->status) {              // ✅
                    'active'   => '#3b82f6',
                    'archived' => '#f59e0b',
                    default    => '#6b7280',
                },
            ]);

        return Inertia::render('User/Dashboard', [
            'stats'       => $stats,
            'recentFiles' => $recentFiles,
            'activities'  => $recentActivities,
        ]);
    }
}
