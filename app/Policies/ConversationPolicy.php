<?php

namespace App\Policies;

use App\Models\Conversation;
use App\Models\User;

class ConversationPolicy
{
    public function participate(User $user, Conversation $conversation): bool
    {
        return in_array($user->id, [
            $conversation->user_one_id,
            $conversation->user_two_id,
        ]);
    }
}
