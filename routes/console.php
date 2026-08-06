<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

// Artisan::command('inspire', function () {
//     $this->comment(Inspiring::quote());
// })->purpose('Display an inspiring quote');

Schedule::command('backup:run')->dailyAt('02:00')->withoutOverlapping();
Schedule::command('backup:clean')->dailyAt('03:00')->withoutOverlapping();
