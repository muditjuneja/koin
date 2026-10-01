/**
 * Pure systems data and utilities - NO React dependencies
 * 
 * This file can be imported in server-side code (API routes, etc.)
 * Use: import { SYSTEMS, getSystem } from 'koin.js/systems'
 */

export * from './lib/systems';
export * from './data/systems-data';
// How many can play co-op on a system (1 = watch-only): pure, so app servers can word invites with it
export { coopMaxPlayersFor } from './lib/controls/coop';
