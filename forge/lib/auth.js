const HOUR = 1000 * 60 * 60
// This is the maximum time a user can be logged in for before being asked to reauth
const DEFAULT_WEB_SESSION_EXPIRY = HOUR * 24 * 7 // One week expiry
// If a session is inactive for this time, it will be expired
const DEFAULT_WEB_SESSION_IDLE_TIMEOUT = HOUR * 32 // 32 hours
// We only update the idle time if there is activity within this period prior
// to idle timeout. That avoids the need to update idle timeout on every single request
const DEFAULT_WEB_SESSION_IDLE_GRACE = HOUR * 31 // 31 hours

module.exports = {
    HOUR,
    DEFAULT_WEB_SESSION_EXPIRY,
    DEFAULT_WEB_SESSION_IDLE_TIMEOUT,
    DEFAULT_WEB_SESSION_IDLE_GRACE
}
