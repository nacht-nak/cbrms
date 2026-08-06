<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GuestMessage extends Model
{
    protected $fillable = [
        'guest_account_id',
        'from',
        'body',
        'admin_id',
        'read_at',
    ];

    protected $casts = [
        'read_at' => 'datetime',
    ];

    public function guestAccount()
    {
        return $this->belongsTo(GuestAccount::class);
    }

    public function admin()
    {
        return $this->belongsTo(User::class, 'admin_id');
    }
}
