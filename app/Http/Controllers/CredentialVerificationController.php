<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;

class CredentialVerificationController extends Controller
{
    public function verify(Request $request, $id, $hash)
    {
        // Laravel's 'signed' middleware already validates signature + expiry.
        // Double-check the hash matches the user's email.
        $user = User::findOrFail($id);

        if (sha1($user->email) !== $hash) {
            abort(403, 'Invalid verification link.');
        }

        // Mark email as verified if not already
        if (! $user->hasVerifiedEmail()) {
            $user->markEmailAsVerified();
        }

        // Decrypt the plain password from the URL
        try {
            $plainPassword = decrypt($request->query('password'));
        } catch (\Exception $e) {
            abort(403, 'Invalid or tampered link.');
        }

        // Return the credentials view (or JSON for SPA)
        return view('auth.credentials-revealed', [
            'username'      => $user->username,
            'plainPassword' => $plainPassword,
        ]);
    }
}
