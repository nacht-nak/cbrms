<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DepartmentSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $departments = [
            ['name' => 'College of Computer Studies', 'logo' => null],
            ['name' => 'College of Forestry', 'logo' => null],
            ['name' => 'College of Teacher Education', 'logo' => null],
        ];

        DB::table('departments')->insert($departments);
    }
}
