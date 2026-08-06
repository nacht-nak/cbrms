<?php

use App\Http\Controllers\BackupController;
use App\Http\Controllers\DepartmentController;
use App\Http\Controllers\FetchController;
use App\Http\Controllers\FileController;
use App\Http\Controllers\FileImportController;
use App\Http\Controllers\SearchController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\UserController;

// ── Public routes (no auth required) ─────────────────────────────────────────
Route::get('/departments/public', [SearchController::class, 'departments']);
Route::get('/search', [SearchController::class, 'index']);
Route::get('/files/{id}/download', [SearchController::class, 'download']);
Route::post('/files/{id}/view', [SearchController::class, 'recordView']);

// ── Admin routes ──────────────────────────────────────────────────────────────
Route::middleware(['auth:sanctum', 'role:admin'])->group(function () {
    Route::apiResource('users', UserController::class);
    Route::apiResource('departments', DepartmentController::class);
    Route::get('/file/{file}/download', [FileController::class, 'downloadSilent']);

    Route::get('/all-files', [FetchController::class, 'fetchFiles']);
    Route::patch('/all-files/{file}/status', [FetchController::class, 'updateStatus']);
});

// ── Authenticated routes ───────────────────────────────────────────────────────
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/files/import', [FileImportController::class, 'store']);
    Route::get('files', [FileController::class, 'index']);
    Route::post('files', [FileController::class, 'store']);
    Route::get('files/{file}', [FileController::class, 'show']);
    Route::patch('files/{file}', [FileController::class, 'update']);
    Route::delete('files/{file}', [FileController::class, 'destroy']);
    Route::get('/files/path/{folder}', [FileController::class, 'path']);
});

Route::middleware(['auth:sanctum'])->prefix('admin/backup')->group(function () {
    Route::get('/',           [BackupController::class, 'index']);
    Route::post('/create',    [BackupController::class, 'create']);
    Route::get('/download',   [BackupController::class, 'download']);
    Route::delete('/delete',  [BackupController::class, 'delete']);
    Route::post('/restore',   [BackupController::class, 'restore']);
});

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/notifications', function (Request $request) {
        return response()->json([
            'notifications' => $request->user()->notifications()->latest()->take(20)->get(),
            'unread_count'  => $request->user()->unreadNotifications()->count(),
        ]);
    });

    Route::post('/notifications/{id}/read', function (Request $request, $id) {
        $request->user()->notifications()->findOrFail($id)->markAsRead();
        return response()->json(['success' => true]);
    });

    Route::post('/notifications/read-all', function (Request $request) {
        $request->user()->unreadNotifications->markAsRead();
        return response()->json(['success' => true]);
    });

    // ── New ──────────────────────────────────────────────────────────────────
    Route::delete('/notifications/{id}', function (Request $request, $id) {
        $request->user()->notifications()->findOrFail($id)->delete();
        return response()->json(['success' => true]);
    });

    Route::delete('/notifications', function (Request $request) {
        $request->user()->notifications()->delete();
        return response()->json(['success' => true]);
    });
});
