<?php

namespace App\Http\Controllers;

use App\Models\GuestAccount;
use App\Models\GuestMessage;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class FloatingBotController extends Controller
{
    /** GET /bot/admin-status */
    public function adminStatus(): JsonResponse
    {
        return response()->json(['online' => $this->isAdminOnline()]);
    }

    /** POST /bot/chat */
    public function chat(Request $request): JsonResponse
    {
        $request->validate([
            'message'    => 'required|string|max:2000',
            'guest_name' => 'required|string|max:100',
            'guest_id'   => 'required|string|max:100',
        ]);

        $userMessage = $request->input('message');
        $guestName   = trim($request->input('guest_name'));
        $guestId     = trim($request->input('guest_id'));
        $adminOnline = $this->isAdminOnline();

        // Upsert guest account — no users table touched
        $guest = GuestAccount::updateOrCreate(
            ['guest_id' => $guestId],
            [
                'guest_name'   => $guestName,
                'ip_address'   => $request->ip(),
                'last_seen_at' => now(),
            ]
        );

        // Always store guest message in guest_messages
        GuestMessage::create([
            'guest_account_id' => $guest->id,
            'from'             => 'guest',
            'body'             => $userMessage,
        ]);

        if ($adminOnline) {
            // Notify admin via event (using a simple broadcast on a public channel)
            broadcast(new \App\Events\GuestMessageReceived($guest, $userMessage))->toOthers();

            return response()->json([
                'reply'      => "✅ Message sent to admin! I'll show their reply here as soon as they respond.",
                'from_admin' => false,
                'guest_id'   => $guest->id,
            ]);
        }

        $reply = $this->askGroq($userMessage, $guestName);
        return response()->json([
            'reply'      => $reply,
            'from_admin' => false,
            'guest_id'   => $guest->id,
        ]);
    }

    /**
     * GET /bot/replies?guest_account_id=X&after=Y
     * Returns new admin replies the guest hasn't seen yet.
     */
    public function replies(Request $request): JsonResponse
    {
        $guestAccountId = (int) $request->query('guest_account_id');
        $afterId        = (int) $request->query('after', 0);
        $guestId        = $request->query('guest_id', '');

        if (! $guestAccountId) {
            return response()->json(['messages' => []]);
        }

        $messages = GuestMessage::where('guest_account_id', $guestAccountId)
            ->where('from', 'admin')
            ->where('id', '>', $afterId)
            ->orderBy('id')
            ->get(['id', 'body', 'created_at']);

        // Update last_seen
        GuestAccount::where('guest_id', $guestId)->update(['last_seen_at' => now()]);

        return response()->json(['messages' => $messages]);
    }

    /**
     * GET /bot/guest-inbox
     * For the ADMIN panel — list all guest accounts with their latest message.
     * Protect this route with auth + admin middleware.
     */
    public function guestInbox(): JsonResponse
    {
        $guests = GuestAccount::with(['messages' => function ($q) {
            $q->orderByDesc('created_at')->limit(1);
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
                'unread'       => $g->messages()->where('from', 'guest')->whereNull('read_at')->count(),
            ]);

        return response()->json(['guests' => $guests]);
    }

    /**
     * GET /bot/guest-thread/{guestAccount}
     * Full thread for one guest — for admin to read and reply.
     */
    public function guestThread(GuestAccount $guestAccount): JsonResponse
    {
        $messages = $guestAccount->messages()->orderBy('created_at')->get();

        // Mark guest messages as read
        $guestAccount->messages()->where('from', 'guest')->whereNull('read_at')->update(['read_at' => now()]);

        return response()->json([
            'guest'    => $guestAccount,
            'messages' => $messages,
        ]);
    }

    /**
     * POST /bot/guest-reply/{guestAccount}
     * Admin sends a reply to a specific guest.
     */
    public function guestReply(Request $request, GuestAccount $guestAccount): JsonResponse
    {
        $request->validate(['body' => 'required|string|max:5000']);

        $message = GuestMessage::create([
            'guest_account_id' => $guestAccount->id,
            'from'             => 'admin',
            'body'             => $request->input('body'),
            'admin_id'         => auth()->id(),
        ]);

        return response()->json(['message' => $message]);
    }

    /* ─── Private helpers ──────────────────────────────────────────────────── */

    private function isAdminOnline(): bool
    {
        $threshold = now()->subMinutes(5)->timestamp;

        return DB::table('sessions')
            ->join('users', 'sessions.user_id', '=', 'users.id')
            ->where('sessions.last_activity', '>=', $threshold)
            ->whereExists(function ($query) {
                $query->select(DB::raw(1))
                    ->from('model_has_roles')
                    ->join('roles', 'model_has_roles.role_id', '=', 'roles.id')
                    ->whereColumn('model_has_roles.model_id', 'users.id')
                    ->where('model_has_roles.model_type', 'App\\Models\\User')
                    ->where('roles.name', 'admin');
            })
            ->exists();
    }

    private function askGroq(string $userMessage, string $guestName): string
    {
        $apiKey = config('services.groq.key');

        if (! $apiKey) {
            return "⚠️ AI assistant is not configured. Please contact the admin directly.";
        }

        $systemPrompt = "You are a helpful assistant for CBRMS (Community-Based Resource Management System). "
            . "You are talking with {$guestName}. The admin is currently offline. "
            . "Answer questions helpfully, concisely, and in a friendly tone. "
            . "If asked about a word or topic, give a clear definition. "
            . "Never pretend to be a human admin. Address the user by name occasionally.";

        try {
            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $apiKey,
                'Content-Type'  => 'application/json',
            ])->timeout(20)->post('https://api.groq.com/openai/v1/chat/completions', [
                'model'      => 'llama-3.3-70b-versatile',
                'max_tokens' => 400,
                'messages'   => [
                    ['role' => 'system', 'content' => $systemPrompt],
                    ['role' => 'user',   'content' => $userMessage],
                ],
            ]);

            Log::info('Groq response', ['status' => $response->status(), 'body' => $response->json()]);

            $data = $response->json();
            return $data['choices'][0]['message']['content']
                ?? "I'm sorry, I couldn't generate a response. Please try again.";
        } catch (\Throwable $e) {
            Log::error('FloatingBot Groq error', ['error' => $e->getMessage()]);
            return "I'm having trouble connecting right now. Please try again in a moment!";
        }
    }
}
