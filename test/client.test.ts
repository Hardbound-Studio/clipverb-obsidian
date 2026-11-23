import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkPairing, findApp, isWebLink, linkFromEditor, sendLink, type Http, type HttpRequest } from '../src/client.ts';

/** A fake app on one port; every other port refuses the connection. */
function fakeApp(port: number, link: (req: HttpRequest) => { status: number; json: unknown }, code = 'abc'): Http & { seen: HttpRequest[] } {
	const seen: HttpRequest[] = [];
	const http = (async (req: HttpRequest) => {
		seen.push(req);
		const u = new URL(req.url);
		assert.equal(u.hostname, '127.0.0.1', 'only ever 127.0.0.1');
		if (Number(u.port) !== port) throw new Error('ECONNREFUSED');
		if (u.pathname === '/hello') return { status: 200, json: { app: 'clipverb', protocol: 1 } };
		if (req.headers?.Authorization !== `Bearer ${code}`) return { status: 401, json: { error: 'bad' } };
		if (u.pathname === '/status') return { status: 200, json: {} };
		if (u.pathname === '/link') return link(req);
		return { status: 404, json: null };
	}) as Http & { seen: HttpRequest[] };
	http.seen = seen;
	return http;
}

const accept = () => ({ status: 202, json: { accepted: true } });

test('finds the app on whichever port it bound', async () => {
	assert.equal(await findApp(fakeApp(47803, accept)), 47803);
});

test('a different program on the port is not the app', async () => {
	const other: Http = async (req) =>
		new URL(req.url).port === '47800' ? { status: 200, json: { app: 'something-else' } } : Promise.reject(new Error('x'));
	assert.equal(await findApp(other), null);
});

test('sends the link and mode with the pairing code', async () => {
	const http = fakeApp(47800, accept);
	assert.equal(await sendLink(http, ' abc ', ' https://youtu.be/dQw4w9WgXcQ ', 'distill'), 'sent');
	const post = http.seen.find((r) => r.method === 'POST');
	assert.ok(post);
	assert.deepEqual(JSON.parse(post.body ?? ''), { url: 'https://youtu.be/dQw4w9WgXcQ', mode: 'distill' });
});

test('app closed', async () => {
	const none: Http = () => Promise.reject(new Error('ECONNREFUSED'));
	assert.equal(await sendLink(none, 'abc', 'https://youtu.be/x', 'captions'), 'not_running');
	assert.equal(await checkPairing(none, 'abc'), 'not_running');
});

test('wrong pairing code', async () => {
	assert.equal(await sendLink(fakeApp(47800, accept), 'nope', 'https://youtu.be/x', 'captions'), 'bad_code');
	assert.equal(await checkPairing(fakeApp(47800, accept), 'nope'), 'bad_code');
	assert.equal(await checkPairing(fakeApp(47800, accept), 'abc'), 'paired');
});

test('each refusal the app sends is passed through', async () => {
	for (const reason of ['not_bought', 'bad_link', 'no_model', 'consent', 'starting'] as const) {
		const http = fakeApp(47800, () => ({ status: 409, json: { error: 'x', reason } }));
		assert.equal(await sendLink(http, 'abc', 'https://youtu.be/x', 'captions'), reason);
	}
	const odd = fakeApp(47800, () => ({ status: 500, json: { reason: 'new_word' } }));
	assert.equal(await sendLink(odd, 'abc', 'https://youtu.be/x', 'captions'), 'failed');
});

test('checks before dialling', async () => {
	const never: Http = () => assert.fail('should not dial');
	assert.equal(await sendLink(never, 'abc', '', 'captions'), 'no_link');
	assert.equal(await sendLink(never, 'abc', 'not a link', 'captions'), 'bad_link');
	assert.equal(await sendLink(never, '', 'https://youtu.be/x', 'captions'), 'no_code');
	assert.equal(await checkPairing(never, '  '), 'no_code');
});

test('isWebLink', () => {
	assert.ok(isWebLink('https://youtu.be/x'));
	assert.ok(isWebLink('HTTP://example.com'));
	assert.ok(!isWebLink('ftp://x'));
	assert.ok(!isWebLink('https://a b'));
});

test('link from the editor', () => {
	const line = 'See [talk](https://youtu.be/aaa) and https://www.youtube.com/watch?v=bbb.';
	assert.equal(linkFromEditor('', line, 20), 'https://youtu.be/aaa');
	assert.equal(linkFromEditor('', line, line.length - 3), 'https://www.youtube.com/watch?v=bbb');
	assert.equal(linkFromEditor('', line, 2), null, 'two links and the cursor on neither');
	assert.equal(linkFromEditor('', 'only https://youtu.be/ccc here', 0), 'https://youtu.be/ccc');
	assert.equal(linkFromEditor('watch https://youtu.be/ddd!', line, 0), 'https://youtu.be/ddd');
	assert.equal(linkFromEditor('', 'no links', 0), null);
});
