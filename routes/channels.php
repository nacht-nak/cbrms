<?php

use App\Models\Conversation;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

Broadcast::channel('conversation.{conversationId}', function ($user, $conversationId) {
    $conversation = Conversation::find($conversationId);

    if (!$conversation) return false;

    return in_array($user->id, [
        $conversation->user_one_id,
        $conversation->user_two_id,
    ]);
});

// Admins only — for "file uploaded" notifications
Broadcast::channel('admins', function ($user) {
    return $user->roles()->where('name', 'admin')->exists();
});

// Per-user — for "file status changed" notifications
Broadcast::channel('users.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});
