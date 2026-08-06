<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GuestChat extends Model
{
    protected $fillable = [
        'guest_id',
        'guest_name',
        'conversation_id',
        'ip_address',
        'last_seen_at',
    ];

    protected $casts = [
        'last_seen_at' => 'datetime',
    ];

    public function conversation()
    {
        return $this->belongsTo(Conversation::class);
    }
}
