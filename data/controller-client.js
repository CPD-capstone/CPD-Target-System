// AI-generated (Codex): the same transport/validation code runs in the browser and Node tests.
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.ControllerClient = api;
})(typeof globalThis === 'object' ? globalThis : this, function () {
    'use strict';

    class ControllerRequestError extends Error {
        constructor(message, code, outcome) {
            super(message);
            this.name = 'ControllerRequestError';
            this.code = code;
            this.outcome = outcome;
        }
    }

    function createControllerClient(fetchImpl, { timeoutMs = 10000 } = {}) {
        const pending = new Map();
        const uncertain = 'Reload and check the saved data before trying again.';

        async function requestJson(path, options = {}, confirmMutation = false, fileLimit = 0) {
            const abort = new AbortController();
            const upstream = options.signal;
            const cancel = () => abort.abort();
            if (upstream?.aborted) cancel();
            else upstream?.addEventListener('abort', cancel, { once: true });
            let timer;
            let aborted;
            const canceled = new Promise((resolve, reject) => {
                aborted = () => reject(new ControllerRequestError(confirmMutation
                    ? `The controller request was interrupted. ${uncertain}`
                    : 'The controller request was interrupted. Check the connection and reload.', 'connection', 'unknown'));
                if (abort.signal.aborted) aborted();
                else abort.signal.addEventListener('abort', aborted, { once: true });
            });
            const deadline = new Promise((resolve, reject) => {
                timer = setTimeout(() => {
                    reject(new ControllerRequestError(confirmMutation
                        ? `The controller did not confirm the request in time. ${uncertain}`
                        : 'The controller did not respond in time. Check the connection and reload.',
                    'timeout', 'unknown'));
                    abort.abort();
                }, timeoutMs);
            });
            const work = async () => {
                const response = await fetchImpl(path, { ...options, cache: 'no-store', signal: abort.signal });
                const isJson = /^application\/json(?:\s*;|$)/i.test(response.headers.get('Content-Type') || '');
                let payload = null;
                // AI-assisted: retain the controller's exact UTF-8 bytes for a downloadable backup.
                let file;
                if (response.ok && isJson && fileLimit) {
                    file = await response.blob();
                    if (file.size > fileLimit) {
                        throw new ControllerRequestError('Records backup exceeds the supported restore size.',
                            'backup-size', 'rejected');
                    }
                }
                if (isJson) {
                    try { payload = file ? JSON.parse(await file.text()) : await response.json(); }
                    catch { /* handled as an invalid response below */ }
                }
                if (!response.ok) {
                    throw new ControllerRequestError(typeof payload?.error === 'string' ? payload.error
                        : `The controller refused the request (HTTP ${response.status}).`, 'rejected', 'rejected');
                }
                if (!isJson || payload === null || (confirmMutation && payload?.ok !== true)) {
                    throw new ControllerRequestError(confirmMutation
                        ? `The controller returned an invalid save confirmation. ${uncertain}`
                        : 'The controller returned invalid data. Reload and try again.',
                    'invalid-response', 'unknown');
                }
                return file ? { file, payload } : payload;
            };
            try {
                return await Promise.race([work(), deadline, canceled]);
            } catch (error) {
                if (error instanceof ControllerRequestError) throw error;
                throw new ControllerRequestError(confirmMutation
                    ? `The controller did not confirm the request. Check the WiFi connection. ${uncertain}`
                    : 'Could not reach the controller. Check the WiFi connection and reload.', 'connection', 'unknown');
            } finally {
                clearTimeout(timer);
                abort.signal.removeEventListener('abort', aborted);
                upstream?.removeEventListener('abort', cancel);
            }
        }

        function mutation(path, body, method = 'POST') {
            const serialized = body === undefined ? undefined : JSON.stringify(body);
            const key = JSON.stringify([path, method, serialized]);
            if (pending.has(key)) return pending.get(key);
            const operation = requestJson(path, serialized === undefined ? { method } : {
                method, headers: { 'Content-Type': 'application/json' }, body: serialized
            }, true);
            pending.set(key, operation);
            operation.finally(() => pending.delete(key)).catch(() => {});
            return operation;
        }

        return { requestJson, mutation, requestBackup: () =>
            requestJson('/api/database/backup', {}, false, 256 * 1024) };
    }

    function validateTargets(targets) {
        if (!Array.isArray(targets) || targets.length !== 20
            || new Set(targets.map((target) => target?.id)).size !== 20
            || targets.some((target) => !Number.isInteger(target?.id) || target.id < 1 || target.id > 20
                || typeof target.working !== 'boolean')) {
            throw new Error('Target availability could not be verified. Reload after checking the controller connection.');
        }
        return targets;
    }

    return { createControllerClient, ControllerRequestError, validateTargets };
});
