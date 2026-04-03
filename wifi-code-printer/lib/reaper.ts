/**
 * Voucher Reaper
 *
 * Periodically scans vouchers for fika:closes: metadata in notes.
 * When closing time has passed, terminates guest sessions and deletes vouchers.
 */

import {
  listVouchers,
  listGuests,
  terminateGuest,
  unauthorizeGuest,
  deleteVoucher,
  deleteRadiusAccount,
  type UnifiConfig,
  type Voucher,
} from "./unifi";
import { getExpiredUsers, removeManagedUser } from "./user-store";
import { parseClosingNote } from "./hours";

export interface ReaperConfig {
  unifi: UnifiConfig;
  intervalMinutes: number;
  graceMinutes: number;
  timezone: string;
}

export class Reaper {
  private timer: Timer | null = null;
  private config: ReaperConfig;
  private running = false;

  constructor(config: ReaperConfig) {
    this.config = config;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    const ms = this.config.intervalMinutes * 60_000;
    console.log(`[reaper] Starting, interval: ${this.config.intervalMinutes}min, grace: ${this.config.graceMinutes}min`);

    // Run immediately, then on interval
    this.sweep();
    this.timer = setInterval(() => this.sweep(), ms);
  }

  stop(): void {
    this.running = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async sweep(): Promise<void> {
    const now = new Date();
    try {
      const vouchers = await listVouchers(this.config.unifi);
      const graceMs = this.config.graceMinutes * 60_000;
      const expired = vouchers.filter((v) => {
        if (!v.note) return false;
        const closes = parseClosingNote(v.note, this.config.timezone);
        return closes !== null && now.getTime() >= closes.getTime() + graceMs;
      });

      if (expired.length > 0) {
        console.log(`[reaper] Found ${expired.length} voucher(s) past closing time`);
        const guests = await listGuests(this.config.unifi);
        for (const voucher of expired) {
          await this.reapVoucher(voucher, guests);
        }
      }

      // Also sweep expired RADIUS accounts (fika:managed with fika:expires:)
      await this.sweepRadiusAccounts(now);
    } catch (err) {
      console.error(`[reaper] Sweep failed: ${err instanceof Error ? err.message : err}`);
    }
  }

  private async sweepRadiusAccounts(_now: Date): Promise<void> {
    const expired = getExpiredUsers();
    for (const user of expired) {
      try {
        await deleteRadiusAccount(this.config.unifi, user.id);
        removeManagedUser(user.id);
        console.log(`[reaper] Deleted expired RADIUS account: ${user.name} (expired: ${user.expires})`);
      } catch (err) {
        console.error(`[reaper] Failed to delete RADIUS account ${user.name}: ${err instanceof Error ? err.message : err}`);
      }
    }
  }

  private async reapVoucher(voucher: Voucher, guests: { _id: string; mac: string; voucher_id?: string }[]): Promise<void> {
    const code = voucher.code;
    const closes = parseClosingNote(voucher.note ?? "");
    console.log(`[reaper] Reaping voucher ${code} (closes: ${closes?.toISOString() ?? "?"})`);

    // Find guest sessions using this voucher
    const sessions = guests.filter((g) => g.voucher_id === voucher._id);

    for (const session of sessions) {
      try {
        console.log(`[reaper]   Terminating guest ${session._id} (mac: ${session.mac})`);
        await terminateGuest(this.config.unifi, session._id);
        await unauthorizeGuest(this.config.unifi, session.mac);
      } catch (err) {
        console.error(`[reaper]   Failed to terminate ${session._id}: ${err instanceof Error ? err.message : err}`);
      }
    }

    // Delete the voucher
    try {
      await deleteVoucher(this.config.unifi, voucher._id);
      console.log(`[reaper]   Deleted voucher ${code} (${sessions.length} session(s) terminated)`);
    } catch (err) {
      console.error(`[reaper]   Failed to delete voucher ${code}: ${err instanceof Error ? err.message : err}`);
    }
  }
}
