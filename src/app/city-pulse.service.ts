import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { httpsCallable } from 'firebase/functions';
import type { CityPulseMetric, CityPulseSnapshot } from './atlas.models';
import { getFirebaseFunctions } from './firebase.client';

const CACHE_PREFIX = 'living-wiki:city-pulse:';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

@Injectable({ providedIn: 'root' })
export class CityPulseService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly functions = this.isBrowser ? getFirebaseFunctions() : null;

  readCachedSnapshot(atlasId: string): CityPulseSnapshot | null {
    if (!this.isBrowser) {
      return null;
    }

    try {
      const raw = window.localStorage.getItem(this.cacheKey(atlasId));
      if (!raw) {
        return null;
      }

      const parsed = JSON.parse(raw) as { expiresAt?: number; snapshot?: CityPulseSnapshot };
      if (!parsed?.snapshot || typeof parsed.expiresAt !== 'number') {
        return null;
      }

      if (Date.now() > parsed.expiresAt) {
        window.localStorage.removeItem(this.cacheKey(atlasId));
        return null;
      }

      return parsed.snapshot;
    } catch {
      return null;
    }
  }

  async getStoredSnapshot(atlasId: string): Promise<CityPulseSnapshot> {
    if (!this.functions) {
      throw new Error('Functions unavailable.');
    }

    const getCityPulseSnapshot = httpsCallable<{ atlasId: string }, CityPulseSnapshot>(
      this.functions,
      'getCityPulseSnapshot',
    );
    const { data } = await getCityPulseSnapshot({ atlasId });
    this.writeCache(atlasId, data);
    return data;
  }

  async refreshStoredSnapshot(atlasId: string): Promise<CityPulseSnapshot> {
    if (!this.functions) {
      throw new Error('Functions unavailable.');
    }

    const refreshCityPulseSnapshot = httpsCallable<{ atlasId: string }, CityPulseSnapshot>(
      this.functions,
      'refreshCityPulseSnapshot',
    );
    const { data } = await refreshCityPulseSnapshot({ atlasId });
    this.writeCache(atlasId, data);
    return data;
  }

  metricValue(metric: CityPulseMetric, nowMs = Date.now()): number {
    if (!metric.realtime) {
      return metric.value;
    }

    const anchorMs = Date.parse(metric.realtime.anchor_iso);
    if (Number.isNaN(anchorMs)) {
      return metric.value;
    }

    const elapsedSeconds = Math.max(0, (nowMs - anchorMs) / 1000);
    const nextValue = metric.realtime.baseline_value + metric.realtime.rate_per_second * elapsedSeconds;
    const floor = typeof metric.realtime.min_value === 'number' ? metric.realtime.min_value : null;
    return floor === null ? nextValue : Math.max(floor, nextValue);
  }

  formatMetric(metric: CityPulseMetric, nowMs = Date.now()): string {
    const value = this.metricValue(metric, nowMs);
    const decimals = typeof metric.decimals === 'number' ? metric.decimals : metric.format === 'percent' ? 1 : 0;

    if (metric.format === 'percent') {
      return `${value.toFixed(decimals)}%`;
    }

    const formatter = new Intl.NumberFormat('en-US', {
      maximumFractionDigits: decimals,
      minimumFractionDigits: decimals,
      style: metric.format === 'currency' ? 'currency' : 'decimal',
      currency: metric.format === 'currency' ? 'USD' : undefined,
    });

    let text = formatter.format(value);
    if (metric.unit_prefix) {
      text = `${metric.unit_prefix}${text}`;
    }
    if (metric.unit_suffix) {
      text = `${text}${metric.unit_suffix}`;
    }
    return text;
  }

  private writeCache(atlasId: string, snapshot: CityPulseSnapshot): void {
    if (!this.isBrowser) {
      return;
    }

    try {
      window.localStorage.setItem(
        this.cacheKey(atlasId),
        JSON.stringify({
          snapshot,
          expiresAt: Date.now() + CACHE_TTL_MS,
        }),
      );
    } catch {
      // Ignore storage failures.
    }
  }

  private cacheKey(atlasId: string): string {
    return `${CACHE_PREFIX}${atlasId}`;
  }
}
