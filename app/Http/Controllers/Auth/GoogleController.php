<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Laravel\Socialite\Facades\Socialite;

class GoogleController extends Controller
{
    public function redirect()
    {
        return Socialite::driver('google')->redirect();
    }

    public function callback()
    {
        try {
            $googleUser = Socialite::driver('google')->user();
        } catch (\Exception $e) {
            return redirect()->route('login')
                ->withErrors(['login' => 'Google authentication failed. Please try again.']);
        }

        $user = User::where('email', $googleUser->getEmail())->first();

        if (!$user) {
            return redirect()->route('login')
                ->with('error', "Your account isn't registered yet. Please contact the administrator.");
        }

        if (!$user->hasVerifiedEmail()) {
            return redirect()->route('login')
                ->with('error', 'Please verify your account first. Please contact the administrator.');
        }

        if (!$user->google_id) {
            $user->update([
                'google_id' => $googleUser->getId(),
            ]);
        }

        Auth::login($user, remember: true);
        request()->session()->regenerate();

        return redirect()->intended(
            $user->hasRole('admin') ? route('admin.dashboard') : route('user.dashboard')
        );
    }
}
