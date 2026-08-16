<?php

use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');

Route::inertia('features', 'marketing/features')->name('marketing.features');
Route::inertia('solutions', 'marketing/solutions')->name('marketing.solutions');
Route::inertia('industries', 'marketing/industries')->name('marketing.industries');
Route::inertia('pricing', 'marketing/pricing')->name('marketing.pricing');
Route::inertia('resources', 'marketing/resources')->name('marketing.resources');
Route::inertia('about', 'marketing/about')->name('marketing.about');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');
});

require __DIR__.'/settings.php';
