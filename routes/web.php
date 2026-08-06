<?php

use App\Http\Controllers\ArchivedController;
use App\Http\Controllers\Auth\GoogleController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\CredentialVerificationController;
use App\Http\Controllers\FileController;
use App\Http\Controllers\FileImportController;
use App\Http\Controllers\FloatingBotController;
use App\Http\Controllers\MessageController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
    ]);
});

Route::middleware('guest')->group(function () {
    Route::get('auth/google',          [GoogleController::class, 'redirect'])->name('auth.google');
    Route::get('auth/google/callback', [GoogleController::class, 'callback'])->name('auth.google.callback');
});

Route::prefix('bot')->group(function () {
    Route::get('/admin-status',  [FloatingBotController::class, 'adminStatus'])->name('bot.admin-status');
    Route::post('/chat',         [FloatingBotController::class, 'chat'])->name('bot.chat');
    Route::get('/replies',       [FloatingBotController::class, 'replies'])->name('bot.replies');
});

Route::middleware(['auth', 'role:admin'])->prefix('bot')->group(function () {
    Route::get('/guest-inbox',                 [FloatingBotController::class, 'guestInbox'])->name('bot.guest-inbox');
    Route::get('/guest-thread/{guestAccount}', [FloatingBotController::class, 'guestThread'])->name('bot.guest-thread');
    Route::post('/guest-reply/{guestAccount}', [FloatingBotController::class, 'guestReply'])->name('bot.guest-reply');
});

Route::get('/verify-credentials/{id}/{hash}', [CredentialVerificationController::class, 'verify'])
    ->name('verification.verify-credentials')
    ->middleware('signed');

Route::middleware(['auth:sanctum', 'role:admin'])
    ->post('admin/users/{user}/resend-verification', [UserController::class, 'resendVerification'])
    ->name('users.resend-verification');

Route::middleware(['auth:sanctum', 'role:admin'])->prefix('admin')->group(function () {

    Route::get('dashboard', [DashboardController::class, 'index'])->name('admin.dashboard');
    Route::get('/admin/reports', [ReportController::class, 'index'])->name('admin.reports');
    Route::get('/backup', fn() => inertia('BackupManager'))->name('admin.backup');

    Route::get('users', fn() => Inertia::render('Userlist'))->name('users');
    Route::get('departments', fn() => Inertia::render('Department'))->name('departments');

    Route::get('file-manager', fn() => Inertia::render('FileManager', ['folderId' => null]))->name('file-manager');
    Route::get('all-files', fn() => Inertia::render('Files/IndexFiles'))->name('all-files');

    Route::get('file-manager/import-excel', [FileImportController::class, 'index'])->name('file-manager.import');
    Route::get('file-manager/{folder}',     [FileController::class, 'show'])->name('file-manager.show');

    // ── File archive action ────────────────────────────────────────────────────
    Route::patch('files/{file}/archive', [FileController::class, 'archive'])->name('files.archive');

    // ── Archive / Trash management ────────────────────────────────────────────
    Route::prefix('archived')->group(function () {
        Route::get('/',              [ArchivedController::class, 'index'])->name('archived.index');
        Route::get('/list',          [ArchivedController::class, 'list'])->name('archived.list');

        // Bulk actions MUST come before /{file} routes to avoid {file} swallowing "bulk-restore"
        Route::post('/bulk-restore', [ArchivedController::class, 'bulkRestore'])->name('archived.bulk-restore');
        Route::delete('/bulk-delete', [ArchivedController::class, 'bulkForceDelete'])->name('archived.bulk-force-delete');

        // Single file actions
        Route::post('/{file}/restore', [ArchivedController::class, 'restore'])->name('archived.restore');
        Route::delete('/{file}',      [ArchivedController::class, 'forceDelete'])->name('archived.force-delete');
    });
});

Route::middleware(['auth:sanctum', 'role:user'])->prefix('user')->group(function () {
    Route::get('dashboard', [DashboardController::class, 'UserDashboard'])->name('user.dashboard');

    Route::get('file-manager', fn() => Inertia::render('FileManager', ['folderId' => null]))->name('user.file-manager');
    Route::get('file-manager/{folder}', [FileController::class, 'show'])->name('user.file-manager.show');
});

Route::middleware('auth')->group(function () {
    Route::get('/profile',    [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile',  [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/messages',       [MessageController::class, 'index'])->name('messages.index');
    Route::get('/messages/users', [MessageController::class, 'users'])->name('messages.users');

    Route::get('/messages/guest/{guestAccount}',                                   [MessageController::class, 'showGuest'])->name('messages.guest.show');
    Route::post('/messages/guest/{guestAccount}/reply',                            [MessageController::class, 'replyGuest'])->name('messages.guest.reply');
    Route::delete('/messages/guest/{guestAccount}/message/{guestMessage}',         [MessageController::class, 'destroyGuestMessage'])->name('messages.guest.destroy.message');
    Route::delete('/messages/guest/{guestAccount}',                                [MessageController::class, 'destroyGuestConversation'])->name('messages.guest.destroy');

    Route::get('/messages/{user}',                                                 [MessageController::class, 'show'])->name('messages.show');
    Route::post('/messages/{conversation}',                                        [MessageController::class, 'store'])->name('messages.store');
    Route::get('/messages/{user}/json',                                            [MessageController::class, 'showJson'])->name('messages.json');
    Route::delete('/messages/{conversation}/message/{message}',                   [MessageController::class, 'destroyMessage'])->name('messages.destroy.message');
    Route::delete('/messages/{conversation}',                                      [MessageController::class, 'destroyConversation'])->name('messages.destroy.conversation');
});

require __DIR__ . '/auth.php';
