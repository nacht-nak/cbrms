<?php

namespace App\Notifications;

use App\Models\File;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

class FileStatusChangedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public File $file,
        public string $newStatus,
        public string $oldStatus
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'type'       => 'file_status_changed',
            'file_id'    => $this->file->id,
            'file_name'  => $this->file->name,
            'new_status' => $this->newStatus,
            'old_status' => $this->oldStatus,
            'message'    => 'Your file "' . $this->file->name . '" status changed from ' . $this->oldStatus . ' to ' . $this->newStatus,
        ];
    }
}
