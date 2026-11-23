// AI-generated (Codex): exercise the browser's production request code without a browser or hardware.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createControllerClient, validateTargets } = require('../../data/controller-client.js');
const response = (body, status = 200, type = 'application/json') => new Response(body, {
    status, headers: { 'Content-Type': type }
});

test('only valid JSON positive acknowledgements confirm a mutation', async () => {
    for (const [body, type] of [['<html>Range</html>', 'text/html'], ['', 'text/plain'],
        ['{', 'application/json'], ['{"ok":false}', 'application/json'], ['{}', 'application/json']]) {
        const client = createControllerClient(async () => response(body, 200, type));
        await assert.rejects(client.mutation('/api/officers', { Name: 'Test', BadgeNum: 9 }), (error) => (
            error.code === 'invalid-response' && error.outcome === 'unknown'
        ));
    }
    const client = createControllerClient(async () => response('{"ok":true}'));
    assert.deepEqual(await client.mutation('/api/officers', {}), { ok: true });
});

test('a server rejection retains its useful message and is not retried', async () => {
    let requests = 0;
    const client = createControllerClient(async () => {
        requests++;
        return response('{"error":"Badge already exists"}', 409);
    });
    await assert.rejects(client.mutation('/api/officers', {}), (error) => (
        error.outcome === 'rejected' && error.message === 'Badge already exists'
    ));
    assert.equal(requests, 1);
});

test('deadline bounds both fetch and the response body even if a transport ignores abort', async () => {
    for (const fetchImpl of [() => new Promise(() => {}), async () => ({
        ok: true, status: 200, headers: new Headers({ 'Content-Type': 'application/json' }),
        json: () => new Promise(() => {})
    })]) {
        const client = createControllerClient(fetchImpl, { timeoutMs: 25 });
        await assert.rejects(client.mutation('/api/officers', {}), (error) => (
            error.code === 'timeout' && error.outcome === 'unknown' && /check the saved data/.test(error.message)
        ));
    }
});

test('a disconnected request remains unconfirmed and is not automatically retried', async () => {
    let requests = 0;
    const client = createControllerClient(async () => { requests++; throw new TypeError('offline'); });
    await assert.rejects(client.mutation('/api/officers', {}), (error) => error.outcome === 'unknown');
    assert.equal(requests, 1);
});

test('caller cancellation bounds an uncooperative read before the client deadline', async () => {
    const abort = new AbortController();
    const client = createControllerClient(() => new Promise(() => {}));
    const request = client.requestJson('/api/drill/status', { signal: abort.signal });
    abort.abort();
    await assert.rejects(request, (error) => error.code === 'connection' && error.outcome === 'unknown');
});

test('identical pending writes share one request, later intentional saves remain possible', async () => {
    let finish;
    let requests = 0;
    const client = createControllerClient(() => {
        requests++;
        return new Promise((resolve) => { finish = () => resolve(response('{"ok":true}')); });
    });
    const first = client.mutation('/api/officers', { BadgeNum: 9 });
    const second = client.mutation('/api/officers', { BadgeNum: 9 });
    assert.equal(first, second);
    assert.equal(requests, 1);
    finish();
    await first;
    const third = client.mutation('/api/officers', { BadgeNum: 9 });
    assert.equal(requests, 2);
    finish();
    await third;
});

test('availability needs every unique target id and an explicit boolean state', () => {
    const valid = Array.from({ length: 20 }, (_, index) => ({ id: index + 1, working: index !== 2 }));
    assert.equal(validateTargets(valid), valid);
    for (const fixture of [null, {}, [], valid.slice(1), [...valid.slice(1), valid[1]],
        valid.map((target) => target.id === 2 ? { id: 2 } : target),
        valid.map((target) => target.id === 2 ? { id: '2', working: true } : target)]) {
        assert.throws(() => validateTargets(fixture), /availability/i);
    }
});
