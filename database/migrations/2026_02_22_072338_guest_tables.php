<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('guest_accounts', function (Blueprint $table) {
            $table->id();
            $table->string('guest_id')->unique();   // from localStorage
            $table->string('guest_name');
            $table->string('ip_address', 45)->nullable();
            $table->timestamp('last_seen_at')->nullable();
            $table->timestamps();

            $table->index('guest_id');
        });

        Schema::create('guest_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('guest_account_id')->constrained('guest_accounts')->onDelete('cascade');
            $table->enum('from', ['guest', 'admin']);   // who sent this message
            $table->text('body');
            $table->unsignedBigInteger('admin_id')->nullable();  // which admin replied
            $table->timestamp('read_at')->nullable();
            $table->timestamps();

            $table->index(['guest_account_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('guest_messages');
        Schema::dropIfExists('guest_accounts');
    }
};
