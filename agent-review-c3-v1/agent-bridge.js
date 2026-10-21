"use strict";
(() => {
    const win = window;
    let host = null, engine = null, loading = false, inFlight = false, sequence = 0, lastIdle = false, errorCount = 0;
    const errors = [];
    const copy = (value) => JSON.parse(JSON.stringify(value));
    const freeze = (value) => { if (value && typeof value === 'object') {
        Object.values(value).forEach(freeze);
        Object.freeze(value);
    } return value; };
    function record(code, value) { const raw = value instanceof Error ? value.message : String(value); errorCount++; errors.push({ code, message: raw.replace(/https?:\/\/\S+/g, '[resource]').slice(0, 240) }); if (errors.length > 20)
        errors.shift(); }
    function failure(code, message = code) { throw Object.assign(new Error(message), { code }); }
    function required() { if (!host?.ready)
        failure('NOT_READY', 'Game is not ready; inspect getDiagnostics()'); return host; }
    function modal(h) { return h.welcome?.active ? 'WELCOME' : h.settings?.active ? 'SETTINGS' : h.gallery?.active ? 'GALLERY' : null; }
    function stable() { const h = host; return !!h?.ready && !h.busy && !h.paused && !h.phases.length && h.roleSkill === -1 && !h.skipNode?.active && !modal(h); }
    function gameState() { const h = required(); return freeze(copy({ version: 'candidate.3-agent.1', game: h.game.snapshot(), board: getBoard(), skills: ['jubao', 'leiao'].map((catId, slot) => ({ catId, energy: h.game.energy[slot], ready: h.game.energy[slot] >= 100 && !h.game.over, defaultTarget: 27 })), turn: { idle: stable() && !inFlight, busy: h.busy || inFlight, paused: h.paused, modal: modal(h), terminal: h.game.over, pendingPhases: h.phases.length, skillPlaying: h.roleSkill, operationSequence: sequence }, presentation: { score: h.viewScore, energy: h.viewEnergy, collected: h.viewCollected }, audio: { enabled: h.audio.enabled, state: h.audio.context?.state || 'not-created', music: h.audio.musicVolume, sfx: h.audio.sfxVolume } })); }
    function getBoard() { const h = required(); return freeze(Array.from({ length: 8 }, (_, r) => Array.from({ length: 8 }, (_, c) => ({ row: r, col: c, type: h.game.board[r * 8 + c], special: h.game.special[r * 8 + c] })))); }
    function timeoutValue(value) { if (!Number.isInteger(value) || value < 100 || value > 60000)
        failure('INVALID_TIMEOUT', 'timeoutMs must be an integer from 100 to 60000'); return value; }
    async function waitStable(timeoutMs, includeCommand) { const end = performance.now() + timeoutValue(timeoutMs); while (!(stable() && (!includeCommand || !inFlight))) {
        if (performance.now() >= end)
            failure('IDLE_TIMEOUT', 'Animation/input idle timed out; inspect paused/modal/graphics diagnostics');
        await new Promise(resolve => setTimeout(resolve, 25));
    } return gameState(); }
    function actionable(allowTerminal = false) { const h = required(); if (inFlight || h.busy || h.phases.length || h.roleSkill !== -1 || h.skipNode?.active)
        failure('BUSY'); if (h.paused)
        failure('PAUSED'); if (modal(h))
        failure('MODAL_OPEN', modal(h)); if (h.game.over && !allowTerminal)
        failure('GAME_OVER'); return h; }
    async function operation(fn, allowTerminal = false) { const h = actionable(allowTerminal); inFlight = true; lastIdle = false; sequence++; const before = errorCount; try {
        await fn(h);
        await waitStable(30000, false);
        if (errorCount !== before)
            failure('ACTION_FAILED', 'Runtime reported an error; inspect diagnostics');
    }
    finally {
        inFlight = false;
    } return gameState(); }
    const api = Object.freeze({
        apiVersion: '1.0.0', build: 'candidate.3-agent.1',
        getGameState: gameState, getBoard,
        swap(r1, c1, r2, c2) { if (![r1, c1, r2, c2].every(n => Number.isInteger(n) && n >= 0 && n < 8))
            return Promise.reject(Object.assign(new Error('Coordinates must be integers 0..7'), { code: 'INVALID_COORDINATE' })); if (Math.abs(r1 - r2) + Math.abs(c1 - c2) !== 1)
            return Promise.reject(Object.assign(new Error('Only adjacent cells can swap'), { code: 'NOT_ADJACENT' })); return operation(h => h.move(r1 * 8 + c1, r2 * 8 + c2)); },
        activateSkill(catId) { if (catId !== 'jubao' && catId !== 'leiao')
            return Promise.reject(Object.assign(new Error('catId must be jubao or leiao'), { code: 'INVALID_CAT' })); return operation(h => { const slot = catId === 'jubao' ? 0 : 1; if (h.game.energy[slot] < 100)
            failure('INSUFFICIENT_ENERGY'); return h.cast(slot); }); },
        restartLevel() { return operation(h => h.startLevel(h.levelIndex), true); },
        waitForIdle(timeoutMs = 30000) { return waitStable(timeoutMs, true); },
        getDiagnostics() { return freeze(copy({ build: 'candidate.3-agent.1', installed: true, errorCount, hostReady: !!host?.ready, boot: win.ncBoot?.state || null, inFlight, sequence, errors, turn: host?.ready ? { busy: host.busy, paused: host.paused, modal: modal(host), phases: host.phases.length, skill: host.roleSkill } : null, audio: host?.ready ? { enabled: host.audio.enabled, state: host.audio.context?.state || 'not-created' } : null })); }
    });
    Object.defineProperty(win, 'ncAgent', { value: api, writable: false, configurable: false });
    win.addEventListener('error', event => record('WINDOW_ERROR', event.message));
    win.addEventListener('unhandledrejection', event => record('UNHANDLED_REJECTION', event.reason));
    const timer = setInterval(async () => {
        if (!engine && !loading && win.ncBoot?.state?.stage === 'ready' && win.System) {
            loading = true;
            try {
                engine = await win.System.import('cc');
            }
            catch (error) {
                record('BRIDGE_ENGINE', error);
            }
            finally {
                loading = false;
            }
        }
        if (!host && engine) {
            const scene = engine.director.getScene();
            const found = (scene?.getComponent?.('Main') || scene?.getComponentInChildren('Main'));
            if (found?.ready) {
                host = found;
                const original = host.recover.bind(host);
                host.recover = (checkpoint, error) => { record('ACTION_RECOVERED', error); original(checkpoint, error); };
                win.dispatchEvent(new CustomEvent('nc-agent-ready'));
            }
        }
        const idle = stable() && !inFlight;
        if (idle && !lastIdle)
            win.dispatchEvent(new CustomEvent('nc-agent-idle', { detail: { sequence } }));
        lastIdle = idle;
    }, 50);
    win.addEventListener('pagehide', () => clearInterval(timer), { once: true });
})();
