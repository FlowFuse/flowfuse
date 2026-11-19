/**
 * Retention for the nightly VolumeSnapshots of a team's server.
 */

/** ISO 8601 week of a date as `YYYY-Www`, in UTC */
function isoWeek (date) {
    const day = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
    const weekday = day.getUTCDay() || 7
    // The Thursday of this week decides which year the week belongs to
    day.setUTCDate(day.getUTCDate() + 4 - weekday)
    const yearStart = Date.UTC(day.getUTCFullYear(), 0, 1)
    const week = Math.ceil(((day - yearStart) / 86400000 + 1) / 7)
    return `${day.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

/**
 * Which snapshots to delete: keep the newest `daily`, plus the newest snapshot of each of the
 * `weekly` most recent ISO weeks among the older ones.
 *
 * @param {Array<{ name: string, createdAt?: Date|string|number }>} snapshots
 * @param {{ daily?: number, weekly?: number }} retention
 * @param {Date|number} now stands in for the creation time of a snapshot that has none yet,
 * which is one that was only just requested
 * @returns {string[]} names to delete
 */
function snapshotsToDelete (snapshots, { daily = 7, weekly = 4 } = {}, now = new Date()) {
    const fallback = new Date(now)
    const dated = snapshots.map(snapshot => {
        const created = snapshot.createdAt ? new Date(snapshot.createdAt) : fallback
        return {
            name: snapshot.name,
            created: Number.isNaN(created.getTime()) ? fallback : created
        }
    })
    dated.sort((a, b) => b.created - a.created)

    const older = dated.slice(daily)
    const keptWeeks = new Set()
    const keep = new Set()
    for (const snapshot of older) {
        const week = isoWeek(snapshot.created)
        if (keptWeeks.has(week)) {
            continue
        }
        if (keptWeeks.size >= weekly) {
            break
        }
        keptWeeks.add(week)
        keep.add(snapshot.name)
    }
    return older.filter(snapshot => !keep.has(snapshot.name)).map(snapshot => snapshot.name)
}

module.exports = { snapshotsToDelete, isoWeek }
