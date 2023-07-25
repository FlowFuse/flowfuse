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
    const fullInstanceObject = await app.db.models.Project.byId(instance.id)

    const snapShot = await app.db.controllers.ProjectSnapshot.createSnapshot(
        fullInstanceObject, // expects Project.byId for all extra props
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

module.exports.copySnapshot = async (app, snapshot, toInstance, { importSnapshot, setAsTarget, decryptAndReEncryptCredentialsSecret } = { importSnapshot: true, setAsTarget: false, decryptAndReEncryptCredentialsSecret: null }) => {
    const { settings, flows, name, description } = snapshot.toJSON()
    const snapshotToCopyProps = { settings, flows, name, description }

    // Decrypt and re-encrypt credentials
    if (snapshotToCopyProps.flows.credentials) {
        const oldCredentials = snapshotToCopyProps.flows.credentials

        let targetInstanceSecret = await toInstance.getCredentialSecret()
        if (!targetInstanceSecret) {
            targetInstanceSecret = app.db.models.Project.generateCredentialSecret()
            await toInstance.updateSetting('credentialSecret', targetInstanceSecret)
        }

        let newCredentials
        if (!decryptAndReEncryptCredentialsSecret) {
            console.warn('Assuming credentials are not encrypted as no decryptAndReEncryptCredentialsSecret was passed')
            newCredentials = app.db.controllers.Project.exportCredentials(oldCredentials, null, targetInstanceSecret)
        } else {
            newCredentials = await app.db.controllers.Project.reEncryptCredentials(flows.credentials, decryptAndReEncryptCredentialsSecret, targetInstanceSecret)
        }

        snapshotToCopyProps.flows.credentials = newCredentials
    }

    const newSnapshot = await app.db.models.ProjectSnapshot.create(
        { ...snapshotToCopyProps, ProjectId: toInstance.id, UserId: snapshot.UserId }
    )

    if (importSnapshot) {
        await app.db.controllers.Project.importProjectSnapshot(toInstance, newSnapshot, { mergeEnvVars: true, decryptAndReEncryptCredentialsSecret })
    }

    if (setAsTarget) {
        await setSnapShotAsTarget(app, newSnapshot, toInstance, snapshot.User)
    }

    return newSnapshot
}
