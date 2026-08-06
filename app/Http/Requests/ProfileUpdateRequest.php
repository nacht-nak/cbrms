<?php

namespace App\Http\Requests;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ProfileUpdateRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            // User table fields
            'username' => [
                'required',
                'string',
                'max:255',
                Rule::unique(User::class)->ignore($this->user()->id),
            ],
            'email' => [
                'required',
                'string',
                'lowercase',
                'email',
                'max:255',
                Rule::unique(User::class)->ignore($this->user()->id),
            ],

            // Profile table fields
            'avatar'         => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
            'fname'          => ['required', 'string', 'max:50'],
            'mname'          => ['nullable', 'string', 'max:50'],
            'lname'          => ['required', 'string', 'max:50'],
            'suffix'         => ['nullable', 'string', 'max:10'],
            'gender'         => ['required', Rule::in(['male', 'female', 'other'])],
            'birthdate'      => ['required', 'date', 'before:today'],
            'contact_number' => ['nullable', 'string', 'max:20'],
            'address'        => ['nullable', 'string'],
        ];
    }
}
