<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreUserRequest;
use App\Http\Requests\UpdateUserRequest;
use App\Mail\UserCredentialsMail;
use App\Models\User;
use App\Models\Profile;
use App\Models\Department;
use Illuminate\Container\Attributes\Storage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;

class UserController extends Controller
{
    /**
     * Display a listing of the resource with pagination and search
     */
    public function index(Request $request)
    {
        $search = $request->query('search', '');
        $perPage = 10;

        // Base query excluding admin users
        $query = User::with('profile')
            ->whereDoesntHave('roles', function ($q) {
                $q->where('name', 'admin');
            });

        // Apply search filter if present
        if (!empty($search)) {
            $query->where(function ($q) use ($search) {
                $q->where('username', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        // Paginate results and preserve query string
        $users = $query->paginate($perPage)->withQueryString();

        // Return JSON response
        return response()->json($users);
    }

    /**
     * Store a newly created resource in storage and create a profile
     */
    public function store(StoreUserRequest $request)
    {
        $data = $request->validated();

        // Generate a random password
        $plainPassword = Str::password(12); // e.g. "aB3$xK9!mNqW"

        // Create user (email_verified_at is null — unverified)
        $user = User::create([
            'username'          => $data['username'],
            'email'             => $data['email'],
            'password'          => bcrypt($plainPassword),
            'email_verified_at' => null,
        ]);

        // Assign default role
        $user->assignRole('user');

        // Create profile
        $user->profile()->create([
            'department_id'  => $data['department_id'],
            'fname'          => $data['fname'],
            'mname'          => $data['mname'] ?? null,
            'lname'          => $data['lname'],
            'suffix'         => $data['suffix'] ?? null,
            'gender'         => $data['gender'],
            'contact_number' => $data['contact_number'] ?? null,
            'address'        => $data['address'] ?? null,
            'birthdate'      => $data['birthdate'] ?? null,
        ]);

        // Build a signed URL that carries the plain password (expires in 60 min)
        $verificationUrl = URL::temporarySignedRoute(
            'verification.verify-credentials',
            now()->addMinutes(60),
            [
                'id'       => $user->id,
                'hash'     => sha1($user->email),
                'password' => encrypt($plainPassword), // encrypted so it's safe in the URL
            ]
        );

        // Send email
        Mail::to($user->email)->send(new UserCredentialsMail($user, $plainPassword, $verificationUrl));

        return response()->json([
            'message' => 'User created successfully. Credentials sent to their email.',
            'user'    => $user->load('profile', 'roles'),
        ], 201);
    }
    /**
     * Display the specified resource
     */
    public function show(User $user)
    {
        $user->load('profile');
        return response()->json($user);
    }

    /**
     * Update the specified resource in storage
     */
    public function update(UpdateUserRequest $request, User $user)
    {
        $data = $request->validated();

        // Update password if provided
        if (!empty($data['password'])) {
            $data['password'] = bcrypt($data['password']);
        } else {
            unset($data['password']);
        }

        // Handle avatar upload
        $avatarPath = $user->profile->avatar; // keep old one by default
        if ($request->hasFile('avatar')) {
            // Delete old avatar if exists
            if ($avatarPath) {
                Storage::disk('public')->delete($avatarPath);
            }
            // Store new avatar
            $avatarPath = $request->file('avatar')->store('avatars', 'public');
        }

        // Update user fields
        $user->update([
            'username' => $data['username'] ?? $user->username,
            'email'    => $data['email'] ?? $user->email,
            'password' => $data['password'] ?? $user->password,
        ]);

        // Update profile fields
        $user->profile()->update([
            'avatar'         => $avatarPath,
            'department_id'  => $data['department_id'] ?? $user->profile->department_id,
            'fname'          => $data['fname'] ?? $user->profile->fname,
            'mname'          => $data['mname'] ?? $user->profile->mname,
            'lname'          => $data['lname'] ?? $user->profile->lname,
            'suffix'         => $data['suffix'] ?? $user->profile->suffix,
            'gender'         => $data['gender'] ?? $user->profile->gender,
            'contact_number' => $data['contact_number'] ?? $user->profile->contact_number,
            'address'        => $data['address'] ?? $user->profile->address,
            'birthdate'      => $data['birthdate'] ?? $user->profile->birthdate,
        ]);

        return response()->json([
            'message' => 'User updated successfully',
            'user'    => $user->load('profile', 'roles'),
        ]);
    }
    /**
     * Remove the specified resource from storage
     */
    public function destroy(User $user)
    {
        // Delete avatar from storage if exists
        if ($user->profile?->avatar) {
            Storage::disk('public')->delete($user->profile->avatar);
        }

        // Delete profile first
        $user->profile()->delete();

        // Delete user
        $user->delete();

        return response()->json([
            'message' => 'User deleted successfully',
        ]);
    }

    /**
     * Resend verification email with fresh credentials
     */
    public function resendVerification(User $user)
    {
        // Don't resend if already verified
        if ($user->email_verified_at) {
            return response()->json([
                'message' => 'User has already verified their credentials.',
            ], 409);
        }

        // Generate a new password
        $plainPassword = Str::password(12);

        // Update the user's password
        $user->update([
            'password' => bcrypt($plainPassword),
        ]);

        // Build a fresh signed URL
        $verificationUrl = URL::temporarySignedRoute(
            'verification.verify-credentials',
            now()->addMinutes(60),
            [
                'id'       => $user->id,
                'hash'     => sha1($user->email),
                'password' => encrypt($plainPassword),
            ]
        );

        // Resend the email
        Mail::to($user->email)->send(new UserCredentialsMail($user, $plainPassword, $verificationUrl));

        return response()->json([
            'message' => 'Verification email resent successfully.',
        ]);
    }
}
