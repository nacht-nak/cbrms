@component('mail::message')
    # Welcome, {{ $user->profile->fname }}!

    An account has been created for you. Please verify your email address to access your credentials.

    **Username:** `{{ $user->username }}`

    Click the button below to verify your email and view your login password.

    @component('mail::button', ['url' => $verificationUrl, 'color' => 'primary'])
        Verify Email & View Password
    @endcomponent

    This link will expire in **60 minutes**. If you did not expect this email, you can ignore it.

    Thanks,<br>
    {{ config('app.name') }}
@endcomponent
