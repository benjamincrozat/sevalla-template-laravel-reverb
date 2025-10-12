<?php

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schedule;

Schedule::call(function () {
    Log::info('Scheduled task executed!');
})->everyMinute();
