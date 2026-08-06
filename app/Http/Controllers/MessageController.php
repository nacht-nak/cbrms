<?php

namespace App\Http\Controllers;

use App\Events\MessageSent;
use App\Models\Conversation;
use App\Models\GuestAccount;
use App\Models\Message;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;

class MessageController extends Controller
{
    /**
     * List all conversations for the authenticated user.
     * For admins, also includes guest support conversations.
     */
    public function index()
    {
        $userId = auth()->id();
        $user   = auth()->user();

        $conversations = Conversation::query()
            ->with([
                'userOne.profile',
                'userTwo.profile',
                'latestMessage',
            ])
            ->where('user_one_id', $userId)
            ->orWhere('user_two_id', $userId)
            ->orderByDesc('last_message_at')
            ->get()
            ->map(function ($c) use ($userId) {
                $other = $c->getOtherUser($userId);
                $other->load('profile');

                return [
                    'id'         => $c->id,
                    'other_user' => [
                        'id'       => $other->id,
                        'username' => $other->username,
                        'profile'  => $other->profile,
                    ],
                    'last_message' => $c->latestMessage->first()?->body,
                    'unread'       => $c->messages()
                        ->where('sender_id', '!=', $userId)
                        ->whereNull('read_at')
                        ->count(),
                    'updated_at' => $c->last_message_at?->toISOString(),
                ];
            });

        // Guest conversations — only visible to admins
        $guestConversations = [];
        if ($user->hasRole('admin')) {
            $guestConversations = GuestAccount::with(['messages' => function ($q) {
                $q->orderByDesc('created_at')->limit(1);
            }])
                ->withCount(['messages as unread' => function ($q) {
                    $q->where('from', 'guest')->whereNull('read_at');
                }])
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
        }

        return Inertia::render('Messages/Index', [
            'conversations'       => $conversations,
            'guestConversations'  => $guestConversations,
            'isAdmin'             => $user->hasRole('admin'),
        ]);
    }

    /**
     * Open or create a conversation with a specific user.
     */
    public function show(User $user)
    {
        $authId = auth()->id();

        // Always store the smaller ID as user_one_id to ensure uniqueness
        [$a, $b] = $authId < $user->id
            ? [$authId, $user->id]
            : [$user->id, $authId];

        $conversation = Conversation::firstOrCreate([
            'user_one_id' => $a,
            'user_two_id' => $b,
        ]);

        $messages = $conversation->messages()
            ->with('sender.profile')
            ->get()
            ->map(fn($m) => [
                'id'              => $m->id,
                'conversation_id' => $m->conversation_id,
                'sender_id'       => $m->sender_id,
                'body'            => $m->body,
                'read_at'         => $m->read_at,
                'created_at'      => $m->created_at->toISOString(),
                'sender'          => [
                    'id'       => $m->sender->id,
                    'username' => $m->sender->username,
                    'avatar'   => $m->sender->profile?->avatar,
                    'fname'    => $m->sender->profile?->fname,
                    'lname'    => $m->sender->profile?->lname,
                ],
            ]);

        // Mark all received messages as read
        $conversation->messages()
            ->where('sender_id', $user->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return Inertia::render('Messages/Show', [
            'conversation' => [
                'id' => $conversation->id,
            ],
            'other_user' => [
                'id'       => $user->id,
                'username' => $user->username,
                'profile'  => $user->load('profile')->profile,
            ],
            'messages' => $messages,
        ]);
    }

    /**
     * Send a message in a conversation.
     */
    public function store(Request $request, Conversation $conversation)
    {
        // Make sure the auth user belongs to this conversation
        $this->authorize('participate', $conversation);

        $request->validate([
            'body' => 'required|string|max:5000',
        ]);

        $message = $conversation->messages()->create([
            'sender_id' => auth()->id(),
            'body'      => $request->body,
        ]);

        $conversation->update(['last_message_at' => now()]);

        broadcast(new MessageSent($message->load('sender.profile', 'conversation')));

        return back();
    }

    /**
     * List all users to start a conversation with.
     */
    public function users()
    {
        $authId = auth()->id();

        $users = User::with('profile')
            ->where('id', '!=', $authId)
            ->orderBy('username')
            ->get()
            ->map(fn($u) => [
                'id'       => $u->id,
                'username' => $u->username,
                'profile'  => $u->profile,
            ]);

        return Inertia::render('Messages/Users', [
            'users' => $users,
        ]);
    }

    // GET /messages/{user}/json
    public function showJson(User $user): JsonResponse
    {
        $authId = auth()->id();

        $conversation = Conversation::where(function ($q) use ($authId, $user) {
            $q->where('user_one_id', $authId)->where('user_two_id', $user->id);
        })->orWhere(function ($q) use ($authId, $user) {
            $q->where('user_one_id', $user->id)->where('user_two_id', $authId);
        })->first();

        if (! $conversation) {
            return response()->json(['messages' => [], 'conversation_id' => null]);
        }

        $messages = $conversation->messages()
            ->orderBy('created_at', 'asc')
            ->get();

        // Mark incoming messages as read
        $conversation->messages()
            ->where('sender_id', '!=', $authId)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json([
            'messages'        => $messages,
            'conversation_id' => $conversation->id,
        ]);
    }

    // ── Delete a single message ───────────────────────────────────────────────
    public function destroyMessage(Conversation $conversation, Message $message): JsonResponse
    {
        if ($message->sender_id !== auth()->id()) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        if ($message->conversation_id !== $conversation->id) {
            return response()->json(['error' => 'Not found'], 404);
        }

        $message->delete();

        return response()->json(['deleted' => true]);
    }

    // ── Delete entire conversation ────────────────────────────────────────────
    public function destroyConversation(Conversation $conversation): JsonResponse
    {
        $authId = auth()->id();

        if ($conversation->user_one_id !== $authId && $conversation->user_two_id !== $authId) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $conversation->messages()->delete();
        $conversation->delete();

        return response()->json(['deleted' => true]);
    }

    // ── Guest thread (Inertia page for admin) ─────────────────────────────────
    // GET /messages/guest/{guestAccount}
    public function showGuest(GuestAccount $guestAccount)
    {
        $messages = $guestAccount->messages()->orderBy('created_at')->get();

        // Mark guest messages as read
        $guestAccount->messages()
            ->where('from', 'guest')
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return Inertia::render('Messages/GuestShow', [
            'guest'    => [
                'id'           => $guestAccount->id,
                'guest_id'     => $guestAccount->guest_id,
                'guest_name'   => $guestAccount->guest_name,
                'ip_address'   => $guestAccount->ip_address,
                'last_seen_at' => $guestAccount->last_seen_at?->toISOString(),
            ],
            'messages' => $messages->map(fn($m) => [
                'id'         => $m->id,
                'from'       => $m->from,
                'body'       => $m->body,
                'admin_id'   => $m->admin_id,
                'read_at'    => $m->read_at,
                'created_at' => $m->created_at->toISOString(),
            ]),
        ]);
    }

    // ── Reply to a guest (from the Inertia page) ──────────────────────────────
    // POST /messages/guest/{guestAccount}/reply
    public function replyGuest(Request $request, GuestAccount $guestAccount): JsonResponse
    {
        $request->validate(['body' => 'required|string|max:5000']);

        $message = $guestAccount->messages()->create([
            'from'     => 'admin',
            'body'     => $request->body,
            'admin_id' => auth()->id(),
        ]);

        return response()->json(['message' => $message]);
    }

    // ── Delete a single guest message ─────────────────────────────────────────
    // DELETE /messages/guest/{guestAccount}/message/{guestMessage}
    public function destroyGuestMessage(GuestAccount $guestAccount, \App\Models\GuestMessage $guestMessage): JsonResponse
    {
        if ($guestMessage->guest_account_id !== $guestAccount->id) {
            return response()->json(['error' => 'Not found'], 404);
        }

        $guestMessage->delete();

        return response()->json(['deleted' => true]);
    }

    // ── Delete entire guest conversation ──────────────────────────────────────
    // DELETE /messages/guest/{guestAccount}
    public function destroyGuestConversation(GuestAccount $guestAccount): JsonResponse
    {
        $guestAccount->messages()->delete();
        $guestAccount->delete();

        return response()->json(['deleted' => true]);
    }
}
