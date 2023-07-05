async function setSnapShotAsTarget (app, snapshot, instance, user) {
    await snapshot.reload()
    await instance.updateSetting('deviceSettings', {
        targetSnapshot: snapshot.id
    })
    // Update the targetSnapshot of the devices assigned to this project
    await app.db.models.Device.update({ targetSnapshotId: snapshot.id }, {
        where: {
            ProjectId: instance.id
        }
    })
    await app.auditLog.Project.project.snapshot.deviceTargetSet(user, null, instance, snapshot)
    if (app.comms) {
        app.comms.devices.sendCommandToProjectDevices((await instance.getTeam()).hashid, instance.id, 'update', {
            snapshot: snapshot.hashid
        })
    }
}

module.exports.createSnapshot = async (app, instance, user, snapshotProps) => {
    const snapShot = await app.db.controllers.ProjectSnapshot.createSnapshot(
        instance,
        user,
        snapshotProps
    )

    snapShot.User = user
    await app.auditLog.Project.project.snapshot.created(user, null, instance, snapShot)

    if (snapshotProps.setAsTarget) {
        await setSnapShotAsTarget(app, snapShot, instance, user)
    }
    return snapShot
}

module.exports.copySnapshot = async (app, snapshot, toInstance, { importSnapshot, setAsTarget } = { importSnapshot: true, setAsTarget: false }) => {
    const { settings, flows, name, description } = snapshot.toJSON()
    const snapshotToCopyProps = { settings, flows, name, description }

    const newSnapshot = await app.db.models.ProjectSnapshot.create(
        { ...snapshotToCopyProps, ProjectId: toInstance.id, UserId: snapshot.User.id }
    )

    if (importSnapshot) {
        await app.db.controllers.Project.importProjectSnapshot(toInstance, newSnapshot)
    }

    if (setAsTarget) {
        await setSnapShotAsTarget(app, newSnapshot, toInstance, snapshot.User)
    }

    return newSnapshot
}
