/**
 * Local store for managed RADIUS account metadata
 *
 * The UniFi RADIUS API doesn't support notes/metadata on accounts.
 * We track managed accounts locally in a JSON file.
 */

import { readFileSync, writeFileSync, existsSync } from "fs";

export interface ManagedUser {
  id: string;          // UniFi _id
  name: string;        // username
  created: string;     // ISO date
  expires: string | null; // ISO date or null (never)
}

const STORE_PATH = process.env.USER_STORE_PATH ?? "/data/managed-users.json";
const FALLBACK_PATH = "./managed-users.json";

function getPath(): string {
  // /data/ exists in HA addon containers
  try {
    if (existsSync("/data")) return STORE_PATH;
  } catch {}
  return FALLBACK_PATH;
}

function load(): ManagedUser[] {
  try {
    return JSON.parse(readFileSync(getPath(), "utf-8"));
  } catch {
    return [];
  }
}

function save(users: ManagedUser[]): void {
  writeFileSync(getPath(), JSON.stringify(users, null, 2));
}

export function listManagedUsers(): ManagedUser[] {
  return load();
}

export function addManagedUser(user: ManagedUser): void {
  const users = load();
  users.push(user);
  save(users);
}

export function removeManagedUser(id: string): void {
  const users = load().filter((u) => u.id !== id);
  save(users);
}

export function renewManagedUser(id: string, newExpiry: string): void {
  const users = load();
  const user = users.find((u) => u.id === id);
  if (user) {
    user.expires = newExpiry;
    save(users);
  }
}

export function getExpiredUsers(): ManagedUser[] {
  const now = new Date();
  return load().filter((u) => u.expires && new Date(u.expires) < now);
}
