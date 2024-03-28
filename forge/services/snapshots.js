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
        targetSnapshotProperties
    } = {
        importSnapshot: true,
        setAsTarget: false,
        targetSnapshotProperties: null
    }
) => {
    const { settings, flows, name, description, credentialSecret } = snapshot.toJSON()
    const snapshotToCopyProps = { settings, flows, name, description }
    let targetInstanceSecret = await toInstance.getCredentialSecret()
    if (!targetInstanceSecret) {
        targetInstanceSecret = app.db.models.Project.generateCredentialSecret()
        await toInstance.updateSetting('credentialSecret', targetInstanceSecret)
    }
    // Decrypt and re-encrypt credentials
    if (snapshotToCopyProps.flows.credentials) {
        snapshotToCopyProps.flows.credentials = await app.db.controllers.Project.reEncryptCredentials(
            snapshotToCopyProps.flows.credentials,
            credentialSecret,
            targetInstanceSecret
        )
    }

    const newSnapshot = await app.db.models.ProjectSnapshot.create({
        ...snapshotToCopyProps,
        ...targetSnapshotProperties,
        credentialSecret: targetInstanceSecret,
        ProjectId: toInstance.id,
        UserId: snapshot.UserId
    })

    if (importSnapshot) {
        await app.db.controllers.Project.importProjectSnapshot(
            toInstance,
            newSnapshot,
            { mergeEnvVars: true }
        )
    }

    if (setAsTarget) {
        await setSnapShotAsTarget(app, newSnapshot, toInstance, snapshot.User)
    }

    return newSnapshot
}
