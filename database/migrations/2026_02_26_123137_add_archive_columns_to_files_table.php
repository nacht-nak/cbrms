<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('files', function (Blueprint $table) {
            // Soft delete: null = active, timestamp = trashed
            $table->softDeletes();
            // When file was archived (for 30-day countdown)
            $table->timestamp('archived_at')->nullable()->after('updated_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('files', function (Blueprint $table) {
            $table->dropSoftDeletes();
            $table->dropColumn('archived_at');
        });
    }
};
