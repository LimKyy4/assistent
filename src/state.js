const conversationState = new Map();
const STATE_TIMEOUT = 2 * 60 * 1000; // 2 menit

export function getPendingState(remoteJid) {
    const state = conversationState.get(remoteJid);
    if (!state) return null;
    if (Date.now() - state.timestamp > STATE_TIMEOUT) {
        conversationState.delete(remoteJid);
        return null;
    }
    return state;
}

/**
 * Atomic read-and-delete: ambil state dan langsung hapus.
 * Mencegah interleaving bug saat Baileys fire event duplikat.
 * Kalau perlu state tetap (misal input invalid), caller harus setState() lagi.
 */
export function takeState(remoteJid) {
    const state = conversationState.get(remoteJid);
    if (!state) return null;
    if (Date.now() - state.timestamp > STATE_TIMEOUT) {
        conversationState.delete(remoteJid);
        return null;
    }
    conversationState.delete(remoteJid);
    return state;
}

export function setState(remoteJid, state) {
    state.timestamp = Date.now();
    conversationState.set(remoteJid, state);
}

export function clearState(remoteJid) {
    conversationState.delete(remoteJid);
}
