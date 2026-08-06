<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GuestAccount extends Model
{
    protected $fillable = [
        'guest_id',
        'guest_name',
        'ip_address',
        'last_seen_at',
    ];

    protected $casts = [
        'last_seen_at' => 'datetime',
    ];

    public function messages()
    {
        return $this->hasMany(GuestMessage::class);
    }
}
