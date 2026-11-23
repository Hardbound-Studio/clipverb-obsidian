// Interface strings. English is the source; Arabic, Spanish and French come
// only from the studio's translation chain, never written by hand.
import { getLanguage } from 'obsidian';
import en from './i18n/en.json';
import ar from './i18n/ar.json';
import es from './i18n/es.json';
import fr from './i18n/fr.json';

export type Key = keyof typeof en;

const TABLES: Record<string, Partial<Record<Key, string>>> = { en, ar, es, fr };

/** Obsidian's own interface language, reduced to the base tag ("es-419" is "es"). */
export function baseLanguage(tag: string): string {
	return (tag || 'en').toLowerCase().split(/[-_]/)[0] ?? 'en';
}

let table: Partial<Record<Key, string>> = en;

/** Read Obsidian's language once, on load. */
export function initLanguage(): void {
	table = TABLES[baseLanguage(getLanguage())] ?? en;
}

export function t(key: Key): string {
	return table[key] ?? en[key];
}
