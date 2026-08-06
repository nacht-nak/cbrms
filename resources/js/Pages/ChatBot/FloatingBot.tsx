import { useState, useRef, useEffect, useCallback } from "react";

interface ChatMessage {
    id: string;
    role: "user" | "bot" | "admin";
    text: string;
    ts: Date;
}
type Step = "name" | "chat";

function uid() { return Math.random().toString(36).slice(2); }
function formatTime(d: Date) { return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }
function getCsrf(): string { return (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? ""; }
function getGuestId(): string {
    const key = "cbrms_guest_id";
    let id = localStorage.getItem(key);
    if (!id) { id = "guest_" + Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem(key, id); }
    return id;
}
function getSavedName(): string { return localStorage.getItem("cbrms_guest_name") ?? ""; }
function saveName(name: string) { localStorage.setItem("cbrms_guest_name", name); }

const FAB_SIZE = 56;
const WINDOW_W = 360;
const WINDOW_H = 560;

function clamp(v: number, lo: number, hi: number) { return Math.min(Math.max(v, lo), hi); }

const FOOTER_HEIGHT = 48; // match your footer's h-12 = 48px

function defaultFabPos() {
    return {
        x: window.innerWidth - FAB_SIZE - 24,
        y: window.innerHeight - FAB_SIZE - FOOTER_HEIGHT - 12, // sits above footer
    };
}

function windowPosFromFab(fab: { x: number; y: number }) {
    const margin = 8;
    let wx = fab.x + FAB_SIZE - WINDOW_W;
    let wy = fab.y - WINDOW_H - 12;
    if (wx < margin) wx = margin;
    if (wy < margin) wy = fab.y + FAB_SIZE + 12;
    if (wy + WINDOW_H > window.innerHeight - margin) wy = window.innerHeight - WINDOW_H - margin;
    if (wx + WINDOW_W > window.innerWidth - margin) wx = window.innerWidth - WINDOW_W - margin;
    return { x: wx, y: wy };
}

export default function FloatingBot() {
    const savedName = getSavedName();
    const [step, setStep] = useState<Step>(savedName ? "chat" : "name");
    const [guestName, setGuestName] = useState(savedName);
    const [nameInput, setNameInput] = useState("");
    const [nameError, setNameError] = useState("");
    const [open, setOpen] = useState(false);
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [loading, setLoading] = useState(false);
    const [adminOnline, setAdminOnline] = useState(false);
    const [unread, setUnread] = useState(0);
    const [isMobile, setIsMobile] = useState(false);

    // Drag: FAB
    const [fabPos, setFabPos] = useState<{ x: number; y: number } | null>(null);
    const fabDragging = useRef(false);
    const fabDidDrag = useRef(false);
    const fabDragStart = useRef({ mx: 0, my: 0, px: 0, py: 0 });

    // Drag: Window (desktop only)
    const [winPos, setWinPos] = useState<{ x: number; y: number } | null>(null);
    const winDragging = useRef(false);
    const winDragStart = useRef({ mx: 0, my: 0, px: 0, py: 0 });

    const bottomRef = useRef<HTMLDivElement>(null);
    const pollRef = useRef<ReturnType<typeof setInterval>>();
    const replyPollRef = useRef<ReturnType<typeof setInterval>>();
    const inputRef = useRef<HTMLInputElement>(null);
    const nameInputRef = useRef<HTMLInputElement>(null);
    const greetedRef = useRef(false);
    const adminOnlineRef = useRef(false);
    const lastSeenMsgIdRef = useRef<number>(0);
    const guestAccountIdRef = useRef<number | null>(null);

    // Init positions
    useEffect(() => {
        setFabPos(defaultFabPos());
        const check = () => setIsMobile(window.innerWidth < 640);
        check();
        window.addEventListener("resize", check);
        return () => window.removeEventListener("resize", check);
    }, []);

    // Clamp on resize
    useEffect(() => {
        const onResize = () => {
            setFabPos((p) => p ? {
                x: clamp(p.x, 0, window.innerWidth - FAB_SIZE),
                y: clamp(p.y, 0, window.innerHeight - FAB_SIZE - FOOTER_HEIGHT - 12), // add this
            } : p);
            setWinPos((p) => p ? {
                x: clamp(p.x, 0, window.innerWidth - WINDOW_W),
                y: clamp(p.y, 0, window.innerHeight - WINDOW_H),
            } : p);
        };
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, []);

    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, open]);

    useEffect(() => {
        if (open) {
            setUnread(0);
            if (step === "name") setTimeout(() => nameInputRef.current?.focus(), 100);
            else setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [open, step]);

    // Lock body scroll on mobile when open
    useEffect(() => {
        if (isMobile && open) document.body.style.overflow = "hidden";
        else document.body.style.overflow = "";
        return () => { document.body.style.overflow = ""; };
    }, [isMobile, open]);

    /* ── FAB drag handlers ──────────────────────────────────────────────────── */
    const onFabPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        fabDragging.current = true;
        fabDidDrag.current = false;
        const cur = fabPos ?? defaultFabPos();
        fabDragStart.current = { mx: e.clientX, my: e.clientY, px: cur.x, py: cur.y };
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }, [fabPos]);

    const onFabPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        if (!fabDragging.current) return;
        const dx = e.clientX - fabDragStart.current.mx;
        const dy = e.clientY - fabDragStart.current.my;
        if (Math.abs(dx) > 4 || Math.abs(dy) > 4) fabDidDrag.current = true;
        const nx = clamp(fabDragStart.current.px + dx, 0, window.innerWidth - FAB_SIZE);
        const ny = clamp(fabDragStart.current.py + dy, 0, window.innerHeight - FAB_SIZE);
        setFabPos({ x: nx, y: ny });
        if (open) setWinPos(windowPosFromFab({ x: nx, y: ny }));
    }, [open]);

    const onFabPointerUp = useCallback(() => {
        const wasDrag = fabDidDrag.current;
        fabDragging.current = false;
        fabDidDrag.current = false;
        if (!wasDrag) {
            setFabPos((cur) => {
                const pos = cur ?? defaultFabPos();
                setOpen((wasOpen) => {
                    if (!wasOpen) setWinPos(windowPosFromFab(pos));
                    return !wasOpen;
                });
                return cur;
            });
        }
    }, []);

    /* ── Window drag handlers (desktop header) ──────────────────────────────── */
    const onWinHeaderPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        if (isMobile || (e.target as HTMLElement).closest("button")) return;
        winDragging.current = true;
        const cur = winPos ?? { x: 0, y: 0 };
        winDragStart.current = { mx: e.clientX, my: e.clientY, px: cur.x, py: cur.y };
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }, [isMobile, winPos]);

    const onWinHeaderPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        if (!winDragging.current) return;
        const dx = e.clientX - winDragStart.current.mx;
        const dy = e.clientY - winDragStart.current.my;
        setWinPos({
            x: clamp(winDragStart.current.px + dx, 0, window.innerWidth - WINDOW_W),
            y: clamp(winDragStart.current.py + dy, 0, window.innerHeight - WINDOW_H),
        });
    }, []);

    const onWinHeaderPointerUp = useCallback(() => { winDragging.current = false; }, []);

    /* ── Poll admin status ────────────────────────────────────────────────── */
    const checkAdmin = useCallback(async () => {
        try {
            const res = await fetch("/bot/admin-status");
            const data = await res.json();
            const wasOnline = adminOnlineRef.current;
            adminOnlineRef.current = data.online;
            setAdminOnline(data.online);
            if (!greetedRef.current && step === "chat") {
                greetedRef.current = true;
                setMessages([{
                    id: uid(), role: "bot",
                    text: data.online
                        ? `👋 Welcome back, ${guestName}! An admin is online — your message goes straight to them!`
                        : `👋 Hi ${guestName}! The admin is offline right now — I'm here to help! Ask me anything. 🤖`,
                    ts: new Date(),
                }]);
            }
            if (!wasOnline && data.online && greetedRef.current) {
                setMessages((prev) => [...prev, {
                    id: uid(), role: "bot",
                    text: "🟢 An admin just came online! Your next message will go to them directly.",
                    ts: new Date(),
                }]);
            }
        } catch { /* silently fail */ }
    }, [step, guestName]);

    useEffect(() => {
        if (step !== "chat") return;
        checkAdmin();
        pollRef.current = setInterval(checkAdmin, 15_000);
        return () => clearInterval(pollRef.current);
    }, [checkAdmin, step]);

    /* ── Poll for admin replies ───────────────────────────────────────────── */
    const pollReplies = useCallback(async () => {
        if (!guestAccountIdRef.current) return;
        try {
            const res = await fetch(
                `/bot/replies?guest_account_id=${guestAccountIdRef.current}&after=${lastSeenMsgIdRef.current}&guest_id=${getGuestId()}`
            );
            if (!res.ok) return;
            const data = await res.json();
            if (data.messages?.length > 0) {
                const newMsgs: ChatMessage[] = data.messages.map((m: any) => ({
                    id: uid(), role: "admin" as const, text: m.body, ts: new Date(m.created_at),
                }));
                lastSeenMsgIdRef.current = data.messages[data.messages.length - 1].id;
                setMessages((prev) => [...prev, ...newMsgs]);
                if (!open) setUnread((n) => n + newMsgs.length);
            }
        } catch { /* silently fail */ }
    }, [open]);

    useEffect(() => {
        if (step !== "chat") return;
        replyPollRef.current = setInterval(pollReplies, 5_000);
        return () => clearInterval(replyPollRef.current);
    }, [pollReplies, step]);

    /* ── Submit name ──────────────────────────────────────────────────────── */
    function submitName() {
        const name = nameInput.trim();
        if (!name) { setNameError("Please enter your name to continue."); return; }
        if (name.length < 2) { setNameError("Name must be at least 2 characters."); return; }
        saveName(name); setGuestName(name); setNameError(""); setStep("chat");
        greetedRef.current = false;
    }
    function handleNameKey(e: React.KeyboardEvent) { if (e.key === "Enter") { e.preventDefault(); submitName(); } }

    /* ── Send message ─────────────────────────────────────────────────────── */
    async function send() {
        const text = input.trim();
        if (!text || loading) return;
        setMessages((p) => [...p, { id: uid(), role: "user", text, ts: new Date() }]);
        setInput(""); setLoading(true);
        try {
            const res = await fetch("/bot/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json", "X-CSRF-TOKEN": getCsrf() },
                body: JSON.stringify({ message: text, guest_name: guestName, guest_id: getGuestId() }),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            if (data.guest_id && !guestAccountIdRef.current) guestAccountIdRef.current = data.guest_id;
            setMessages((p) => [...p, { id: uid(), role: data.from_admin ? "admin" : "bot", text: data.reply, ts: new Date() }]);
            if (!open) setUnread((n) => n + 1);
        } catch {
            setMessages((p) => [...p, { id: uid(), role: "bot", text: "⚠️ Something went wrong. Please try again.", ts: new Date() }]);
        } finally { setLoading(false); }
    }

    function handleKey(e: React.KeyboardEvent) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }

    function resetGuest() {
        localStorage.removeItem("cbrms_guest_name");
        localStorage.removeItem("cbrms_guest_id");
        setStep("name"); setGuestName(""); setNameInput(""); setMessages([]);
        greetedRef.current = false; guestAccountIdRef.current = null; lastSeenMsgIdRef.current = 0;
    }

    // ── Window positioning ────────────────────────────────────────────────────
    const windowStyle: React.CSSProperties = isMobile
        ? {
            position: "fixed", inset: 0, width: "100%", height: "100%",
            borderRadius: 0, bottom: undefined, right: undefined,
            zIndex: 9998,
        }
        : {
            position: "fixed",
            left: winPos ? `${winPos.x}px` : undefined,
            top: winPos ? `${winPos.y}px` : undefined,
            width: `${WINDOW_W}px`,
            maxHeight: `${WINDOW_H}px`,
            borderRadius: "20px",
            zIndex: 9998,
        };

    const headerDragProps = !isMobile ? {
        onPointerDown: onWinHeaderPointerDown,
        onPointerMove: onWinHeaderPointerMove,
        onPointerUp: onWinHeaderPointerUp,
        style: { ...styles.header, cursor: "grab", userSelect: "none" as const },
    } : { style: styles.header };

    return (
        <>
            {/* ── FAB ── */}
            <div
                style={{
                    position: "fixed",
                    left: fabPos ? `${fabPos.x}px` : undefined,
                    top: fabPos ? `${fabPos.y}px` : undefined,
                    visibility: fabPos ? "visible" : "hidden",
                    width: `${FAB_SIZE}px`,
                    height: `${FAB_SIZE}px`,
                    zIndex: 9999,
                    touchAction: "none",
                    userSelect: "none",
                    cursor: fabDragging.current ? "grabbing" : "grab",
                }}
                onPointerDown={onFabPointerDown}
                onPointerMove={onFabPointerMove}
                onPointerUp={onFabPointerUp}
            >
                <button style={styles.fab} aria-label="Open chat" tabIndex={-1}>
                    {open
                        ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                        : <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                    }
                    {unread > 0 && !open && <span style={styles.badge}>{unread > 9 ? "9+" : unread}</span>}
                </button>
            </div>

            {/* ── Chat window ── */}
            {open && (
                <>
                    {/* Mobile backdrop */}
                    {isMobile && (
                        <div
                            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 9997 }}
                            onClick={() => setOpen(false)}
                        />
                    )}

                    <div style={{ ...styles.window, ...windowStyle }}>

                        {/* Header — draggable on desktop */}
                        <div {...headerDragProps}>
                            {/* Drag pill indicator (desktop) */}
                            {!isMobile && (
                                <div style={{ position: "absolute", top: 6, left: "50%", transform: "translateX(-50%)", width: 32, height: 3, borderRadius: 99, background: "rgba(255,255,255,0.25)", pointerEvents: "none" }} />
                            )}
                            <div style={styles.headerLeft}>
                                <div style={{ ...styles.avatar, background: step === "name" ? "#6366f1" : adminOnline ? "#22c55e" : "#6366f1" }}>
                                    {step === "name" ? "👋" : adminOnline ? "A" : "🤖"}
                                </div>
                                <div>
                                    <div style={styles.headerName}>{step === "name" ? "CBRMS Support" : adminOnline ? "Admin Support" : "CBRMS Bot"}</div>
                                    <div style={styles.headerStatus}>
                                        <span style={{ ...styles.dot, background: step === "chat" && adminOnline ? "#22c55e" : "#94a3b8" }} />
                                        {step === "name" ? "Tell us your name to start" : adminOnline ? "Online — sending directly" : "AI Assistant"}
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setOpen(false)} style={styles.closeBtn} aria-label="Close chat">✕</button>
                        </div>

                        {/* Name step */}
                        {step === "name" && (
                            <div style={styles.nameStep}>
                                <div style={styles.nameIllustration}>💬</div>
                                <h3 style={styles.nameTitle}>Welcome to CBRMS!</h3>
                                <p style={styles.nameSubtitle}>Please enter your name so we can personalize your support experience.</p>
                                <input
                                    ref={nameInputRef} value={nameInput}
                                    onChange={(e) => { setNameInput(e.target.value); setNameError(""); }}
                                    onKeyDown={handleNameKey} placeholder="Your name..."
                                    style={{ ...styles.nameInput, borderColor: nameError ? "#ef4444" : "#e2e8f0" }}
                                />
                                {nameError && <p style={styles.nameError}>{nameError}</p>}
                                <button onClick={submitName} style={styles.nameBtn}>Start Chatting →</button>
                            </div>
                        )}

                        {/* Chat step */}
                        {step === "chat" && (
                            <>
                                <div style={styles.body}>
                                    {messages.map((msg) => (
                                        <div key={msg.id} style={{ ...styles.row, justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                                            {msg.role !== "user" && (
                                                <div style={{ ...styles.msgAvatar, background: msg.role === "admin" ? "#22c55e" : "#6366f1" }}>
                                                    {msg.role === "admin" ? "A" : "🤖"}
                                                </div>
                                            )}
                                            <div style={{
                                                ...styles.bubble,
                                                background: msg.role === "user" ? "linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%)" : msg.role === "admin" ? "#f0fdf4" : "#f8fafc",
                                                color: msg.role === "user" ? "#fff" : "#1e293b",
                                                borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                                                border: msg.role === "admin" ? "1px solid #bbf7d0" : msg.role === "bot" ? "1px solid #e2e8f0" : "none",
                                            }}>
                                                {msg.role === "admin" && <div style={styles.adminTag}>👤 Admin replied</div>}
                                                <p style={styles.bubbleText}>{msg.text}</p>
                                                <div style={{ ...styles.timestamp, color: msg.role === "user" ? "rgba(255,255,255,0.7)" : "#94a3b8" }}>{formatTime(msg.ts)}</div>
                                            </div>
                                        </div>
                                    ))}
                                    {loading && (
                                        <div style={{ ...styles.row, justifyContent: "flex-start" }}>
                                            <div style={{ ...styles.msgAvatar, background: "#6366f1" }}>🤖</div>
                                            <div style={{ ...styles.bubble, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                                                <div className="typing-dot" style={styles.typing}><span /><span /><span /></div>
                                            </div>
                                        </div>
                                    )}
                                    <div ref={bottomRef} />
                                </div>
                                <div style={styles.footer}>
                                    <input
                                        ref={inputRef} value={input}
                                        onChange={(e) => setInput(e.target.value)} onKeyDown={handleKey}
                                        placeholder={adminOnline ? "Message admin..." : "Ask me anything..."}
                                        style={styles.input} disabled={loading}
                                    />
                                    <button onClick={send} disabled={!input.trim() || loading} style={{ ...styles.sendBtn, opacity: !input.trim() || loading ? 0.4 : 1 }}>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
                                    </button>
                                </div>
                                <div style={styles.poweredBy}>
                                    {adminOnline ? "💬 Sending to admin" : "⚡ Powered by Groq AI"}
                                    {" · "}
                                    <span onClick={resetGuest} style={{ cursor: "pointer", textDecoration: "underline", color: "#6366f1" }}>
                                        Not {guestName}?
                                    </span>
                                </div>
                            </>
                        )}
                    </div>
                </>
            )}

            <style>{`
                @keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-6px)}}
                .typing-dot span{display:inline-block;width:7px;height:7px;border-radius:50%;background:#94a3b8;margin:0 2px;animation:bounce 1.2s infinite}
                .typing-dot span:nth-child(2){animation-delay:0.2s}.typing-dot span:nth-child(3){animation-delay:0.4s}
                @keyframes slideUp{from{opacity:0;transform:translateY(20px) scale(0.96)}to{opacity:1;transform:translateY(0) scale(1)}}
                @keyframes fadeIn{from{opacity:0}to{opacity:1}}
            `}</style>
        </>
    );
}

const styles: Record<string, React.CSSProperties> = {
    fab: {
        width: "100%", height: "100%", borderRadius: "50%",
        background: "linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%)",
        color: "#fff", border: "none", cursor: "inherit",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 4px 24px rgba(99,102,241,0.45)",
        transition: "transform 0.2s, box-shadow 0.2s",
        position: "relative",
    },
    badge: {
        position: "absolute", top: "-4px", right: "-4px",
        background: "#ef4444", color: "#fff", fontSize: "10px", fontWeight: 700,
        borderRadius: "99px", minWidth: "18px", height: "18px",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "0 4px", border: "2px solid #fff",
    },
    window: {
        background: "#fff",
        boxShadow: "0 16px 64px rgba(0,0,0,0.18)",
        display: "flex", flexDirection: "column", overflow: "hidden",
        animation: "slideUp 0.25s cubic-bezier(.34,1.56,.64,1) forwards",
        fontFamily: "'Segoe UI',system-ui,sans-serif",
    },
    header: {
        background: "linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%)",
        padding: "16px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "relative",
        flexShrink: 0,
    },
    headerLeft: { display: "flex", alignItems: "center", gap: "12px" },
    avatar: {
        width: "40px", height: "40px", borderRadius: "50%",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "18px", color: "#fff", fontWeight: 700,
        border: "2px solid rgba(255,255,255,0.3)", flexShrink: 0,
    },
    headerName: { color: "#fff", fontWeight: 700, fontSize: "14px" },
    headerStatus: {
        color: "rgba(255,255,255,0.8)", fontSize: "11px",
        display: "flex", alignItems: "center", gap: "5px", marginTop: "2px",
    },
    dot: { width: "7px", height: "7px", borderRadius: "50%", display: "inline-block" },
    closeBtn: {
        background: "rgba(255,255,255,0.2)", border: "none", color: "#fff",
        cursor: "pointer", borderRadius: "8px", padding: "6px 10px",
        fontSize: "13px", flexShrink: 0,
        minWidth: 36, minHeight: 36,
        display: "flex", alignItems: "center", justifyContent: "center",
    },
    nameStep: {
        display: "flex", flexDirection: "column", alignItems: "center",
        padding: "28px 24px", gap: "12px", flex: 1, overflowY: "auto",
    },
    nameIllustration: { fontSize: "48px", lineHeight: "1" },
    nameTitle: { margin: 0, fontSize: "17px", fontWeight: 700, color: "#1e293b", textAlign: "center" },
    nameSubtitle: { margin: 0, fontSize: "13px", color: "#64748b", textAlign: "center", lineHeight: "1.5" },
    nameInput: {
        width: "100%", border: "1.5px solid #e2e8f0", borderRadius: "12px",
        padding: "10px 14px", fontSize: "14px", outline: "none",
        background: "#f8fafc", color: "#1e293b", fontFamily: "inherit",
        boxSizing: "border-box", transition: "border-color 0.2s",
    },
    nameError: { margin: "0", fontSize: "11px", color: "#ef4444", alignSelf: "flex-start" },
    nameBtn: {
        width: "100%", padding: "12px",
        borderRadius: "12px", background: "linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%)",
        color: "#fff", border: "none", fontSize: "14px", fontWeight: 600,
        cursor: "pointer", transition: "opacity 0.2s",
    },
    body: {
        flex: 1, overflowY: "auto", padding: "16px",
        display: "flex", flexDirection: "column", gap: "12px",
        background: "#fafbff",
    },
    row: { display: "flex", alignItems: "flex-end", gap: "8px" },
    msgAvatar: {
        width: "28px", height: "28px", borderRadius: "50%",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "12px", color: "#fff", flexShrink: 0,
    },
    bubble: { maxWidth: "78%", padding: "10px 14px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" },
    adminTag: {
        fontSize: "10px", fontWeight: 700, color: "#16a34a",
        marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px",
    },
    bubbleText: { margin: 0, fontSize: "13.5px", lineHeight: "1.5", whiteSpace: "pre-wrap", wordBreak: "break-word" },
    timestamp: { fontSize: "10px", marginTop: "4px", textAlign: "right" },
    typing: { display: "flex", alignItems: "center", gap: "3px", padding: "2px 0" },
    footer: {
        display: "flex", alignItems: "center", gap: "8px",
        padding: "12px 16px", borderTop: "1px solid #f1f5f9",
        background: "#fff", flexShrink: 0,
    },
    input: {
        flex: 1, border: "1px solid #e2e8f0", borderRadius: "12px",
        padding: "10px 14px", fontSize: "13.5px", outline: "none",
        background: "#f8fafc", color: "#1e293b", fontFamily: "inherit",
        minWidth: 0,
    },
    sendBtn: {
        width: "38px", height: "38px", borderRadius: "12px",
        background: "linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%)",
        color: "#fff", border: "none", cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "opacity 0.2s", flexShrink: 0,
    },
    poweredBy: {
        textAlign: "center", fontSize: "10px", color: "#94a3b8",
        padding: "6px 0 8px", background: "#fff", letterSpacing: "0.3px",
        flexShrink: 0,
    },
};
