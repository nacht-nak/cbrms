<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreFileRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->hasFile('file')) {
            $uploadedFile = $this->file('file');
            if (!$this->filled('fileName')) {
                $this->merge([
                    'fileName' => pathinfo($uploadedFile->getClientOriginalName(), PATHINFO_FILENAME),
                ]);
            }
            if (!$this->filled('name')) {
                $this->merge([
                    'name' => $uploadedFile->getClientOriginalName(),
                ]);
            }
        }
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'type' => 'required|in:file,folder',
            'parent_id' => 'nullable|exists:files,id',

            'file' => 'required_if:type,file|file',
            'fileName' => 'required_if:type,file|string|max:255',

            'description' => 'nullable|string',
            'authors' => 'nullable|string',
            'publication_date' => 'nullable|date',
            'location' => 'nullable|string',
        ];
    }

    public function messages(): array
    {
        return [
            'file.uploaded' => 'The file failed to upload. Please ensure the file does not exceed the server upload limit and try again.',
        ];
    }
}
