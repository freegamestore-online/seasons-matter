import { useRef, useState } from "react";
import { GameShell, GameTopbar, GameOverScreen } from "@freegamestore/games";
import { Game } from "./components/Game";
import { useHighScore } from "./hooks/useHighScore";
import { ROUND_SECONDS, SEASON_THEMES } from "./lib/logic";
import type { GamePhase, Season } from "./types";

export default function App() {
  const [phase, setPhase] = useState<GamePhase>("menu");
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [round, setRound] = useState(0);
  const [highScore, setHighScore] = useHighScore("seasons-matter-highscore");
  const [season, setSeason] = useState<Season>("spring");

  const scoreRef = useRef(0);
  const handleScore = (s: number) => {
    scoreRef.current = s;
    setScore(s);
  };

  const handleSeason = (s: Season, _p: number) => {
    setSeason(s);
  };

  const start = () => {
    scoreRef.current = 0;
    setScore(0);
    setTimeLeft(ROUND_SECONDS);
    setSeason("spring");
    setRound((r) => r + 1);
    setPhase("playing");
  };

  const end = () => {
    setHighScore(scoreRef.current);
    setPhase("over");
  };

  const theme = SEASON_THEMES[season];

  return (
    <GameShell
      topbar={
        <GameTopbar
          title="Seasons Matter"
          stats={[
            { label: "Score", value: score, accent: true },
            { label: "Time", value: `${timeLeft}s` },
            { label: "Best", value: highScore },
          ]}
        />
      }
    >
      <div className="relative w-full h-full min-h-[400px]">
        {phase !== "menu" && (
          <Game
            key={round}
            onScore={handleScore}
            onTime={setTimeLeft}
            onGameOver={end}
            onSeason={handleSeason}
          />
        )}

        {phase === "menu" && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center text-center gap-5 px-6"
            style={{
              background: "linear-gradient(160deg, #bfecff 0%, #86efac 50%, #fde68a 100%)",
            }}
          >
            {/* Title */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <div style={{ fontSize: "3rem", lineHeight: 1 }}>🌸☀️🍂❄️</div>
              <h1
                style={{
                  fontFamily: "Fraunces, serif",
                  fontWeight: 800,
                  fontSize: "clamp(1.8rem, 6vw, 2.8rem)",
                  color: "#1e293b",
                  margin: 0,
                  letterSpacing: "-0.02em",
                }}
              >
                Seasons Matter
              </h1>
              <p
                style={{
                  fontFamily: "Manrope, sans-serif",
                  fontWeight: 600,
                  fontSize: "1rem",
                  color: "#475569",
                  margin: 0,
                }}
              >
                Collect gems that match the season for bonus points!
              </p>
            </div>

            {/* How to play */}
            <div
              style={{
                background: "rgba(255,255,255,0.7)",
                backdropFilter: "blur(8px)",
                borderRadius: "1.25rem",
                padding: "1rem 1.5rem",
                maxWidth: 320,
                textAlign: "left",
                boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
              }}
            >
              <p style={{ fontFamily: "Manrope, sans-serif", fontSize: "0.85rem", color: "#334155", margin: 0, lineHeight: 1.7 }}>
                🎮 <b>Move:</b> WASD / Arrow keys (or on-screen pad)<br />
                🌸 <b>Spring gem</b> (pink) = 3 pts in Spring<br />
                ☀️ <b>Summer gem</b> (yellow) = 3 pts in Summer<br />
                🍂 <b>Autumn gem</b> (orange) = 3 pts in Autumn<br />
                ❄️ <b>Winter gem</b> (blue) = 3 pts in Winter<br />
                🔮 Wrong season gem = 1 pt
              </p>
            </div>

            <button
              onClick={start}
              style={{
                minHeight: 52,
                padding: "0 2.5rem",
                background: "linear-gradient(135deg, #22d3ee, #6366f1)",
                color: "#fff",
                border: "none",
                borderRadius: "1rem",
                cursor: "pointer",
                fontSize: "1.1rem",
                fontFamily: "Fraunces, serif",
                fontWeight: 800,
                letterSpacing: "0.02em",
                boxShadow: "0 4px 16px rgba(99,102,241,0.35)",
                transition: "transform 0.1s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.04)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
            >
              Play Now! 🌟
            </button>

            {highScore > 0 && (
              <p
                style={{
                  fontFamily: "Manrope, sans-serif",
                  fontSize: "0.9rem",
                  color: "#64748b",
                  margin: 0,
                }}
              >
                🏆 Best score: <b>{highScore}</b>
              </p>
            )}
          </div>
        )}

        {phase === "over" && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: `linear-gradient(160deg, ${theme.skyColor}cc, ${theme.groundColor}cc)`,
              backdropFilter: "blur(2px)",
            }}
          >
            <GameOverScreen score={score} highScore={highScore} onPlayAgain={start} />
          </div>
        )}
      </div>
    </GameShell>
  );
}
