import { useEffect, useRef, useState, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGameSounds } from "@freegamestore/games";
import * as THREE from "three";
import type { Season, SeasonItem } from "../types";
import {
  ARENA_HALF,
  PLAYER_SPEED,
  ROUND_SECONDS,
  ITEM_COUNT,
  SEASONS,
  SEASON_THEMES,
  BONUS_POINTS,
  BASE_POINTS,
  clampToArena,
  collides,
  randomItemPosition,
  currentSeasonIndex,
  seasonProgress,
  lerpColor,
} from "../lib/logic";

export interface GameProps {
  onScore: (score: number) => void;
  onTime: (secondsLeft: number) => void;
  onGameOver: () => void;
  onSeason: (season: Season, progress: number) => void;
}

type Dir = "left" | "right" | "up" | "down";

function mapKey(key: string): Dir | null {
  switch (key) {
    case "ArrowLeft": case "a": case "A": return "left";
    case "ArrowRight": case "d": case "D": return "right";
    case "ArrowUp": case "w": case "W": return "up";
    case "ArrowDown": case "s": case "S": return "down";
    default: return null;
  }
}

function initialItems(): SeasonItem[] {
  const items: SeasonItem[] = [];
  for (let i = 0; i < ITEM_COUNT; i++) {
    const [x, z] = randomItemPosition(0, 0);
    items.push({ id: i, x, z, season: SEASONS[i % 4] as Season });
  }
  return items;
}

// ─── Player ──────────────────────────────────────────────────────────────────

function Player({
  posRef,
  season,
}: {
  posRef: React.RefObject<THREE.Vector3>;
  season: Season;
}) {
  const group = useRef<THREE.Group>(null!);
  const bodyRef = useRef<THREE.Mesh>(null!);
  const theme = SEASON_THEMES[season];
  const bounceRef = useRef(0);

  useFrame((_, dt) => {
    if (!group.current || !posRef.current) return;
    group.current.position.x = posRef.current.x;
    group.current.position.z = posRef.current.z;
    bounceRef.current += dt * 3;
    group.current.position.y = 0.5 + Math.abs(Math.sin(bounceRef.current)) * 0.15;
    if (bodyRef.current) {
      bodyRef.current.rotation.y += dt * 1.5;
    }
  });

  return (
    <group ref={group} position={[0, 0.5, 0]}>
      {/* Body */}
      <mesh ref={bodyRef} castShadow>
        <sphereGeometry args={[0.55, 20, 20]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive={theme.bonusColor}
          emissiveIntensity={0.35}
          roughness={0.3}
          metalness={0.1}
        />
      </mesh>
      {/* Eyes */}
      <mesh position={[0.2, 0.18, 0.42]}>
        <sphereGeometry args={[0.1, 10, 10]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
      <mesh position={[-0.2, 0.18, 0.42]}>
        <sphereGeometry args={[0.1, 10, 10]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
      {/* Smile */}
      <mesh position={[0, -0.05, 0.5]} rotation={[0.3, 0, 0]}>
        <torusGeometry args={[0.15, 0.04, 8, 16, Math.PI]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
    </group>
  );
}

// ─── Seasonal Item ────────────────────────────────────────────────────────────

function ItemMesh({
  item,
  currentSeason,
}: {
  item: SeasonItem;
  currentSeason: Season;
}) {
  const mesh = useRef<THREE.Mesh>(null!);
  const glow = useRef<THREE.PointLight>(null!);
  const theme = SEASON_THEMES[item.season];
  const isMatch = item.season === currentSeason;
  const t = useRef(Math.random() * Math.PI * 2);

  useFrame((_, dt) => {
    t.current += dt * (isMatch ? 2.5 : 1.5);
    if (mesh.current) {
      mesh.current.rotation.y += dt * (isMatch ? 3 : 1.5);
      mesh.current.rotation.x += dt * 0.8;
      mesh.current.position.y = 0.7 + Math.sin(t.current) * 0.18;
      const s = isMatch ? 1 + Math.sin(t.current * 2) * 0.08 : 1;
      mesh.current.scale.setScalar(s);
    }
    if (glow.current) {
      glow.current.intensity = isMatch ? 1.2 + Math.sin(t.current * 3) * 0.5 : 0.3;
    }
  });

  // Shape varies by season
  const geometry = useMemo(() => {
    switch (item.season) {
      case "spring":
        return <dodecahedronGeometry args={[0.42, 0]} />;
      case "summer":
        return <octahedronGeometry args={[0.45, 0]} />;
      case "autumn":
        return <tetrahedronGeometry args={[0.52, 0]} />;
      case "winter":
        return <icosahedronGeometry args={[0.42, 0]} />;
    }
  }, [item.season]);

  return (
    <group position={[item.x, 0.7, item.z]}>
      <mesh ref={mesh} castShadow>
        {geometry}
        <meshStandardMaterial
          color={theme.itemColor}
          emissive={theme.itemEmissive}
          emissiveIntensity={isMatch ? 0.9 : 0.3}
          roughness={0.2}
          metalness={0.4}
        />
      </mesh>
      <pointLight
        ref={glow}
        color={theme.bonusColor}
        intensity={isMatch ? 1.2 : 0.3}
        distance={3.5}
      />
    </group>
  );
}

// ─── Arena ────────────────────────────────────────────────────────────────────

function Arena({ theme }: { theme: typeof SEASON_THEMES[Season] }) {
  const groundRef = useRef<THREE.Mesh>(null!);
  const gridRef = useRef<THREE.GridHelper>(null!);

  useEffect(() => {
    if (groundRef.current) {
      (groundRef.current.material as THREE.MeshStandardMaterial).color.set(theme.groundColor);
    }
    if (gridRef.current) {
      (gridRef.current.material as THREE.LineBasicMaterial).color.set(theme.gridColor);
    }
  }, [theme]);

  return (
    <group>
      {/* Ground */}
      <mesh ref={groundRef} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[ARENA_HALF * 2, ARENA_HALF * 2]} />
        <meshStandardMaterial color={theme.groundColor} roughness={0.9} />
      </mesh>
      {/* Grid */}
      <gridHelper
        ref={gridRef}
        args={[ARENA_HALF * 2, 16, theme.gridColor, theme.gridColor]}
        position={[0, 0.01, 0]}
      />
      {/* Border walls (low, decorative) */}
      {[
        [0, 0.3, -ARENA_HALF] as const,
        [0, 0.3, ARENA_HALF] as const,
        [-ARENA_HALF, 0.3, 0] as const,
        [ARENA_HALF, 0.3, 0] as const,
      ].map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z]} castShadow receiveShadow>
          <boxGeometry
            args={[
              z === 0 ? 0.5 : ARENA_HALF * 2,
              0.6,
              z === 0 ? ARENA_HALF * 2 : 0.5,
            ]}
          />
          <meshStandardMaterial color={theme.gridColor} roughness={0.8} />
        </mesh>
      ))}
      {/* Corner trees/decorations */}
      {([-1, 1] as const).flatMap((sx) =>
        ([-1, 1] as const).map((sz) => (
          <Tree
            key={`${sx}${sz}`}
            position={[sx * (ARENA_HALF - 1.5), 0, sz * (ARENA_HALF - 1.5)]}
            theme={theme}
          />
        ))
      )}
    </group>
  );
}

function Tree({
  position,
  theme,
}: {
  position: [number, number, number];
  theme: typeof SEASON_THEMES[Season];
}) {
  return (
    <group position={position}>
      {/* Trunk */}
      <mesh position={[0, 0.6, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.22, 1.2, 8]} />
        <meshStandardMaterial color="#92400e" roughness={0.9} />
      </mesh>
      {/* Canopy */}
      <mesh position={[0, 1.8, 0]} castShadow>
        <coneGeometry args={[0.85, 1.8, 8]} />
        <meshStandardMaterial
          color={theme.itemColor}
          emissive={theme.itemEmissive}
          emissiveIntensity={0.15}
          roughness={0.7}
        />
      </mesh>
    </group>
  );
}

// ─── Sky particles (snow/petals/leaves/sunbeams) ───────────────────────────

interface SkyParticle {
  x: number;
  y: number;
  z: number;
  vy: number;
  vx: number;
  phase: number;
}

function SkyParticles({ season }: { season: Season }) {
  const COUNT = 40;
  const theme = SEASON_THEMES[season];
  const particles = useRef<SkyParticle[]>(
    Array.from({ length: COUNT }, () => ({
      x: (Math.random() * 2 - 1) * ARENA_HALF,
      y: Math.random() * 10 + 2,
      z: (Math.random() * 2 - 1) * ARENA_HALF,
      vy: -(0.5 + Math.random() * 1.5),
      vx: (Math.random() - 0.5) * 0.5,
      phase: Math.random() * Math.PI * 2,
    }))
  );
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((_, dt) => {
    if (!meshRef.current) return;
    const ps = particles.current;
    for (let i = 0; i < ps.length; i++) {
      const p = ps[i]!;
      p.phase += dt * 2;
      p.y += p.vy * dt;
      p.x += p.vx * dt + Math.sin(p.phase) * 0.01;
      if (p.y < 0) {
        p.y = 10 + Math.random() * 5;
        p.x = (Math.random() * 2 - 1) * ARENA_HALF;
        p.z = (Math.random() * 2 - 1) * ARENA_HALF;
      }
      dummy.position.set(p.x, p.y, p.z);
      dummy.rotation.set(p.phase, p.phase * 0.7, 0);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  const size = season === "winter" ? 0.12 : season === "spring" ? 0.18 : 0.15;

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, COUNT]} castShadow={false}>
      {season === "winter" ? (
        <octahedronGeometry args={[size, 0]} />
      ) : season === "spring" ? (
        <dodecahedronGeometry args={[size, 0]} />
      ) : season === "summer" ? (
        <tetrahedronGeometry args={[size, 0]} />
      ) : (
        <tetrahedronGeometry args={[size, 0]} />
      )}
      <meshStandardMaterial
        color={theme.itemColor}
        emissive={theme.itemEmissive}
        emissiveIntensity={0.5}
        transparent
        opacity={0.75}
      />
    </instancedMesh>
  );
}

// ─── Follow camera ────────────────────────────────────────────────────────────

function FollowCamera({ posRef }: { posRef: React.RefObject<THREE.Vector3> }) {
  const { camera } = useThree();
  useFrame(() => {
    const p = posRef.current;
    if (!p) return;
    camera.position.x += (p.x - camera.position.x) * 0.07;
    camera.position.z += (p.z + 18 - camera.position.z) * 0.07;
    camera.position.y = 16;
    camera.lookAt(p.x, 0, p.z);
  });
  return null;
}

// ─── World lighting (reacts to season) ───────────────────────────────────────

function WorldLighting({ theme }: { theme: typeof SEASON_THEMES[Season] }) {
  const ambRef = useRef<THREE.AmbientLight>(null!);
  const dirRef = useRef<THREE.DirectionalLight>(null!);

  useEffect(() => {
    if (ambRef.current) ambRef.current.color.set(theme.ambientColor);
    if (dirRef.current) dirRef.current.color.set(theme.sunColor);
  }, [theme]);

  return (
    <>
      <ambientLight ref={ambRef} color={theme.ambientColor} intensity={0.7} />
      <directionalLight
        ref={dirRef}
        color={theme.sunColor}
        position={[10, 22, 10]}
        intensity={1.3}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
    </>
  );
}

// ─── Main scene ───────────────────────────────────────────────────────────────

function Scene({ onScore, onTime, onGameOver, onSeason }: GameProps) {
  const posRef = useRef(new THREE.Vector3(0, 0.5, 0));
  const keys = useRef<Set<Dir>>(new Set());
  const [items, setItems] = useState<SeasonItem[]>(initialItems);
  const itemsRef = useRef<SeasonItem[]>(items);

  const [season, setSeason] = useState<Season>("spring");
  const [theme, setTheme] = useState(SEASON_THEMES["spring"]);

  const scoreRef = useRef(0);
  const timeRef = useRef(ROUND_SECONDS);
  const lastSecondRef = useRef(ROUND_SECONDS);
  const lastSeasonIdxRef = useRef(0);
  const nextItemId = useRef(ITEM_COUNT);
  const overRef = useRef(false);
  const elapsedRef = useRef(0);

  const sounds = useGameSounds();
  const soundsRef = useRef(sounds);
  soundsRef.current = sounds;
  const cbs = useRef({ onScore, onTime, onGameOver, onSeason });
  cbs.current = { onScore, onTime, onGameOver, onSeason };

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const d = mapKey(e.key);
      if (d) { e.preventDefault(); keys.current.add(d); }
    };
    const up = (e: KeyboardEvent) => {
      const d = mapKey(e.key);
      if (d) keys.current.delete(d);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  useFrame((_, delta) => {
    if (overRef.current) return;
    const dt = Math.min(delta, 0.05);

    // Countdown
    timeRef.current -= dt;
    elapsedRef.current += dt;
    const secs = Math.max(0, Math.ceil(timeRef.current));
    if (secs !== lastSecondRef.current) {
      lastSecondRef.current = secs;
      cbs.current.onTime(secs);
    }
    if (timeRef.current <= 0) {
      overRef.current = true;
      soundsRef.current.playGameOver();
      cbs.current.onGameOver();
      return;
    }

    // Season cycling
    const elapsed = elapsedRef.current;
    const seasonIdx = Math.floor(elapsed / 12) % 4;
    const prog = (elapsed % 12) / 12;
    const newSeason = SEASONS[seasonIdx] as Season;
    if (seasonIdx !== lastSeasonIdxRef.current) {
      lastSeasonIdxRef.current = seasonIdx;
      setSeason(newSeason);
      setTheme(SEASON_THEMES[newSeason]);
    }
    cbs.current.onSeason(newSeason, prog);

    // Movement
    let vx = 0, vz = 0;
    if (keys.current.has("left")) vx -= 1;
    if (keys.current.has("right")) vx += 1;
    if (keys.current.has("up")) vz -= 1;
    if (keys.current.has("down")) vz += 1;
    if (vx !== 0 || vz !== 0) {
      const len = Math.hypot(vx, vz) || 1;
      const p = posRef.current;
      const [nx, nz] = clampToArena(
        p.x + (vx / len) * PLAYER_SPEED * dt,
        p.z + (vz / len) * PLAYER_SPEED * dt,
      );
      p.x = nx;
      p.z = nz;
    }

    // Collect items
    const p = posRef.current;
    const list = itemsRef.current;
    let gained = 0;
    for (let i = 0; i < list.length; i++) {
      const item = list[i]!;
      if (collides(p.x, p.z, item.x, item.z)) {
        gained += item.season === newSeason ? BONUS_POINTS : BASE_POINTS;
        const [x, z] = randomItemPosition(p.x, p.z);
        // Spawn a random season item
        const spawnSeason = SEASONS[nextItemId.current % 4] as Season;
        list[i] = { id: nextItemId.current++, x, z, season: spawnSeason };
      }
    }
    if (gained > 0) {
      scoreRef.current += gained;
      cbs.current.onScore(scoreRef.current);
      soundsRef.current.playScore();
      setItems([...list]);
    }
  });

  // Interpolate sky/fog color based on season progress
  const nextSeasonIdx = (lastSeasonIdxRef.current + 1) % 4;
  const nextTheme = SEASON_THEMES[SEASONS[nextSeasonIdx] as Season];
  const prog = seasonProgress(elapsedRef.current);
  const blendT = Math.max(0, (prog - 0.8) / 0.2); // blend in last 20% of season
  const skyColor = lerpColor(theme.skyColor, nextTheme.skyColor, blendT);
  const fogColor = lerpColor(theme.fogColor, nextTheme.fogColor, blendT);

  return (
    <>
      <WorldLighting theme={theme} />
      <fog attach="fog" args={[fogColor, 30, 80]} />
      <color attach="background" args={[skyColor]} />
      <FollowCamera posRef={posRef} />
      <Arena theme={theme} />
      <SkyParticles season={season} />
      <Player posRef={posRef} season={season} />
      {items.map((item) => (
        <ItemMesh key={item.id} item={item} currentSeason={season} />
      ))}
    </>
  );
}

// ─── D-pad controls ───────────────────────────────────────────────────────────

function press(dir: Dir, type: "keydown" | "keyup") {
  const key =
    dir === "left" ? "ArrowLeft" :
    dir === "right" ? "ArrowRight" :
    dir === "up" ? "ArrowUp" : "ArrowDown";
  window.dispatchEvent(new KeyboardEvent(type, { key, bubbles: true }));
}

function DpadButton({ dir, label }: { dir: Dir; label: string }) {
  return (
    <button
      onPointerDown={(e) => { e.preventDefault(); press(dir, "keydown"); }}
      onPointerUp={(e) => { e.preventDefault(); press(dir, "keyup"); }}
      onPointerCancel={() => press(dir, "keyup")}
      onPointerLeave={() => press(dir, "keyup")}
      className="select-none pointer-events-auto flex items-center justify-center"
      style={{
        width: 60, height: 60, borderRadius: "1rem",
        background: "rgba(255,255,255,0.22)",
        backdropFilter: "blur(6px)",
        border: "2px solid rgba(255,255,255,0.35)",
        color: "#fff", fontSize: 24,
        touchAction: "none",
        boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
      }}
      aria-label={`Move ${dir}`}
    >
      {label}
    </button>
  );
}

function MobileControls() {
  useEffect(() => () => {
    (["left", "right", "up", "down"] as Dir[]).forEach((d) => press(d, "keyup"));
  }, []);
  return (
    <div
      className="absolute bottom-5 left-0 right-0 flex justify-center pointer-events-none"
      style={{ zIndex: 10 }}
    >
      <div
        className="grid gap-2"
        style={{
          gridTemplateColumns: "repeat(3, 60px)",
          gridTemplateRows: "repeat(2, 60px)",
        }}
      >
        <span />
        <DpadButton dir="up" label="▲" />
        <span />
        <DpadButton dir="left" label="◀" />
        <DpadButton dir="down" label="▼" />
        <DpadButton dir="right" label="▶" />
      </div>
    </div>
  );
}

// ─── Season HUD badge ─────────────────────────────────────────────────────────

function SeasonBadge({
  season,
  progress,
}: {
  season: Season;
  progress: number;
}) {
  const theme = SEASON_THEMES[season];
  return (
    <div
      style={{
        position: "absolute",
        top: 12,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 10,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          background: "rgba(255,255,255,0.85)",
          backdropFilter: "blur(8px)",
          borderRadius: "2rem",
          padding: "4px 18px",
          fontFamily: "Fraunces, serif",
          fontWeight: 800,
          fontSize: "1rem",
          color: theme.bonusColor,
          boxShadow: "0 2px 12px rgba(0,0,0,0.12)",
          letterSpacing: "0.02em",
          border: `2px solid ${theme.bonusColor}44`,
        }}
      >
        {theme.emoji} {theme.label}
      </div>
      {/* Season progress bar */}
      <div
        style={{
          width: 100,
          height: 5,
          borderRadius: 3,
          background: "rgba(255,255,255,0.35)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${progress * 100}%`,
            height: "100%",
            background: theme.bonusColor,
            borderRadius: 3,
            transition: "width 0.1s linear",
          }}
        />
      </div>
      <div
        style={{
          fontSize: "0.65rem",
          color: "rgba(255,255,255,0.8)",
          fontFamily: "Manrope, sans-serif",
          textShadow: "0 1px 3px rgba(0,0,0,0.4)",
        }}
      >
        Matching gem = 3 pts!
      </div>
    </div>
  );
}

// ─── Exported component ───────────────────────────────────────────────────────

export function Game({ onScore, onTime, onGameOver, onSeason }: GameProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [curSeason, setCurSeason] = useState<Season>("spring");
  const [seasonProg, setSeasonProg] = useState(0);

  useEffect(() => {
    const check = () =>
      setIsMobile(window.innerWidth < 768 || "ontouchstart" in window);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const handleSeason = (s: Season, p: number) => {
    setCurSeason(s);
    setSeasonProg(p);
    onSeason(s, p);
  };

  return (
    <div className="relative w-full h-full">
      <Canvas
        shadows
        camera={{ position: [0, 16, 18], fov: 52, near: 0.1, far: 200 }}
        style={{ width: "100%", height: "100%" }}
      >
        <Scene
          onScore={onScore}
          onTime={onTime}
          onGameOver={onGameOver}
          onSeason={handleSeason}
        />
      </Canvas>
      <SeasonBadge season={curSeason} progress={seasonProg} />
      {isMobile && <MobileControls />}
    </div>
  );
}
