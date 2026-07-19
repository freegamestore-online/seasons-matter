import { describe, it, expect } from "vitest";
import {
  clamp,
  dist2,
  collides,
  clampToArena,
  randomItemPosition,
  currentSeasonIndex,
  seasonProgress,
  SEASONS,
  SEASON_DURATION,
} from "./logic";

describe("clamp", () => {
  it("clamps below min", () => expect(clamp(-5, 0, 10)).toBe(0));
  it("clamps above max", () => expect(clamp(15, 0, 10)).toBe(10));
  it("passes through in range", () => expect(clamp(5, 0, 10)).toBe(5));
});

describe("dist2", () => {
  it("returns 0 for same point", () => expect(dist2(1, 1, 1, 1)).toBe(0));
  it("returns squared distance", () => expect(dist2(0, 0, 3, 4)).toBe(25));
});

describe("collides", () => {
  it("detects overlap", () => expect(collides(0, 0, 0.5, 0.5)).toBe(true));
  it("no overlap when far", () => expect(collides(0, 0, 10, 10)).toBe(false));
});

describe("clampToArena", () => {
  it("clamps both axes", () => {
    const [x, z] = clampToArena(100, -100);
    expect(x).toBe(16);
    expect(z).toBe(-16);
  });
});

describe("randomItemPosition", () => {
  it("avoids the given point", () => {
    const [x, z] = randomItemPosition(0, 0, 16, 4, Math.random);
    expect(dist2(x, z, 0, 0)).toBeGreaterThanOrEqual(16);
  });
});

describe("season cycling", () => {
  it("starts at season 0", () => expect(currentSeasonIndex(0)).toBe(0));
  it("advances each SEASON_DURATION", () => {
    expect(currentSeasonIndex(SEASON_DURATION)).toBe(1);
    expect(currentSeasonIndex(SEASON_DURATION * 2)).toBe(2);
    expect(currentSeasonIndex(SEASON_DURATION * 3)).toBe(3);
    expect(currentSeasonIndex(SEASON_DURATION * 4)).toBe(0);
  });
  it("all seasons are defined", () => {
    SEASONS.forEach((s) => expect(s).toBeTruthy());
  });
  it("progress is 0..1", () => {
    expect(seasonProgress(0)).toBe(0);
    expect(seasonProgress(SEASON_DURATION / 2)).toBeCloseTo(0.5);
  });
});
