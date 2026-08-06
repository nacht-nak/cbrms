<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreUserRequest extends FormRequest
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
            'username'       => 'required|string|max:255|unique:users,username',
            'email'          => 'required|string|email|max:255|unique:users,email',

            // Profile fields
            'department_id'  => 'required|exists:departments,id',
            'fname'          => 'required|string|max:255',
            'mname'          => 'nullable|string|max:255',
            'lname'          => 'required|string|max:255',
            'suffix'         => 'nullable|string|max:10',
            'gender'         => 'required|string|max:50',
            'contact_number' => 'nullable|string|max:20',
            'address'        => 'nullable|string|max:255',
            'birthdate'      => 'nullable|date',
        ];
    }
}
