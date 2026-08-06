<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateUserRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return auth()->check() && auth()->user()->hasRole('admin');
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'username' => 'sometimes|string|max:255|unique:users,username,' . $this->user->id,
            'email' => 'sometimes|string|email|max:255|unique:users,email,' . $this->user->id,
            'password' => 'nullable|string|min:8|confirmed',

            // Profile fields
            'department_id' => 'sometimes|exists:departments,id',
            'fname' => 'sometimes|string|max:255',
            'mname' => 'sometimes|nullable|string|max:255',
            'lname' => 'sometimes|string|max:255',
            'suffix' => 'sometimes|nullable|string|max:10',
            'gender' => 'sometimes|string|max:50',
            'contact_number' => 'sometimes|nullable|string|max:20',
            'address' => 'sometimes|nullable|string|max:255',
            'birthdate' => 'sometimes|nullable|date',
        ];
    }
}
