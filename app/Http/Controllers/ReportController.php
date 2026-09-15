<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\FileDetails;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class ReportController extends Controller
{
    public function index()
    {
        // Only files (not folders)
        $files = FileDetails::with(['file'])
            ->whereHas('file', fn($q) => $q->where('type', 'file'))
            ->get();

        $total_size      = $files->sum('size');
        $total_views     = $files->sum('views');
        $total_downloads = $files->sum('downloads');
        $total_files     = $files->count();
        $active_files    = $files->where('status', 'active')->count();
        $inactive_files  = $files->where('status', 'inactive')->count();
        $archived_files  = $files->where('status', 'archived')->count();

        $top_viewed     = $files->sortByDesc('views')->first();
        $top_downloaded = $files->sortByDesc('downloads')->first();

        // Monthly stats: last 12 months
        $monthly_stats = DB::table('file_details')
            ->join('files', 'file_details.file_id', '=', 'files.id')
            ->where('files.type', 'file')
            ->where('file_details.created_at', '>=', now()->subMonths(11)->startOfMonth())
            ->selectRaw("DATE_FORMAT(file_details.created_at, '%b %Y') as month")
            ->selectRaw("DATE_FORMAT(file_details.created_at, '%Y-%m') as month_sort")
            ->selectRaw("SUM(file_details.views) as views")
            ->selectRaw("SUM(file_details.downloads) as downloads")
            ->selectRaw("COUNT(*) as uploads")
            ->groupByRaw("DATE_FORMAT(file_details.created_at, '%Y-%m'), DATE_FORMAT(file_details.created_at, '%b %Y')")
            ->orderByRaw("DATE_FORMAT(file_details.created_at, '%Y-%m') ASC")
            ->get()
            ->map(fn($r) => [
                'month'     => $r->month,
                'views'     => (int) $r->views,
                'downloads' => (int) $r->downloads,
                'uploads'   => (int) $r->uploads,
            ]);

        return Inertia::render('Report', [
            'files'         => $files,
            'monthly_stats' => $monthly_stats,
            'summary'       => [
                'total_files'     => $total_files,
                'total_views'     => $total_views,
                'total_downloads' => $total_downloads,
                'total_size'      => $total_size,
                'active_files'    => $active_files,
                'inactive_files'  => $inactive_files,
                'archived_files'  => $archived_files,
                'top_viewed'      => $top_viewed,
                'top_downloaded'  => $top_downloaded,
            ],
        ]);
    }

    /**
     * User-scoped report — only shows the authenticated user's files.
     */
    public function userReport()
    {
        $userId = auth()->id();
        $userFileIds = \App\Models\File::where('user_id', $userId)->pluck('id');

        $files = FileDetails::with(['file'])
            ->whereIn('file_id', $userFileIds)
            ->whereHas('file', fn($q) => $q->where('type', 'file'))
            ->get();

        $total_size      = $files->sum('size');
        $total_views     = $files->sum('views');
        $total_downloads = $files->sum('downloads');
        $total_files     = $files->count();
        $active_files    = $files->where('status', 'active')->count();
        $inactive_files  = $files->where('status', 'inactive')->count();
        $archived_files  = $files->where('status', 'archived')->count();

        $top_viewed     = $files->sortByDesc('views')->first();
        $top_downloaded = $files->sortByDesc('downloads')->first();

        $monthly_stats = DB::table('file_details')
            ->join('files', 'file_details.file_id', '=', 'files.id')
            ->where('files.type', 'file')
            ->where('files.user_id', $userId)
            ->where('file_details.created_at', '>=', now()->subMonths(11)->startOfMonth())
            ->selectRaw("DATE_FORMAT(file_details.created_at, '%b %Y') as month")
            ->selectRaw("DATE_FORMAT(file_details.created_at, '%Y-%m') as month_sort")
            ->selectRaw("SUM(file_details.views) as views")
            ->selectRaw("SUM(file_details.downloads) as downloads")
            ->selectRaw("COUNT(*) as uploads")
            ->groupByRaw("DATE_FORMAT(file_details.created_at, '%Y-%m'), DATE_FORMAT(file_details.created_at, '%b %Y')")
            ->orderByRaw("DATE_FORMAT(file_details.created_at, '%Y-%m') ASC")
            ->get()
            ->map(fn($r) => [
                'month'     => $r->month,
                'views'     => (int) $r->views,
                'downloads' => (int) $r->downloads,
                'uploads'   => (int) $r->uploads,
            ]);

        return Inertia::render('Report', [
            'files'         => $files,
            'monthly_stats' => $monthly_stats,
            'summary'       => [
                'total_files'     => $total_files,
                'total_views'     => $total_views,
                'total_downloads' => $total_downloads,
                'total_size'      => $total_size,
                'active_files'    => $active_files,
                'inactive_files'  => $inactive_files,
                'archived_files'  => $archived_files,
                'top_viewed'      => $top_viewed,
                'top_downloaded'  => $top_downloaded,
            ],
        ]);
    }
}
