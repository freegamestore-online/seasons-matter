/**
 * Pure game math — no React, no three.js.
 * Seasons Matter: collect seasonal items as the world changes around you.
 */

import type { Season } from "../types";

/** Half-width of the square arena. Player + items stay within ±ARENA_HALF. */
export const ARENA_HALF = 16;
/** Player move speed, in world units per second. */
export const PLAYER_SPEED = 10;
/** How close the player must get to an item to collect it. */
export const PICKUP_RADIUS = 1.4;
/** Seconds on the clock per round. */
export const ROUND_SECONDS = 60;
/** How many seconds each season lasts. */
export const SEASON_DURATION = 12;
/** Number of items on the field at once. */
export const ITEM_COUNT = 7;

export const SEASONS: Season[] = ["spring", "summer", "autumn", "winter"];

export interface SeasonTheme {
  skyColor: string;
  fogColor: string;
  groundColor: string;
  gridColor: string;
  ambientColor: string;
  sunColor: string;
  label: string;
  emoji: string;
  itemColor: string;
  itemEmissive: string;
  bonusColor: string;
}

export const SEASON_THEMES: Record<Season, SeasonTheme> = {
  spring: {
    skyColor: "#bfecff",
    fogColor: "#bfecff",
    groundColor: "#86efac",
    gridColor: "#4ade80",
    ambientColor: "#d9f99d",
    sunColor: "#fde68a",
    label: "Spring",
    emoji: "🌸",
    itemColor: "#f9a8d4",
    itemEmissive: "#ec4899",
    bonusColor: "#ec4899",
  },
  summer: {
    skyColor: "#38bdf8",
    fogColor: "#7dd3fc",
    groundColor: "#fef08a",
    gridColor: "#facc15",
    ambientColor: "#fef9c3",
    sunColor: "#fbbf24",
    label: "Summer",
    emoji: "☀️",
    itemColor: "#fde047",
    itemEmissive: "#f59e0b",
    bonusColor: "#f59e0b",
  },
  autumn: {
    skyColor: "#fed7aa",
    fogColor: "#fdba74",
    groundColor: "#b45309",
    gridColor: "#d97706",
    ambientColor: "#fef3c7",
    sunColor: "#f97316",
    label: "Autumn",
    emoji: "🍂",
    itemColor: "#fb923c",
    itemEmissive: "#ea580c",
    bonusColor: "#dc2626",
  },
  winter: {
    skyColor: "#e0f2fe",
    fogColor: "#bae6fd",
    groundColor: "#e2e8f0",
    gridColor: "#cbd5e1",
    ambientColor: "#f0f9ff",
    sunColor: "#93c5fd",
    label: "Winter",
    emoji: "❄️",
    itemColor: "#bae6fd",
    itemEmissive: "#38bdf8",
    bonusColor: "#818cf8",
  },
};

/** Points for matching the current season. */
export const BONUS_POINTS = 3;
/** Points for a non-matching item. */
export const BASE_POINTS = 1;

export function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

/** Squared 2D (x,z) distance. */
export function dist2(ax: number, az: number, bx: number, bz: number): number {
  const dx = ax - bx;
  const dz = az - bz;
  return dx * dx + dz * dz;
}

/** True when (px,pz) is within `radius` of (ox,oz). */
export function collides(
  px: number,
  pz: number,
  ox: number,
  oz: number,
  radius = PICKUP_RADIUS,
): boolean {
  return dist2(px, pz, ox, oz) <= radius * radius;
}

/** Keep a point inside the arena bounds. */
export function clampToArena(x: number, z: number, half = ARENA_HALF): [number, number] {
  return [clamp(x, -half, half), clamp(z, -half, half)];
}

/**
 * A random item position at least `minDist` from (avoidX, avoidZ).
 */
export function randomItemPosition(
  avoidX: number,
  avoidZ: number,
  half = ARENA_HALF,
  minDist = 4,
  rand: () => number = Math.random,
): [number, number] {
  for (let i = 0; i < 20; i++) {
    const x = (rand() * 2 - 1) * (half - 1);
    const z = (rand() * 2 - 1) * (half - 1);
    if (dist2(x, z, avoidX, avoidZ) >= minDist * minDist) return [x, z];
  }
  return clampToArena(-avoidX, -avoidZ, half - 1);
}

/** Get which season index we're in given elapsed time. */
export function currentSeasonIndex(elapsedSeconds: number): number {
  return Math.floor(elapsedSeconds / SEASON_DURATION) % SEASONS.length;
}

/** 0..1 progress within the current season. */
export function seasonProgress(elapsedSeconds: number): number {
  return (elapsedSeconds % SEASON_DURATION) / SEASON_DURATION;
}

/** Linearly interpolate two hex colors (very simple, component-wise). */
export function lerpColor(a: string, b: string, t: number): string {
  const parse = (h: string) => [
    parseInt(h.slice(1, 3), 16),
    parseInt(h.slice(3, 5), 16),
    parseInt(h.slice(5, 7), 16),
  ];
  const ac = parse(a);
  const bc = parse(b);
  const r = Math.round((ac[0] ?? 0) + ((bc[0] ?? 0) - (ac[0] ?? 0)) * t);
  const g = Math.round((ac[1] ?? 0) + ((bc[1] ?? 0) - (ac[1] ?? 0)) * t);
  const bv = Math.round((ac[2] ?? 0) + ((bc[2] ?? 0) - (ac[2] ?? 0)) * t);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${bv.toString(16).padStart(2, "0")}`;
}
