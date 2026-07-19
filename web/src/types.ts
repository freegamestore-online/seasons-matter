export type GamePhase = "menu" | "playing" | "over";

export type Season = "spring" | "summer" | "autumn" | "winter";

/** A collectible item resting on the arena floor. */
export interface SeasonItem {
  id: number;
  x: number;
  z: number;
  season: Season;
}

export interface Particle {
  id: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  color: string;
}
