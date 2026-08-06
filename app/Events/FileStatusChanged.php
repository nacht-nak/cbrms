<?php

namespace App\Events;

use App\Models\File;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class FileStatusChanged implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public File $file,
        public string $newStatus,
        public string $oldStatus
    ) {}

    public function broadcastOn(): array
    {
        // Notify the file owner
        return [new PrivateChannel('users.' . $this->file->user_id)];
    }

    public function broadcastAs(): string
    {
        return 'file.status.changed';
    }

    public function broadcastWith(): array
    {
        return [
            'id'         => $this->file->id,
            'name'       => $this->file->name,
            'new_status' => $this->newStatus,
            'old_status' => $this->oldStatus,
            'changed_at' => now()->toIso8601String(),
        ];
    }
}
