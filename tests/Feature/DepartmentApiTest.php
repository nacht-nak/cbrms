<?php

use App\Models\Department;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;

// it('allows an authenticated admin to fetch departments', function () {
//     Role::firstOrCreate(['name' => 'admin']);

//     $user = User::factory()->create();
//     $user->assignRole('admin');

//     Department::factory()->count(3)->create();

//     Sanctum::actingAs($user, ['*']);

//     $response = $this->getJson('/api/departments');

//     $response->assertStatus(200)->assertJsonCount(3);
// });
