<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class UserCredentialsMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public User $user,
        public string $plainPassword,
        public string $verificationUrl,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Your Account Has Been Created');
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.user-credentials',
            with: [
                'user'            => $this->user,
                'plainPassword'   => $this->plainPassword,
                'verificationUrl' => $this->verificationUrl,
            ],
        );
    }
}
