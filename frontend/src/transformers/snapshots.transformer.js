/**
 * Scans the snapshots and applies "system" user to any snapshots that appear to be auto-snapshots
 * This is in lieu of an actual DB field to indicate the snapshot was created automatically.
 * @param {Array} snapshots - Array of snapshots to apply user details to
 * @param {Object} [owner] - The owner of the snapshot (project or device)
 * @returns Array of snapshots with user details applied
 */
function applySystemUserDetails (snapshots, owner) {
    // For any snapshots that have no user we mimic a system-user so that the table can display the device name and a suitable image
    return snapshots.map((snapshot) => {
        if (!snapshot.user) {
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
