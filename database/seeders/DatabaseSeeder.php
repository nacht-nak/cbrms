<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Profile;
use App\Models\Department;
use Spatie\Permission\Models\Role;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Seed departments
        $departments = [
            ['name' => 'Administrator', 'logo' => null],
            ['name' => 'College of Computer Studies', 'logo' => null],
            ['name' => 'College of Forestry', 'logo' => null],
            ['name' => 'College of Teacher Education', 'logo' => null],
        ];
        foreach ($departments as $dept) {
            Department::create($dept);
        }

        // 2. Seed roles
        $roles = ['admin', 'user'];
        foreach ($roles as $role) {
            Role::firstOrCreate([
                'name'       => $role,
                'guard_name' => 'web',
            ]);
        }

        // 3. Create admin user
        $adminUser = User::factory()->create([
            'username' => 'cbrms',
            'email'    => 'cbrmscpsu@gmail.com',
            'password' => bcrypt('cbrmsadmin123'),
        ]);

        // Assign admin role
        $adminUser->assignRole('admin');

        // 4. Create profile for admin
        Profile::factory()->create([
            'user_id'        => $adminUser->id,
            'department_id'  => Department::first()->id,
            'fname'          => 'Admin',
            'lname'          => 'User',
            'gender'         => 'Male',
            'birthdate'      => now()->subYears(30)->format('Y-m-d'),
            'contact_number' => '09123456789',
            'address'        => 'Admin Address',
        ]);
    }
}
