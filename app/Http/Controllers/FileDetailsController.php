<?php

namespace App\Http\Controllers;

use App\Models\FileDetails;
use App\Http\Requests\StoreFileDetailsRequest;
use App\Http\Requests\UpdateFileDetailsRequest;

class FileDetailsController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        //
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
    public function store(StoreFileDetailsRequest $request)
    {
        //
    }

    /**
     * Display the specified resource.
     */
    public function show(FileDetails $fileDetails)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(FileDetails $fileDetails)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateFileDetailsRequest $request, FileDetails $fileDetails)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(FileDetails $fileDetails)
    {
        //
    }
}
