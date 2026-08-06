<?php

namespace App\Notifications;

use App\Models\File;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

class FileUploadedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public File $file) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        $profile = $this->file->user?->profile;

        return [
            'type'        => 'file_uploaded',
            'file_id'     => $this->file->id,
            'file_name'   => $this->file->name,
            'uploaded_by' => trim(($profile?->fname ?? '') . ' ' . ($profile?->lname ?? '')),
            'message'     => trim(($profile?->fname ?? '') . ' ' . ($profile?->lname ?? '')) . ' uploaded a new file: ' . $this->file->name,
        ];
    }
}
