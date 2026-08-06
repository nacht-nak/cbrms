<?php

namespace App\Console\Commands;

use App\Models\Department;
use App\Models\User;
use Illuminate\Console\Command;
use Spatie\Permission\Models\Role;

class CreateDevToken extends Command
{
    protected $signature = 'dev:token {--email=dev@local} {--name="Dev User"}';
    protected $description = 'Create or find a dev admin user and print a Sanctum token';

    public function handle()
    {
        $email = $this->option('email');
        $name = $this->option('name');

        $user = User::firstOrCreate(
            ['email' => $email],
            ['name' => $name, 'username' => 'dev', 'password' => bcrypt('password')]
        );

        $role = Role::firstOrCreate(['name' => 'admin']);
        if (! $user->hasRole('admin')) {
            $user->assignRole('admin');
        }

        if (Department::count() === 0) {
            Department::factory()->count(3)->create();
            $this->info('Seeded 3 departments for testing.');
        }

        $token = $user->createToken('dev-token')->plainTextToken;

        $this->info('Dev token (use as Bearer):');
        $this->line($token);

        return 0;
    }
}
