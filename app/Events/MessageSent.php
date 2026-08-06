<?php

namespace App\Events;

use App\Models\Message;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MessageSent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public Message $message) {}

    /**
     * Broadcast on:
     *  1. The conversation channel (for the open chat window)
     *  2. The RECIPIENT's private channel (for unread badge / dropdown reload)
     */
    public function broadcastOn(): array
    {
        $conversation = $this->message->conversation;

        // Figure out who the recipient is (not the sender)
        $recipientId = $conversation->user_one_id === $this->message->sender_id
            ? $conversation->user_two_id
            : $conversation->user_one_id;

        return [
            // For the open chat window (both users listening here)
            new PrivateChannel("conversation.{$this->message->conversation_id}"),

            // For the recipient's unread badge / dropdown reload
            new PrivateChannel("App.Models.User.{$recipientId}"),
        ];
    }

    public function broadcastAs(): string
    {
        return 'MessageSent';
    }

    public function broadcastWith(): array
    {
        return [
            'id'              => $this->message->id,
            'conversation_id' => $this->message->conversation_id,
            'sender_id'       => $this->message->sender_id,
            'body'            => $this->message->body,
            'read_at'         => $this->message->read_at,
            'created_at'      => $this->message->created_at->toISOString(),
            'sender'          => [
                'id'       => $this->message->sender->id,
                'username' => $this->message->sender->username,
                'avatar'   => $this->message->sender->profile?->avatar,
                'fname'    => $this->message->sender->profile?->fname,
                'lname'    => $this->message->sender->profile?->lname,
            ],
        ];
    }
}
