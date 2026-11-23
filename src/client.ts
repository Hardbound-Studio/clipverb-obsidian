// The plugin's whole conversation with the Clipverb desktop app.
//
// It talks to one place only: the app's local connection on 127.0.0.1, ports
// 47800 to 47809. `GET /hello` finds the app (it carries no user data), then
// `POST /link` hands it a link with the pairing code as a bearer token. The
// app fetches the captions and files the note; this file fetches nothing.
//
// Kept free of the `obsidian` import so it can be tested under plain Node:
// the caller passes in the HTTP function (Obsidian's `requestUrl`, which is
// not bound by CORS; the app sends no CORS header on purpose).

export type Mode = 'captions' | 'distill';

export interface HttpRequest {
	url: string;
	method: 'GET' | 'POST';
	headers?: Record<string, string>;
	body?: string;
}

export interface HttpResponse {
	status: number;
	/** The parsed body, or null when it was empty or not JSON. */
	json: unknown;
}

/** Resolves with any HTTP status; rejects only when nothing answered. */
export type Http = (req: HttpRequest) => Promise<HttpResponse>;

export const FIRST_PORT = 47800;
export const LAST_PORT = 47809;

/** Every result the user can be told about, one sentence each in the strings. */
export type Outcome =
	| 'sent'
	| 'paired'
	| 'no_code'
	| 'no_link'
	| 'not_running'
	| 'bad_code'
	| 'not_bought'
	| 'bad_link'
	| 'no_model'
	| 'consent'
	| 'starting'
	| 'failed';

/** The refusal words the app sends in `reason`, passed straight through. */
const APP_REASONS: readonly Outcome[] = ['not_bought', 'bad_link', 'no_model', 'consent', 'starting'];

function base(port: number): string {
	return `http://127.0.0.1:${port}`;
}

/**
 * The port Clipverb answers on, or null when no port in the range does.
 * All ten are asked at once; the lowest that says it is Clipverb wins, which
 * is the port the app binds first.
 */
export async function findApp(http: Http): Promise<number | null> {
	const ports: number[] = [];
	for (let p = FIRST_PORT; p <= LAST_PORT; p++) ports.push(p);
	const answers = await Promise.all(
		ports.map(async (port) => {
			try {
				const res = await http({ url: `${base(port)}/hello`, method: 'GET' });
				const body = res.json as { app?: unknown } | null;
				return res.status === 200 && body !== null && typeof body === 'object' && body.app === 'clipverb'
					? port
					: null;
			} catch {
				return null;
			}
		}),
	);
	for (const port of answers) if (port !== null) return port;
	return null;
}

/** A web link the app could be handed, or null. */
export function isWebLink(text: string): boolean {
	const t = text.trim().toLowerCase();
	return (t.startsWith('https://') || t.startsWith('http://')) && !/\s/.test(text.trim());
}

/** Hand one link to the app. Never throws. */
export async function sendLink(http: Http, code: string, url: string, mode: Mode): Promise<Outcome> {
	const token = code.trim();
	const link = url.trim();
	if (!link) return 'no_link';
	if (!isWebLink(link)) return 'bad_link';
	if (!token) return 'no_code';
	const port = await findApp(http);
	if (port === null) return 'not_running';
	let res: HttpResponse;
	try {
		res = await http({
			url: `${base(port)}/link`,
			method: 'POST',
			headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
			body: JSON.stringify({ url: link, mode }),
		});
	} catch {
		return 'not_running';
	}
	if (res.status === 202 || res.status === 200) return 'sent';
	if (res.status === 401) return 'bad_code';
	const reason = (res.json as { reason?: unknown } | null)?.reason;
	const known = APP_REASONS.find((r) => r === reason);
	return known ?? 'failed';
}

/** The settings tab's Check button: is the app there, and does it take this code? */
export async function checkPairing(http: Http, code: string): Promise<Outcome> {
	const token = code.trim();
	if (!token) return 'no_code';
	const port = await findApp(http);
	if (port === null) return 'not_running';
	try {
		const res = await http({
			url: `${base(port)}/status`,
			method: 'GET',
			headers: { Authorization: `Bearer ${token}` },
		});
		if (res.status === 200) return 'paired';
		if (res.status === 401) return 'bad_code';
		return 'failed';
	} catch {
		return 'not_running';
	}
}

const URL_PATTERN = /https?:\/\/[^\s<>()[\]"'`]+/gi;

function tidy(url: string): string {
	// A link at the end of a sentence carries its full stop; a Markdown link
	// closes with a bracket the pattern already stops at.
	return url.replace(/[.,;:!?]+$/, '');
}

/**
 * The link to send from the editor: the selection if it holds one, otherwise
 * the link the cursor sits in, otherwise the only link on the line.
 */
export function linkFromEditor(selection: string, line: string, cursorCh: number): string | null {
	const sel = selection.match(URL_PATTERN);
	if (sel && sel[0]) return tidy(sel[0]);
	const found = [...line.matchAll(URL_PATTERN)];
	for (const m of found) {
		const start = m.index ?? 0;
		if (cursorCh >= start && cursorCh <= start + m[0].length) return tidy(m[0]);
	}
	if (found.length === 1 && found[0]) return tidy(found[0][0]);
	return null;
}
