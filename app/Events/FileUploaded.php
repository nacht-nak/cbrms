<?php

namespace App\Events;

use App\Models\File;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class FileUploaded implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public File $file) {}

    public function broadcastOn(): array
    {
        // Broadcast to admins channel
        return [new PrivateChannel('admins')];
    }

    public function broadcastAs(): string
    {
        return 'file.uploaded';
    }

    public function broadcastWith(): array
    {
        $profile = $this->file->user?->profile;

        return [
            'id'          => $this->file->id,
            'name'        => $this->file->name,
            'uploaded_by' => trim(($profile?->fname ?? '') . ' ' . ($profile?->lname ?? '')),
            'uploaded_at' => $this->file->created_at->toIso8601String(),
        ];
    }
}
