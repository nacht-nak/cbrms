<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <title>Your Login Credentials</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script src="https://cdn.tailwindcss.com"></script>
</head>

<body class="min-h-screen bg-gradient-to-br from-indigo-50 to-white flex items-center justify-center p-4">

    <div class="bg-white rounded-2xl shadow-xl ring-1 ring-gray-200 max-w-md w-full p-8 text-center">

        <div class="flex justify-center mb-4">
            <div class="w-14 h-14 bg-indigo-100 rounded-full flex items-center justify-center">
                <svg class="w-7 h-7 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            </div>
        </div>

        <h1 class="text-2xl font-bold text-gray-900 mb-1">Email Verified!</h1>
        <p class="text-sm text-gray-500 mb-6">
            Save these credentials now. For security, this page will not show your password again.
        </p>

        <div class="bg-gray-50 rounded-xl border border-gray-200 p-4 text-left space-y-3 mb-6">
            <div>
                <p class="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Username</p>
                <p
                    class="text-sm font-mono font-medium text-gray-800 bg-white border border-gray-200 rounded-lg px-3 py-2 select-all">
                    {{ $username }}
                </p>
            </div>
            <div>
                <p class="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Password</p>
                <p
                    class="text-sm font-mono font-medium text-gray-800 bg-white border border-gray-200 rounded-lg px-3 py-2 select-all">
                    {{ $plainPassword }}
                </p>
            </div>
        </div>

        <p class="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-6">
            ⚠️ This is the only time your password will be shown. Please save it somewhere safe.
        </p>

        <a href="{{ url('/login') }}"
            class="inline-block w-full bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl px-5 py-3 transition-all duration-150">
            Go to Login
        </a>
    </div>

</body>

</html>
