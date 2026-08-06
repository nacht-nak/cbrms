<?php

namespace App\Http\Controllers;

use App\Models\Department;
use App\Http\Requests\StoreDepartmentRequest;
use App\Http\Requests\UpdateDepartmentRequest;
use Illuminate\Support\Facades\Storage;

class DepartmentController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        return response()->json(Department::whereNot('name', 'Administrator')->get());
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
    public function store(StoreDepartmentRequest $request)
    {
        $data = $request->validated();

        if ($request->hasFile('logo')) {
            $path = $request->file('logo')->store('departments', 'public');
            $data['logo'] = Storage::url($path);
        }

        $department = Department::create($data);

        return response()->json($department, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Department $department)
    {
        return response()->json($department);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Department $department)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateDepartmentRequest $request, Department $department)
    {
        $data = $request->validated();

        if ($request->hasFile('logo')) {
            // delete old logo file if exists and points to storage
            if ($department->logo && str_starts_with($department->logo, '/storage')) {
                $oldPath = ltrim(str_replace('/storage/', '', $department->logo), '/');
                Storage::disk('public')->delete($oldPath);
            }

            $path = $request->file('logo')->store('departments', 'public');
            $data['logo'] = Storage::url($path);
        }

        $department->update($data);

        return response()->json($department);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Department $department)
    {
        // remove logo file if stored in public disk
        if ($department->logo && str_starts_with($department->logo, '/storage')) {
            $oldPath = ltrim(str_replace('/storage/', '', $department->logo), '/');
            Storage::disk('public')->delete($oldPath);
        }

        $department->delete();

        return response()->json(null, 204);
    }
}
