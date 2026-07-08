// Logger sederhana dengan timestamp
function timestamp() {
    return new Date().toISOString();
}

export function logError(context, message, error = null) {
    const errInfo = error ? ` | ${error.stack || error.message || error}` : '';
    console.error(`[${timestamp()}] [${context}] ${message}${errInfo}`);
}

export function logInfo(context, message) {
    console.log(`[${timestamp()}] [${context}] ${message}`);
}
