<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FileDetails extends Model
{
    /** @use HasFactory<\Database\Factories\FileDetailsFactory> */
    use HasFactory;

    protected $fillable = [
        'file_id',
        'fileName',
        'size',
        'description',
        'authors',
        'publication_date',
        'location',
        'views',
        'downloads',
        'status',
    ];

    public function file()
    {
        return $this->belongsTo(File::class);
    }

    protected $casts = [
        'size' => 'integer',
        'views' => 'integer',
        'downloads' => 'integer',
        'publication_date' => 'date',
    ];
}
