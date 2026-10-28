export class SeededRNG {
  private state: number;

  static normalizeSeed(seed?: number | string | null): number {
    if (seed === null || seed === undefined || String(seed).trim() === "") {
      return (Math.random() * 0xffffffff) >>> 0;
    }
    if (typeof seed === "number") {
      if (!Number.isFinite(seed)) return (Math.random() * 0xffffffff) >>> 0;
      return Math.trunc(seed) >>> 0;
    }
    const digitsOnly = String(seed).replace(/\D/g, "");
    if (!digitsOnly) {
      return (Math.random() * 0xffffffff) >>> 0;
    }
    const parsedInt = Number.parseInt(digitsOnly, 10);
    if (!Number.isNaN(parsedInt) && Number.isFinite(parsedInt)) {
      return parsedInt >>> 0;
    }
    return (Math.random() * 0xffffffff) >>> 0;
  }

  constructor(seed: number | string | null = null) {
    this.state = SeededRNG.normalizeSeed(seed);
  }

  getState(): number {
    return this.state >>> 0;
  }

  setState(seed: number | string): void {
    this.state = SeededRNG.normalizeSeed(seed);
  }

  random(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  uniform(min: number, max: number): number {
    return min + (max - min) * this.random();
  }

  randint(min: number, max: number): number {
    return Math.floor(this.random() * (max - min + 1)) + min;
  }

  choice<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.random() * arr.length)];
  }

  choices<T>(items: readonly T[], weights: readonly number[]): T {
    let total = 0;
    for (let i = 0; i < weights.length; i++) total += weights[i];
    let r = this.random() * total;
    for (let i = 0; i < items.length; i++) {
      r -= weights[i];
      if (r <= 0) return items[i];
    }
    return items[items.length - 1];
  }
}

