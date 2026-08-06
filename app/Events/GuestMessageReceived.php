<?php

namespace App\Events;

use App\Models\GuestAccount;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class GuestMessageReceived implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public GuestAccount $guest,
        public string $message,
    ) {}

    public function broadcastOn(): array
    {
        // Public channel — admin listens here for new guest messages
        return [new Channel('guest-support')];
    }

    public function broadcastAs(): string
    {
        return 'GuestMessageReceived';
    }

    public function broadcastWith(): array
    {
        return [
            'guest_account_id' => $this->guest->id,
            'guest_name'       => $this->guest->guest_name,
            'message'          => $this->message,
        ];
    }
}
