const extractNameRegex =
  /(?:(?<name>.*) - )?Deploy Snapshot - \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/
const extractDescriptionRegex =
  /Snapshot created for pipeline deployment from .* to .* as part of pipeline .*/

async function setSnapShotAsTarget (app, snapshot, instance, user) {
    await snapshot.reload()
    await instance.updateSetting('deviceSettings', {
        targetSnapshot: snapshot.id
    })
    // Update the targetSnapshot of the devices assigned to this project
    await app.db.models.Device.update(
        { targetSnapshotId: snapshot.id },
        {
            where: {
                ProjectId: instance.id
            }
        }
    )
    await app.auditLog.Project.project.snapshot.deviceTargetSet(
        user,
        null,
        instance,
        snapshot
    )
    if (app.comms) {
        app.comms.devices.sendCommandToProjectDevices(
            (await instance.getTeam()).hashid,
            instance.id,
            'update',
            {
                snapshot: snapshot.hashid
            }
        )
    }
}

/**
 * Generate a name for a deploy snapshot
 * Optionally using the name of the source snapshot, stripping out the deploy timing info
 * @param {*} sourceSnapshot
 * @returns string
 */
module.exports.generateDeploySnapshotName = (sourceSnapshot = null) => {
    const nameParts = [
        'Deploy Snapshot',
        new Date().toLocaleString('sv-SE') // YYYY-MM-DD HH:MM:SS
    ]

    if (sourceSnapshot?.name) {
        const extractedGroups = sourceSnapshot.name.match(extractNameRegex)
        const existingName = extractedGroups?.groups.name ?? (extractedGroups?.length > 0 ? '' : sourceSnapshot.name)
        if (existingName) {
            nameParts.unshift(existingName)
        }
    }

    return nameParts.join(' - ')
}

module.exports.generateDeploySnapshotDescription = (
    sourceStage,
    targetStage,
    pipeline,
    sourceSnapshot = null
) => {
    let description = `Snapshot created for pipeline deployment from ${sourceStage.name} to ${targetStage.name} as part of pipeline ${pipeline.name}`

    if (sourceSnapshot) {
        const existingDescription = sourceSnapshot.description
            .replace(extractDescriptionRegex, '')
            .trim()

        if (existingDescription) {
            description = `${existingDescription}\n\n${description}`
        }
    }

    return description
}

module.exports.createSnapshot = async (app, instance, user, snapshotProps) => {
    const fullInstanceObject = await app.db.models.Project.byId(instance.id)
    if (snapshotProps.flows && typeof snapshotProps.flows === 'object' && Array.isArray(snapshotProps.flows.flows)) {
        // ProjectSnapshot.createSnapshot function in `controllers/ProjectSnapshot.js`
        // expects the flows and credentials to be separate properties
        const credentials = snapshotProps.flows.credentials
        const flows = snapshotProps.flows.flows
        snapshotProps.credentials = credentials
        snapshotProps.flows = flows
    }

    const snapShot = await app.db.controllers.ProjectSnapshot.createSnapshot(
        fullInstanceObject, // expects Project.byId for all extra props
        user,
        snapshotProps
    )

    snapShot.User = user
    await app.auditLog.Project.project.snapshot.created(
        user,
        null,
        instance,
        snapShot
    )

    if (snapshotProps.setAsTarget) {
        await setSnapShotAsTarget(app, snapShot, instance, user)
    }
    return snapShot
}

module.exports.copySnapshot = async (
    app,
    snapshot,
    toInstance,
    {
        importSnapshot,
        setAsTarget,
        decryptAndReEncryptCredentialsSecret,
        targetSnapshotProperties
    } = {
        importSnapshot: true,
        setAsTarget: false,
        decryptAndReEncryptCredentialsSecret: null,
        targetSnapshotProperties: null
    }
) => {
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
            app.log.warn(
                `Assuming credentials from snapshot ${name} (${snapshot.hashid}) are not encrypted as no decryptAndReEncryptCredentialsSecret was passed`
            )
            newCredentials = app.db.controllers.Project.exportCredentials(
                oldCredentials,
                null,
                targetInstanceSecret
            )
        } else {
            newCredentials = await app.db.controllers.Project.reEncryptCredentials(
                flows.credentials,
                decryptAndReEncryptCredentialsSecret,
                targetInstanceSecret
            )
        }

        snapshotToCopyProps.flows.credentials = newCredentials
    }

    const newSnapshot = await app.db.models.ProjectSnapshot.create({
        ...snapshotToCopyProps,
        ...targetSnapshotProperties,
        ProjectId: toInstance.id,
        UserId: snapshot.UserId
    })

    if (importSnapshot) {
        await app.db.controllers.Project.importProjectSnapshot(
            toInstance,
            newSnapshot,
            { mergeEnvVars: true, decryptAndReEncryptCredentialsSecret }
        )
    }

    if (setAsTarget) {
        await setSnapShotAsTarget(app, newSnapshot, toInstance, snapshot.User)
    }

    return newSnapshot
}
