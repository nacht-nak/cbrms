<?php

namespace App\Http\Controllers;

use App\Events\FileUploaded;
use App\Models\File;
use App\Http\Requests\StoreFileRequest;
use App\Http\Requests\UpdateFileRequest;
use App\Models\FileDetails;
use App\Models\User;
use App\Notifications\FileUploadedNotification;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class FileController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $parentId = request()->query('parent_id', null);

        $files = File::with('details')
            ->where('user_id', auth()->id())
            ->where(function ($query) use ($parentId) {
                if (is_null($parentId)) {
                    $query->whereNull('parent_id');
                } else {
                    $query->where('parent_id', $parentId);
                }
            })
            ->where(function ($query) {
                $query->where('type', 'folder')
                    ->orWhereHas('details', fn($q) => $q->whereIn('status', ['active', 'inactive']));
            })
            ->orderBy('type', 'desc') // folders first
            ->get();

        return response()->json([
            'data' => $files
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreFileRequest $request)
    {
        $data = $request->validated();
        $data['user_id'] = $request->user()->id;

        if ($data['type'] === 'file') {
            $uploadedFile = $request->file('file');
            $data['path'] = $uploadedFile->store('files', 'public');
            $data['size'] = $uploadedFile->getSize();
        }

        $file = File::create($data);

        if ($file->type === 'file') {
            FileDetails::create([
                'file_id'          => $file->id,
                'fileName'         => $data['fileName'],
                'description'      => $data['description'] ?? null,
                'authors'          => $data['authors'] ?? null,
                'publication_date' => $data['publication_date'] ?? null,
                'location'         => $data['location'] ?? null,
                'size'             => $data['size'],
                'views'            => 0,
                'downloads'        => 0,
                'status'           => 'inactive',
            ]);

            // Only notify admins if the uploader is NOT an admin
            if (!$request->user()->hasRole('admin')) {
                event(new FileUploaded($file));

                $admins = User::role('admin')->get();
                foreach ($admins as $admin) {
                    $admin->notify(new FileUploadedNotification($file));
                }
            }
        }

        return response()->json($file, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(File $folder)
    {
        return Inertia::render('FolderView', [
            'folderId' => $folder->id,
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(File $file)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateFileRequest $request, File $file)
    {
        $validated = $request->validated();

        // Update the file record itself if name is provided
        if (isset($validated['name'])) {
            $file->update(['name' => $validated['name']]);
        }

        // Update associated metadata
        if ($file->type === 'file' && $file->details) {
            $file->details->update([
                'fileName'         => $validated['fileName'] ?? $file->details->fileName,
                'description'      => $validated['description'] ?? $file->details->description,
                'authors'          => $validated['authors'] ?? $file->details->authors,
                'publication_date' => $validated['publication_date'] ?? $file->details->publication_date,
                'location'         => $validated['location'] ?? $file->details->location,
            ]);
        }

        return response()->json($file->load('details'));
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(File $file)
    {
        abort_if($file->user_id !== auth()->id(), 403);

        // If already archived, just soft-delete (move to trash)
        // If not archived, soft-delete directly
        $file->update(['archived_at' => $file->archived_at ?? now()]);
        $file->delete(); // SoftDeletes — sets deleted_at

        if ($file->type === 'folder') {
            $this->softDeleteChildren($file);
        }

        return response()->json(['message' => 'Moved to trash.']);
    }

    protected function deleteChildren(File $folder)
    {
        foreach ($folder->children as $child) {
            if ($child->type === 'file' && $child->path) {
                Storage::disk('public')->delete($child->path);
            }

            if ($child->type === 'folder') {
                $this->deleteChildren($child);
            }

            $child->delete();
        }
    }

    public function path($folderId)
    {
        $folder = File::findOrFail($folderId);

        $path = [];
        while ($folder) {
            $path[] = ['id' => $folder->id, 'name' => $folder->name];
            $folder = $folder->parent; // Make sure your File model has `parent()` relationship
        }

        return response()->json(array_reverse($path)); // From root to current folder
    }

    public function downloadSilent(File $file)
    {
        if (!$file->path || !Storage::disk('public')->exists($file->path)) {
            return response()->json(['message' => 'File not found.'], 404);
        }

        $fullPath = Storage::disk('public')->path($file->path);
        $fileName = $file->details?->fileName ?? basename($file->path);
        $mimeType = Storage::disk('public')->mimeType($file->path);

        return response()->download($fullPath, $fileName, [
            'Content-Type' => $mimeType,
        ]);
    }

    public function archive(File $file)
    {
        abort_if($file->user_id !== auth()->id(), 403);

        $file->update(['archived_at' => now()]);

        if ($file->details) {
            $file->details->update(['status' => 'archived']);
        }

        return response()->json(['message' => 'File archived.', 'file' => $file->load('details')]);
    }

    protected function softDeleteChildren(File $folder): void
    {
        foreach ($folder->children as $child) {
            $child->update(['archived_at' => $child->archived_at ?? now()]);
            $child->delete();

            if ($child->type === 'folder') {
                $this->softDeleteChildren($child);
            }
        }
    }
}
