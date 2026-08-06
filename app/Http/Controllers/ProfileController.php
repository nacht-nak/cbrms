<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProfileUpdateRequest;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    /**
     * Display the user's profile form.
     */
    public function edit(Request $request): Response
    {
        return Inertia::render('Profile/Edit', [
            'mustVerifyEmail' => $request->user() instanceof MustVerifyEmail,
            'status' => session('status'),
        ]);
    }

    /**
     * Update the user's profile information.
     */
    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        $validated = $request->validated();

        // Update users table
        $user = $request->user();
        $user->username = $validated['username'];
        $user->email    = $validated['email'];

        if ($user->isDirty('email')) {
            $user->email_verified_at = null;
        }

        $user->save();

        // Handle avatar upload
        $avatarPath = $user->profile?->avatar;

        if ($request->hasFile('avatar')) {
            // Delete old avatar if it exists
            if ($avatarPath && Storage::disk('public')->exists($avatarPath)) {
                Storage::disk('public')->delete($avatarPath);
            }
            $avatarPath = $request->file('avatar')->store('avatars', 'public');
        }

        // Update profiles table (upsert in case the profile row doesn't exist yet)
        $user->profile()->updateOrCreate(
            ['user_id' => $user->id],
            [
                'avatar'         => $avatarPath,
                'fname'          => $validated['fname'],
                'mname'          => $validated['mname'] ?? null,
                'lname'          => $validated['lname'],
                'suffix'         => $validated['suffix'] ?? null,
                'gender'         => $validated['gender'],
                'birthdate'      => $validated['birthdate'],
                'contact_number' => $validated['contact_number'] ?? null,
                'address'        => $validated['address'] ?? null,
            ]
        );

        return Redirect::route('profile.edit');
    }

    /**
     * Delete the user's account.
     */
    public function destroy(Request $request): RedirectResponse
    {
        $request->validate([
            'password' => ['required', 'current_password'],
        ]);

        $user = $request->user();

        // Clean up avatar before deleting account
        if ($user->profile?->avatar && Storage::disk('public')->exists($user->profile->avatar)) {
            Storage::disk('public')->delete($user->profile->avatar);
        }

        Auth::logout();

        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return Redirect::to('/');
    }
}
