import { Head } from "@inertiajs/react";
import Header from "@/Layouts/Header";
import Search from "./Search";
import Footer from "@/Layouts/Footer";
import FloatingBot from "./ChatBot/FloatingBot";

export default function Welcome() {
    return (
        <>
            <Head title="Welcome" />

            <style>{`
                .welcome-bg {
                    min-height: 100vh;
                    position: relative;
                    overflow: hidden;

                    /* Light: vivid blue-indigo-violet sky */
                    background:
                        radial-gradient(ellipse 100% 60% at 50%   0%, #c7d9ff 0%,  transparent 55%),
                        radial-gradient(ellipse 70%  50% at  0%  50%, #b8c4ff 0%,  transparent 60%),
                        radial-gradient(ellipse 60%  45% at 100% 60%, #c4e0ff 0%,  transparent 55%),
                        radial-gradient(ellipse 80%  55% at 50% 110%, #d4c6ff 0%,  transparent 60%),
                        linear-gradient(160deg, #a8c4f8 0%, #bbaeff 30%, #a0c8f5 60%, #c9b8ff 100%);
                }

                .dark .welcome-bg {
                    /* Dark: deep cosmic indigo, not grey */
                    background:
                        radial-gradient(ellipse 110% 55% at 50%  -5%, rgba(99,102,241,0.5)  0%, transparent 55%),
                        radial-gradient(ellipse 70%  50% at  0%  50%, rgba(124,58,237,0.35) 0%, transparent 55%),
                        radial-gradient(ellipse 60%  45% at 100% 65%, rgba(14,116,144,0.3)  0%, transparent 50%),
                        radial-gradient(ellipse 80%  55% at 50% 115%, rgba(79,70,229,0.4)   0%, transparent 60%),
                        linear-gradient(160deg, #06081a 0%, #0b0c24 35%, #080e1f 65%, #0d0b22 100%);
                }

                /* ── Cloud puffs — light ── */
                .welcome-bg::before {
                    content: "";
                    position: absolute; inset: 0;
                    pointer-events: none; z-index: 0;
                    background:
                        radial-gradient(ellipse 42% 24% at 16% 18%, rgba(255,255,255,0.75) 0%, transparent 100%),
                        radial-gradient(ellipse 30% 18% at 76% 12%, rgba(255,255,255,0.65) 0%, transparent 100%),
                        radial-gradient(ellipse 22% 14% at  6% 55%, rgba(255,255,255,0.55) 0%, transparent 100%),
                        radial-gradient(ellipse 36% 22% at 90% 78%, rgba(255,255,255,0.6)  0%, transparent 100%),
                        radial-gradient(ellipse 55% 30% at 50%  5%, rgba(255,255,255,0.5)  0%, transparent 100%);
                    animation: wcDrift 22s ease-in-out infinite alternate;
                }

                /* ── Stars — dark only ── */
                .dark .welcome-bg::before {
                    background:
                        radial-gradient(1.5px 1.5px at  7%  9%,  rgba(255,255,255,0.9) 0%, transparent 100%),
                        radial-gradient(1px   1px   at 21%  4%,  rgba(255,255,255,0.7) 0%, transparent 100%),
                        radial-gradient(2px   2px   at 36% 16%,  rgba(255,255,255,0.8) 0%, transparent 100%),
                        radial-gradient(1px   1px   at 52%  7%,  rgba(255,255,255,0.6) 0%, transparent 100%),
                        radial-gradient(1.5px 1.5px at 67% 13%,  rgba(255,255,255,0.9) 0%, transparent 100%),
                        radial-gradient(1px   1px   at 81%  5%,  rgba(255,255,255,0.7) 0%, transparent 100%),
                        radial-gradient(2px   2px   at 93% 19%,  rgba(255,255,255,0.8) 0%, transparent 100%),
                        radial-gradient(1px   1px   at 13% 33%,  rgba(255,255,255,0.5) 0%, transparent 100%),
                        radial-gradient(1.5px 1.5px at 28% 40%,  rgba(255,255,255,0.7) 0%, transparent 100%),
                        radial-gradient(1px   1px   at 44% 36%,  rgba(255,255,255,0.5) 0%, transparent 100%),
                        radial-gradient(2px   2px   at 59% 28%,  rgba(255,255,255,0.8) 0%, transparent 100%),
                        radial-gradient(1px   1px   at 75% 42%,  rgba(255,255,255,0.6) 0%, transparent 100%),
                        radial-gradient(1px   1px   at 89% 31%,  rgba(255,255,255,0.7) 0%, transparent 100%),
                        radial-gradient(1.5px 1.5px at  4% 65%,  rgba(255,255,255,0.5) 0%, transparent 100%),
                        radial-gradient(1px   1px   at 18% 70%,  rgba(255,255,255,0.7) 0%, transparent 100%),
                        radial-gradient(1px   1px   at 34% 60%,  rgba(255,255,255,0.4) 0%, transparent 100%),
                        radial-gradient(2px   2px   at 49% 75%,  rgba(255,255,255,0.6) 0%, transparent 100%),
                        radial-gradient(1px   1px   at 64% 63%,  rgba(255,255,255,0.7) 0%, transparent 100%),
                        radial-gradient(1.5px 1.5px at 79% 72%,  rgba(255,255,255,0.5) 0%, transparent 100%),
                        radial-gradient(1px   1px   at 95% 58%,  rgba(255,255,255,0.8) 0%, transparent 100%);
                    animation: wcTwinkle 5s ease-in-out infinite alternate;
                }

                /* ── Aurora band — dark only ── */
                .welcome-aurora {
                    position: absolute;
                    top: 0; left: -30%; right: -30%;
                    height: 50vh;
                    z-index: 0;
                    pointer-events: none;
                    opacity: 0;
                    background: linear-gradient(
                        180deg,
                        transparent 0%,
                        rgba(99,102,241,0.22) 18%,
                        rgba(139,92,246,0.18) 38%,
                        rgba(14,165,233,0.12) 58%,
                        transparent 100%
                    );
                    filter: blur(40px);
                    animation: wcAurora 10s ease-in-out infinite alternate;
                }
                .dark .welcome-aurora {
                    opacity: 1;
                }

                /* ── Color wash orbs — light ── */
                .welcome-orb-1 {
                    position: absolute;
                    width: 60vw; height: 60vw; max-width: 700px; max-height: 700px;
                    border-radius: 50%;
                    top: -15%; left: -10%;
                    background: radial-gradient(circle, rgba(129,140,248,0.35) 0%, transparent 70%);
                    filter: blur(60px);
                    pointer-events: none; z-index: 0;
                    animation: wcOrbFloat 14s ease-in-out infinite alternate;
                }
                .welcome-orb-2 {
                    position: absolute;
                    width: 50vw; height: 50vw; max-width: 600px; max-height: 600px;
                    border-radius: 50%;
                    top: 20%; right: -12%;
                    background: radial-gradient(circle, rgba(96,165,250,0.3) 0%, transparent 70%);
                    filter: blur(60px);
                    pointer-events: none; z-index: 0;
                    animation: wcOrbFloat 18s 2s ease-in-out infinite alternate;
                }
                .welcome-orb-3 {
                    position: absolute;
                    width: 45vw; height: 45vw; max-width: 500px; max-height: 500px;
                    border-radius: 50%;
                    bottom: 5%; left: 30%;
                    background: radial-gradient(circle, rgba(167,139,250,0.3) 0%, transparent 70%);
                    filter: blur(50px);
                    pointer-events: none; z-index: 0;
                    animation: wcOrbFloat 20s 1s ease-in-out infinite alternate;
                }

                /* Dark mode orbs — deeper colors */
                .dark .welcome-orb-1 {
                    background: radial-gradient(circle, rgba(99,102,241,0.4) 0%, transparent 70%);
                }
                .dark .welcome-orb-2 {
                    background: radial-gradient(circle, rgba(14,116,144,0.3) 0%, transparent 70%);
                }
                .dark .welcome-orb-3 {
                    background: radial-gradient(circle, rgba(124,58,237,0.35) 0%, transparent 70%);
                }

                /* ── Content z-layer ── */
                .welcome-content {
                    position: relative;
                    z-index: 1;
                }

                /* ── Keyframes ── */
                @keyframes wcDrift {
                    0%   { transform: translate(0px,   0px)  scale(1);    }
                    50%  { transform: translate(14px, -8px)  scale(1.02); }
                    100% { transform: translate(-8px,  6px)  scale(0.98); }
                }
                @keyframes wcTwinkle {
                    0%   { opacity: 0.55; }
                    50%  { opacity: 1;    }
                    100% { opacity: 0.65; }
                }
                @keyframes wcAurora {
                    0%   { transform: skewX(-4deg) scaleY(1);    opacity: 0.85; }
                    50%  { transform: skewX( 3deg) scaleY(1.15); opacity: 1;    }
                    100% { transform: skewX(-2deg) scaleY(0.92); opacity: 0.8;  }
                }
                @keyframes wcOrbFloat {
                    0%   { transform: translate(0px,   0px)   scale(1);    }
                    50%  { transform: translate(20px, -15px)  scale(1.05); }
                    100% { transform: translate(-10px, 12px)  scale(0.95); }
                }
            `}</style>

            <div className="welcome-bg">
                {/* Floating color orbs */}
                <div className="welcome-orb-1" aria-hidden="true" />
                <div className="welcome-orb-2" aria-hidden="true" />
                <div className="welcome-orb-3" aria-hidden="true" />

                {/* Aurora (dark mode) */}
                <div className="welcome-aurora" aria-hidden="true" />

                <div className="welcome-content">
                    <Header />
                    <Search />
                    <FloatingBot />
                    <Footer />
                </div>
            </div>
        </>
    );
}
