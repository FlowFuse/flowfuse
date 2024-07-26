/**
 * Scans the snapshots and applies "system" user to any snapshots that appear to be auto-snapshots
 * This is in lieu of an actual DB field to indicate the snapshot was created automatically.
 * @param {Array} snapshots - Array of snapshots to apply user details to
 * @param {Object} [owner] - The owner of the snapshot (project or device)
 * @returns Array of snapshots with user details applied
 */
function applySystemUserDetails (snapshots, owner) {
    // For any snapshots that have no user and match the autoSnapshot name format
    // we mimic a user so that the table can display the device name and a suitable image
    // NOTE: Any changes to the below regex should be reflected in forge/db/controllers/ProjectSnapshot.js
    const autoSnapshotRegex = /^Auto Snapshot - \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/ // e.g "Auto Snapshot - 2023-02-01 12:34:56"
    return snapshots.map((snapshot) => {
        if (!snapshot.user && autoSnapshotRegex.test(snapshot.name)) {
            snapshot.user = {
                name: owner?.name || (snapshot.project || snapshot.device || {}).name || 'Unknown',
                username: 'Auto Snapshot',
                avatar: '/avatar/camera.svg'
            }
        }
        return snapshot
    })
}

export {
    applySystemUserDetails
}
