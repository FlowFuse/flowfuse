module.exports.createSnapshot = async (app, project, user, snapshotProps, setAsTarget = false) => {
    const snapShot = await app.db.controllers.ProjectSnapshot.createSnapshot(
        project,
        user,
        snapshotProps
    )
    snapShot.User = user
    await app.auditLog.Project.project.snapshot.created(user, null, project, snapShot)
    if (setAsTarget) {
        await snapShot.reload()
        await project.updateSetting('deviceSettings', {
            targetSnapshot: snapShot.id
        })
        // Update the targetSnapshot of the devices assigned to this project
        await app.db.models.Device.update({ targetSnapshotId: snapShot.id }, {
            where: {
                ProjectId: project.id
            }
        })
        await app.auditLog.Project.project.snapshot.deviceTargetSet(user, null, project, snapShot)
        if (app.comms) {
            app.comms.devices.sendCommandToProjectDevices(project.Team.hashid, project.id, 'update', {
                snapshot: snapShot.hashid
            })
        }
    }
    return snapShot
}
