<?php

namespace App\Http\Controllers;

use App\Models\File;
use App\Models\FileDetails;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Inertia\Inertia;

class FileImportController extends Controller
{
    /**
     * Render the Import Excel page with the users list.
     */
    public function index()
    {
        $users = User::with('profile')
            ->orderBy('username')
            ->get(['id', 'username', 'email']);

        return Inertia::render('FileImportExcel', [
            'users' => $users,
        ]);
    }

    /**
     * Handle a single-row file upload from the import table.
     *
     * POST /api/files/import
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'file'             => 'required|file|max:102400', // 100 MB max
            'name'             => 'required|string|max:255',
            'fileName'         => 'required|string|max:255',
            'user_id'          => 'required|exists:users,id',
            'description'      => 'nullable|string',
            'authors'          => 'nullable|string',
            'publication_date' => 'nullable|date',
            'location'         => 'nullable|string|max:255',
            'parent_id'        => 'nullable|integer|exists:files,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => $validator->errors()->first(),
                'errors'  => $validator->errors(),
            ], 422);
        }

        $data = $validator->validated();

        $uploadedFile = $request->file('file');
        $path         = $uploadedFile->store('files', 'public');

        $file = File::create([
            'name'      => $data['name'],
            'type'      => 'file',
            'parent_id' => $data['parent_id'] ?? null,
            'path'      => $path,
            'user_id'   => $data['user_id'],
        ]);

        FileDetails::create([
            'file_id'          => $file->id,
            'fileName'         => $data['fileName'],
            'description'      => $data['description'] ?? null,
            'authors'          => $data['authors'] ?? null,
            'publication_date' => $data['publication_date'] ?? null,
            'location'         => $data['location'] ?? null,
            'size'             => $uploadedFile->getSize(),
            'views'            => 0,
            'downloads'        => 0,
            'status'           => 'inactive',
        ]);

        return response()->json($file->load('details'), 201);
    }
}
