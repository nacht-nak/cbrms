<?php

namespace App\Http\Middleware;

use App\Models\Conversation;
use App\Models\GuestAccount;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    public function handle(Request $request, \Closure $next): \Symfony\Component\HttpFoundation\Response
    {
        $response = parent::handle($request, $next);

        $response->headers->set('Cache-Control', 'no-cache, no-store, must-revalidate');
        $response->headers->set('Pragma', 'no-cache');
        $response->headers->set('Vary', 'X-Inertia');

        return $response;
    }

    public function version(Request $request): ?string
    {
        return parent::version($request);
    }


    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'auth' => [
                'user' => $request->user()?->load('roles', 'profile'),
                'role' => $request->user()?->getRoleNames()->first(),
            ],

            'conversations' => function () use ($request) {
                if (! $request->user()) return [];

                $userId = $request->user()->id;

                return Conversation::query()
                    ->where(function ($q) use ($userId) {
                        $q->where('user_one_id', $userId)
                            ->orWhere('user_two_id', $userId);
                    })
                    ->with([
                        'userOne.profile',
                        'userTwo.profile',
                        'latestMessage', // uses latestOfMany() — see Conversation model below
                    ])
                    ->orderByDesc('last_message_at')
                    ->limit(20)
                    ->get()
                    ->map(function ($conv) use ($userId) {
                        $other = $conv->user_one_id === $userId
                            ? $conv->userTwo
                            : $conv->userOne;

                        return [
                            'id'           => $conv->id,
                            'other_user'   => $other,
                            'last_message' => $conv->latestMessage?->body,
                            'updated_at'   => $conv->last_message_at?->toISOString(),
                            'unread'       => $conv->messages()
                                ->where('sender_id', '!=', $userId)
                                ->whereNull('read_at')
                                ->count(),
                        ];
                    });
            },

            'guestConversations' => function () use ($request) {
                $user = $request->user();
                if (! $user || ! $user->hasRole('admin')) return [];

                return GuestAccount::with(['messages' => fn($q) => $q->orderByDesc('created_at')->limit(1)])
                    ->withCount(['messages as unread' => fn($q) => $q->where('from', 'guest')->whereNull('read_at')])
                    ->orderByDesc('last_seen_at')
                    ->get()
                    ->map(fn($g) => [
                        'id'           => $g->id,
                        'guest_id'     => $g->guest_id,
                        'guest_name'   => $g->guest_name,
                        'ip_address'   => $g->ip_address,
                        'last_seen_at' => $g->last_seen_at?->toISOString(),
                        'last_message' => $g->messages->first()?->body,
                        'unread'       => $g->unread ?? 0,
                        'updated_at'   => $g->messages->first()?->created_at?->toISOString()
                            ?? $g->last_seen_at?->toISOString(),
                    ]);
            },

            'isAdmin' => fn() => $request->user()?->hasRole('admin') ?? false,
        ];
    }
}
