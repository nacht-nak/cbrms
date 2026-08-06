<?php

namespace Database\Factories;

use App\Models\Department;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Profile>
 */
class ProfileFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'department_id' => Department::inRandomOrder()->first()->id,
            'avatar' => null,
            'fname' => fake()->firstName(),
            'mname' => fake()->firstName(),
            'lname' => fake()->lastName(),
            'suffix' => null,
            'gender' => fake()->randomElement(['Male', 'Female']),
            'birthdate' => fake()->date('Y-m-d', '2000-01-01'),
            'contact_number' => fake()->phoneNumber(),
            'address' => fake()->address(),
        ];
    }
}
