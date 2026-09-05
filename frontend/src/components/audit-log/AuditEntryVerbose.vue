<template>
    <!-- -->
    <template v-if="error">
        <label>{{ $t('ui.error') }} </label>
    </template>
    <!-- Team Scoped Events -->
    <template v-if="entry.event === 'team.created' || entry.event === 'platform.team.created'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.team">{{ $t('ui.teamP0HasBeenCreated', { p0: entry.body.team?.name }) }}</span>
        <span v-else-if="!error">{{ $t('ui.teamDataNotFoundInAuditEntry') }}</span>
    </template>
    <template v-else-if="entry.event === 'team.deleted' || entry.event === 'platform.team.deleted'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.team">{{ $t('ui.teamP0HasBeenDeleted', { p0: entry.body.team?.name }) }}</span>
        <span v-else-if="!error">{{ $t('ui.teamDataNotFoundInAuditEntry') }}</span>
    </template>

    <!-- Team User Events -->
    <template v-else-if="entry.event === 'team.user.added' || entry.event === 'user.added'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.user">{{ $t('ui.userP0HasBeenAddedToTheTeam', { p0: entry.body.user.name }) }}</span>
        <span v-else-if="!error">{{ $t('ui.userDataNotFoundInAuditEntry') }}</span>
    </template>
    <template v-else-if="entry.event === 'team.user.removed' || entry.event === 'user.removed'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.user">{{ $t('ui.userP0HasBeenRemovedFromTheTeam', { p0: entry.body.user.name }) }}</span>
        <span v-else-if="!error">{{ $t('ui.userDataNotFoundInAuditEntry') }}</span>
    </template>
    <template v-else-if="entry.event === 'team.user.invited' || entry.event === 'user.invited'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.user">{{ $t('ui.userP0HasBeenInvitedToTheTeam', { p0: entry.body.user.name }) }}</span>
        <span v-else-if="!error">{{ $t('ui.userDataNotFoundInAuditEntry') }}</span>
    </template>
    <template v-else-if="entry.event === 'team.user.uninvited' || entry.event === 'user.uninvited'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.user">{{ $t('ui.userP0HasBeenUninvitedFromTheTeam', { p0: entry.body.user.name }) }}</span>
        <span v-else-if="!error">{{ $t('ui.userDataNotFoundInAuditEntry') }}</span>
    </template>
    <template v-else-if="entry.event === 'team.user.invite.accepted'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.user">{{ $t('ui.userP0HasAcceptedTheInviteToJoinTheTeamP1', { p0: entry.body.user.name, p1: entry.body.role ? ` as a ${entry.body.role}` : '' }) }}</span>
        <span v-else-if="!error">{{ $t('ui.userDataNotFoundInAuditEntry') }}</span>
    </template>
    <template v-else-if="entry.event === 'team.user.invite.rejected'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.user">{{ $t('ui.userP0HasRejectedTheInviteToJoinTheTeamP1', { p0: entry.body.user.name, p1: entry.body.role ? ` as a ${entry.body.role}` : '' }) }}</span>
        <span v-else-if="!error">{{ $t('ui.userDataNotFoundInAuditEntry') }}</span>
    </template>
    <template v-else-if="entry.event === 'team.user.role-changed' || entry.event === 'user.roleChanged'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.user">{{ $t('ui.theRoleForP0HasBeenChanged', { p0: entry.body.user.name }) }}</span>
        <span v-else-if="!error">{{ $t('ui.userDataNotFoundInAuditEntry') }}</span>
    </template>

    <!-- Team Settings Events -->
    <template v-else-if="entry.event === 'team.settings.updated'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error">{{ $t('ui.teamSettingsHaveBeenChanged') }}</span>
    </template>

    <!-- Team Type Events -->
    <template v-else-if="entry.event === 'team.type.changed'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.info">{{ $t('ui.theTeamTypeChangedFromP0ToP1', { p0: entry.body.info.old.name, p1: entry.body.info.new.name }) }}</span>
        <span v-else-if="!error">{{ $t('ui.detailsNotFoundInAuditEntry') }}</span>
    </template>

    <!-- Team Device Developer Mode -->
    <template v-else-if="entry.event === 'team.device.developer-mode.enabled' || entry.event === 'device.developer-mode.enabled'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.device">{{ $t('ui.developerModeHasBeenEnabledForTheDeviceP0', { p0: entry.body.device?.name }) }}</span>
        <span v-else-if="!error">{{ $t('ui.deviceDataNotFoundInAuditEntry') }}</span>
    </template>
    <template v-else-if="entry.event === 'team.device.developer-mode.disabled' || entry.event === 'device.developer-mode.disabled'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.device">{{ $t('ui.developerModeHasBeenDisabledForTheDeviceP0', { p0: entry.body.device?.name }) }}</span>
        <span v-else-if="!error">{{ $t('ui.deviceDataNotFoundInAuditEntry') }}</span>
    </template>
    <template v-else-if="entry.event === 'team.device.remote-access.enabled' || entry.event === 'device.remote-access.enabled'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.device">{{ $t('ui.remoteAccessHasBeenEnabledForDeviceP0', { p0: entry.body.device?.name }) }}</span>
        <span v-else-if="!error">{{ $t('ui.deviceDataNotFoundInAuditEntry') }}</span>
    </template>
    <template v-else-if="entry.event === 'team.device.remote-access.disabled' || entry.event === 'device.remote-access.disbaled'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.device">{{ $t('ui.remoteAccessHasBeenDisabledForDeviceP0', { p0: entry.body.device?.name }) }}</span>
        <span v-else-if="!error">{{ $t('ui.deviceDataNotFoundInAuditEntry') }}</span>
    </template>

    <!-- Team Device Events -->
    <template v-else-if="entry.event === 'team.device.created'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.device">{{ $t('ui.deviceP0HasBeenCreated', { p0: entry.body.device?.name }) }}</span>
        <span v-else-if="!error">{{ $t('ui.deviceDataNotFoundInAuditEntry') }}</span>
    </template>
    <template v-else-if="entry.event === 'team.device.deleted'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.device">{{ $t('ui.deviceP0HasBeenDeleted', { p0: entry.body.device?.name }) }}</span>
        <span v-else-if="!error">{{ $t('ui.deviceDataNotFoundInAuditEntry') }}</span>
    </template>
    <template v-else-if="entry.event === 'team.device.bulk-deleted'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.info?.count">{{ entry.body.info.count }} Device{{ entry.body.info.count > 1 ? 's have' : ' has' }} been deleted.</span>
        <span v-else-if="!error">{{ $t('ui.additionalInfoNotFoundInAuditEntry') }}</span>
    </template>
    <template v-else-if="entry.event === 'team.device.updated'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.device">{{ $t('ui.deviceP0HasBeenUpdated', { p0: entry.body.device?.name }) }}</span>
        <span v-else-if="!error">{{ $t('ui.deviceDataNotFoundInAuditEntry') }}</span>
    </template>
    <template v-else-if="entry.event === 'team.device.assigned'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.device">{{ $t('ui.deviceP0HasBeenAssignedToTheP1P2', { p0: entry.body.device?.name, p1: entry.body.application ? $t('ui.application') : $t('ui.instance2'), p2: entry.body.application ? entry.body.application.name : entry.body.project?.name }) }}</span>
        <span v-else-if="!error">{{ $t('ui.deviceDataNotFoundInAuditEntry') }}</span>
    </template>
    <template v-else-if="entry.event === 'team.device.unassigned'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.device">{{ $t('ui.deviceP0HasBeenUnassignedFromTheP1P2', { p0: entry.body.device?.name, p1: entry.body.application ? $t('ui.application') : $t('ui.instance2'), p2: entry.body.application ? entry.body.application.name : entry.body.project?.name }) }}</span>
        <span v-else-if="!error">{{ $t('ui.deviceDataNotFoundInAuditEntry') }}</span>
    </template>
    <template v-else-if="entry.event === 'team.device.credentials-generated' || entry.event === 'team.device.credentialsGenerated' || entry.event === 'device.credentials.generated'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.device">{{ $t('ui.credentialsGeneratedForDeviceP0', { p0: entry.body.device?.name }) }}</span>
        <span v-else-if="!error">{{ $t('ui.deviceDataNotFoundInAuditEntry') }}</span>
    </template>

    <!-- Team Device Auto Provisioning Tokens Events -->
    <template v-else-if="entry.event === 'team.device.provisioning.created'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.info">{{ $t('ui.tokenNameP0WasGenerated', { p0: entry.body.info.tokenName }) }}</span>
        <span v-else-if="!error">{{ $t('ui.provisioningDataNotFoundInAuditEntry') }}</span>
    </template>
    <template v-else-if="entry.event === 'team.device.provisioning.updated'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.info">{{ $t('ui.tokenNameP0WithIdP1HasBeenUpdated', { p0: entry.body.info.tokenName, p1: entry.body.info.tokenId }) }}</span>
        <span v-else-if="!error">{{ $t('ui.provisioningDataNotFoundInAuditEntry') }}</span>
    </template>
    <template v-else-if="entry.event === 'team.device.provisioning.deleted'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.info">{{ $t('ui.tokenNameP0WithIdP1WasDeleted', { p0: entry.body.info.tokenName, p1: entry.body.info.tokenId }) }}</span>
        <span v-else-if="!error">{{ $t('ui.provisioningDataNotFoundInAuditEntry') }}</span>
    </template>

    <!-- Team NPM Package Events -->
    <template v-else-if="entry.event === 'team.package.published'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error">{{ $t('ui.newVersionOfP0PublishedP1', { p0: entry.body.pkg.name, p1: entry.body.pkg.version }) }}</span>
    </template>
    <template v-else-if="entry.event === 'team.package.unpublished'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.pkg">{{ $t('ui.versionP0OfP1Unpublished', { p0: entry.body.pkg.version, p1: entry.body.pkg.name }) }}</span>
    </template>

    <!-- Team Tables Events-->
    <template v-else-if="entry.event === 'team.database.created'">
        <label>{{ $t('ui.databaseCreated') }}</label>
        <span v-if="!error && entry.body?.database">{{ $t('ui.databaseNameP0', { p0: entry.body.database.name }) }}</span>
    </template>

    <template v-else-if="entry.event === 'team.database.deleted'">
        <label>{{ $t('ui.databaseDeleted') }}</label>
        <span v-if="!error && entry.body?.database">{{ $t('ui.databaseNameP0', { p0: entry.body.database.name }) }}</span>
    </template>

    <template v-else-if="entry.event === 'team.database.table.created'">
        <label>{{ $t('ui.tableCreated') }}</label>
        <span v-if="!error && entry.body?.table">{{ $t('ui.tableP0CreatedInP1', { p0: entry.body.table.name, p1: entry.body.database.name }) }}</span>
    </template>

    <template v-else-if="entry.event === 'team.database.table.deleted'">
        <label>{{ $t('ui.tableDeleted') }}</label>
        <span v-if="!error && entry.body?.table">{{ $t('ui.tableP0DeletedInDatabaseP1', { p0: entry.body.table.name, p1: entry.body.database.name }) }}</span>
    </template>

    <!-- Device Actions Events -->
    <template v-else-if="entry.event === 'device.started'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.device">{{ $t('ui.deviceP0WasStarted', { p0: entry.body.device?.name }) }}</span>
        <span v-else-if="!error">{{ $t('ui.deviceDataNotFoundInAuditEntry') }}</span>
    </template>
    <template v-else-if="entry.event === 'device.start-failed'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.device">{{ $t('ui.somethingWentWrongAndWeWereUnableToStartDeviceP0', { p0: entry.body.device.name }) }}</span>
        <span v-else-if="!error">{{ $t('ui.deviceDataNotFoundInAuditEntry') }}</span>
    </template>
    <template v-else-if="entry.event === 'device.restarted'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.device">{{ $t('ui.deviceP0WasRestarted', { p0: entry.body.device.name }) }}</span>
        <span v-else-if="!error">{{ $t('ui.deviceDataNotFoundInAuditEntry') }}</span>
    </template>
    <template v-else-if="entry.event === 'device.restart-failed'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.device">{{ $t('ui.somethingWentWrongAndWeWereUnableToRestartDevice', { p0: entry.body.device.name }) }}</span>
        <span v-else-if="!error">{{ $t('ui.deviceDataNotFoundInAuditEntry') }}</span>
    </template>
    <template v-else-if="entry.event === 'device.suspended'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.device">{{ $t('ui.deviceP0WasSuspended', { p0: entry.body.device.name }) }}</span>
        <span v-else-if="!error">{{ $t('ui.deviceDataNotFoundInAuditEntry') }}</span>
    </template>
    <template v-else-if="entry.event === 'device.suspend-failed'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.device">{{ $t('ui.somethingWentWrongAndWeWereUnableToSuspendDevice', { p0: entry.body.device.name }) }}</span>
        <span v-else-if="!error">{{ $t('ui.deviceDataNotFoundInAuditEntry') }}</span>
    </template>
    <template v-else-if="entry.event === 'device.pipeline.deployed'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.pipeline && entry.body?.device && entry.body?.snapshot">{{ $t('ui.pipelineStage') }} <i>{{ entry.body.pipeline.name }}</i> {{ $t('ui.hasDeployed') }} <i>{{ entry.body.snapshot.name }}</i> {{ $t('ui.to') }}<i>{{ entry.body.device.name }}</i></span>

        <span v-else-if="!error">{{ $t('ui.deviceDataNotFoundInAuditEntry') }}</span>
    </template>
    <template v-else-if="entry.event === 'device.project.deployed'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.project && entry.body?.device && entry.body?.snapshot">
            <i>{{ entry.body?.user?.name || entry.trigger?.name || 'System' }}</i>
            {{ $t('ui.updated') }}
            <i>'{{ entry.body.project.name }}'s'</i>
            {{ $t('ui.targetSnapshotTo') }}
            <i>'{{ entry.body.snapshot.name || 'unnamed' }}'</i>
            {{ $t('ui.snapshotTriggeringAFlowDeployment') }}
        </span>

        <span v-else-if="!error">{{ $t('ui.deviceDataNotFoundInAuditEntry') }}</span>
    </template>
    <template v-else-if="entry.event === 'device.snapshot.deployed'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="entry.body?.device && entry.body?.snapshot">
            <i>{{ entry.body?.user?.name || entry.trigger?.name || 'System' }}</i>
            {{ $t('ui.restoredSnapshot') }}
            <i>'{{ entry.body.snapshot.name || 'unnamed' }}'</i>
        </span>

        <span v-else-if="!error">{{ $t('ui.deviceDataNotFoundInAuditEntry') }}</span>
    </template>
    <template v-else-if="entry.event === 'device.snapshot.target-set'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="entry.body?.device && entry.body?.snapshot">
            <i>{{ entry.body?.user?.name || entry.trigger?.name || 'System' }}</i>
            {{ $t('ui.setSnapshot') }}
            <i>'{{ entry.body.snapshot.name || 'unnamed' }}'</i>
            {{ $t('ui.asTheTargetForTheDevice') }}
        </span>

        <span v-else-if="!error">{{ $t('ui.deviceDataNotFoundInAuditEntry') }}</span>
    </template>

    <!-- Account Scoped Events -->
    <template v-else-if="entry.event === 'account.register'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.user">{{ $t('ui.p0HasRegisteredOnFlowfuse', { p0: entry.body.user?.username }) }}</span>
        <span v-else-if="!error">{{ $t('ui.userDataNotFoundInAuditEntry') }}</span>
    </template>
    <template v-else-if="entry.event === 'account.login' || entry.event === 'auth.login'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.trigger?.name">{{ $t('ui.userP0HasLoggedIn', { p0: entry.trigger.name }) }}</span>
        <span v-else-if="!error">{{ $t('ui.userDataNotFoundInAuditEntry') }}</span>
    </template>
    <template v-else-if="entry.event === 'account.logout' || entry.event === 'auth.logout' || entry.event === 'auth.login.revoke'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.trigger?.id === null && entry.event === 'auth.login.revoke'">{{ $t('ui.nodeRedUserHasLoggedOut') }}</span>
        <span v-else-if="!error && entry.trigger?.name">{{ $t('ui.userP0HasLoggedOut', { p0: entry.trigger.name }) }}</span>
        <span v-else-if="!error">{{ $t('ui.userDataNotFoundInAuditEntry') }}</span>
    </template>
    <template v-else-if="entry.event === 'account.forgot-password'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.user">{{ $t('ui.p0HasForgottenTheirPassword', { p0: entry.body.user?.name || entry.body.user?.email }) }}</span>
        <span v-else-if="!error">{{ $t('ui.userDataNotFoundInAuditEntry') }}</span>
    </template>
    <template v-else-if="entry.event === 'account.reset-password'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.user">{{ $t('ui.p0HasResetTheirPassword', { p0: entry.body.user?.name }) }}</span>
        <span v-else-if="!error">{{ $t('ui.userDataNotFoundInAuditEntry') }}</span>
    </template>
    <template v-else-if="entry.event === 'account.verify.auto-create-team'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.team">{{ $t('ui.theTeamP0HasBeenCreatedAndVerified', { p0: entry.body.team?.name }) }}</span>
        <span v-else-if="!error">{{ $t('ui.teamDataNotFoundInAuditEntry') }}</span>
    </template>
    <template v-else-if="entry.event === 'account.verify.request-token'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error">{{ $t('ui.aTokenHasBeenRequested') }}</span>
    </template>
    <template v-else-if="entry.event === 'account.verify.verify-token'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error">{{ $t('ui.theRequestTokenHasBeenVerifiedSuccessfully') }}</span>
    </template>
    <template v-else-if="entry.event === 'user.updated-user'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.user">{{ $t('ui.userP0HasBeenUpdatedWithTheFollowingChanges', { p0: entry.body.user?.name }) }}</span>
        <span v-else-if="!error">{{ $t('ui.userDataNotFoundInAuditEntry') }}</span>
    </template>
    <template v-else-if="entry.event === 'user.updated-password'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.user">{{ $t('ui.userP0HasUpdatedTheirPassword', { p0: entry.body.user?.name }) }}</span>
        <span v-else-if="!error">{{ $t('ui.userDataNotFoundInAuditEntry') }}</span>
    </template>
    <template v-else-if="entry.event === 'user.invitation.accepted' || entry.event === 'user.invite.accept' || entry.event === 'user.invitations.accept-invite'">
        <!-- TODO: Add team/invite data to this event -->
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.trigger.user">{{ $t('ui.userP0HasAcceptedTheInvite', { p0: entry.trigger.user?.name }) }}</span>
        <span v-else-if="!error">{{ $t('ui.userDataNotFoundInAuditEntry') }}</span>
    </template>
    <template v-else-if="entry.event === 'user.invitation.deleted' || entry.event === 'user.invite.delete' || entry.event === 'user.invitations.delete-invite'">
        <!-- TODO: Add team/invite data to this event -->
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.trigger.user">{{ $t('ui.userP0HasDeletedTheInvite', { p0: entry.trigger.user?.name }) }}</span>
        <span v-else-if="!error">{{ $t('ui.userDataNotFoundInAuditEntry') }}</span>
    </template>
    <template v-else-if="entry.event === 'user.created-user'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.trigger.user && entry.body.user">{{ $t('ui.userP0HasCreatedANewUserP1', { p0: entry.trigger.user?.name, p1: entry.body.user?.name }) }}</span>
        <span v-else-if="!error">{{ $t('ui.userDataNotFoundInAuditEntry') }}</span>
    </template>
    <template v-else-if="entry.event === 'user.deleted'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.user">{{ $t('ui.userP0HasDeletedTheirAccount', { p0: entry.body?.user?.name }) }}</span>
        <span v-else-if="!error">{{ $t('ui.userDataNotFoundInAuditEntry') }}</span>
    </template>
    <template v-else-if="entry.event === 'users.deleted-user'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.trigger.user && entry.body.user">{{ $t('ui.userP0HasDeletedTheUserP1', { p0: entry.trigger.user?.name, p1: entry.body.user?.name }) }}</span>
        <span v-else-if="!error">{{ $t('ui.userDataNotFoundInAuditEntry') }}</span>
    </template>
    <template v-else-if="entry.event === 'users.updated-user'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.user">{{ $t('ui.userP0HasBeenUpdated', { p0: entry.body.user?.name }) }}</span>
        <span v-else-if="!error">{{ $t('ui.userDataNotFoundInAuditEntry') }}</span>
    </template>
    <template v-else-if="entry.event === 'users.auto-created-team'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.team">{{ $t('ui.teamP0HasBeenCreatedForTheUserP1', { p0: entry.body.team?.name, p1: entry.body.user?.name }) }}</span>
        <span v-else-if="!error">{{ $t('ui.teamDataNotFoundInAuditEntry') }}</span>
    </template>

    <!-- Billing Events -->
    <template v-else-if="entry.event === 'billing.session.created'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.billingSession">{{ $t('ui.aBillingSessionHasBeenCreatedWithStripe') }}</span>
        <span v-else-if="!error">{{ $t('ui.billingDataNotFoundInAuditEntry') }}</span>
    </template>
    <template v-else-if="entry.event === 'billing.session.completed'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.billingSession">{{ $t('ui.theBillingSessionHasBeenCompletedViaStripe') }}</span>
        <span v-else-if="!error">{{ $t('ui.billingDataNotFoundInAuditEntry') }}</span>
    </template>
    <template v-else-if="entry.event === 'billing.subscription.deleted'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.billingSession" />
        <span v-else-if="!error">{{ $t('ui.billingDataNotFoundInAuditEntry') }}</span>
    </template>

    <!-- Platform License Events -->
    <template v-else-if="entry.event === 'platform.license.applied' || entry.event === 'platform.licence.apply'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.license">{{ $t('ui.aNewLicenseHasBeenAppliedWithTheFollowingDetails', { p0: entry.body.license }) }}</span>
        <span v-else-if="!error">{{ $t('ui.licenseDataNotFoundInAuditEntry') }}</span>
    </template>
    <template v-else-if="entry.event === 'platform.license.inspected' || entry.event === 'platform.licence.inspect'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.license">{{ $t('ui.aLicenseWasInspectedWithTheFollowingDetailsP0', { p0: entry.body.license }) }}</span>
        <span v-else-if="!error">{{ $t('ui.licenseDataNotFoundInAuditEntry') }}</span>
    </template>
    <template v-else-if="entry.event === 'platform.license.overage'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && typeof entry.body?.info === 'object'">{{ $t('ui.typeP0LimitP1CountP2', { p0: entry.body.info.resource, p1: entry.body.info.limit, p2: entry.body.info.count }) }}</span>
        <span v-else-if="!error">{{ $t('ui.licenseDataNotFoundInAuditEntry') }}</span>
    </template>
    <template v-else-if="entry.event === 'platform.license.expired'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.license">{{ $t('ui.licenseHasExpiredP0', { p0: entry.body.license }) }}</span>
        <span v-else-if="!error">{{ $t('ui.licenseDataNotFoundInAuditEntry') }}</span>
    </template>
    <!-- Platform instance type Events -->
    <template v-else-if="entry.event === 'platform.project-type.created'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.projectType">{{ $t('ui.aNewInstanceTypeP0HasBeenCreated', { p0: entry.body.projectType }) }}</span>
        <span v-else-if="!error">{{ $t('ui.instanceTypeDataNotFoundInAuditEntry') }}</span>
    </template>
    <template v-else-if="entry.event === 'platform.project-type.deleted'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.projectType">{{ $t('ui.instanceTypeP0HasBeenDeleted', { p0: entry.body.projectType }) }}</span>
        <span v-else-if="!error">{{ $t('ui.instanceTypeDataNotFoundInAuditEntry') }}</span>
    </template>
    <template v-else-if="entry.event === 'platform.project-type.updated'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.projectType">{{ $t('ui.instanceTypeP0HasBeenUpdated', { p0: entry.body.projectType }) }}</span>
        <span v-else-if="!error">{{ $t('ui.instanceTypeDataNotFoundInAuditEntry') }}</span>
    </template>
    <template v-else-if="entry.event === 'platform.stack.created'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.stack">{{ $t('ui.nodeRedVersionP0HasBeenCreated', { p0: entry.body.stack.name }) }}</span>
        <span v-else-if="!error">{{ $t('ui.nodeRedVersionDataNotFoundInAuditEntry') }}</span>
    </template>
    <template v-else-if="entry.event === 'platform.stack.deleted'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.stack">{{ $t('ui.nodeRedVersionP0HasBeenDeleted', { p0: entry.body.stack.name }) }}</span>
        <span v-else-if="!error">{{ $t('ui.nodeRedVersionDataNotFoundInAuditEntry') }}</span>
    </template>
    <template v-else-if="entry.event === 'platform.stack.updated'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.stack">{{ $t('ui.nodeRedVersionP0HasBeenUpdated', { p0: entry.body.stack.name }) }}</span>
        <span v-else-if="!error">{{ $t('ui.nodeRedVersionDataNotFoundInAuditEntry') }}</span>
    </template>
    <template v-else-if="entry.event === 'platform.settings.updated' || entry.event === 'platform.settings.update'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error">{{ $t('ui.platformSettingsHaveBeenUpdated') }}</span>
    </template>

    <!-- Application Events -->
    <template v-else-if="entry.event === 'application.created'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.application">{{ $t('ui.applicationP0WasCreatedP1', { p0: entry.body.application?.name, p1: entry.body.team ? `in Team '${entry.body.team.name}'` : '' }) }}</span>
        <span v-else-if="!error">{{ $t('ui.instanceDataNotFoundInAuditEntry') }}</span>
    </template>
    <template v-else-if="entry.event === 'application.updated'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error">{{ $t('ui.theApplicationHasBeenUpdated') }}</span>
    </template>
    <template v-else-if="entry.event === 'application.deleted'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.application">{{ $t('ui.applicationP0WasDeletedP1', { p0: entry.body.application?.name, p1: entry.body.team ? `in Team '${entry.body.team.name}'` : '' }) }}</span>
        <span v-else-if="!error">{{ $t('ui.applicationDataNotFoundInAuditEntry') }}</span>
    </template>
    <template v-else-if="entry.event === 'application.pipeline.created'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.pipeline">{{ $t('ui.devopsPipelineP0HasBeenCreatedP1', { p0: entry.body.pipeline?.name, p1: entry.body.application ? `in Application '${entry.body.application.name}'` : '' }) }}</span>
        <span v-else-if="!error">{{ $t('ui.pipelineDataNotFoundInAuditEntry') }}</span>
    </template>
    <template v-else-if="entry.event === 'application.pipeline.updated'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.pipeline">{{ $t('ui.devopsPipelineP0WasUpdatedP1', { p0: entry.body.pipeline?.name, p1: entry.body.application ? `in Application '${entry.body.application.name}'` : '' }) }}</span>
        <span v-else-if="!error">{{ $t('ui.pipelineDataNotFoundInAuditEntry') }}</span>
    </template>
    <template v-else-if="entry.event === 'application.pipeline.deleted'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.pipeline">{{ $t('ui.devopsPipelineP0WasDeletedP1', { p0: entry.body.pipeline?.name, p1: entry.body.application ? `in Application '${entry.body.application.name}'` : '' }) }}</span>
        <span v-else-if="!error">{{ $t('ui.pipelineDataNotFoundInAuditEntry') }}</span>
    </template>
    <template v-else-if="entry.event === 'application.pipeline.stage-added'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.pipeline && entry.body?.pipelineStage">{{ $t('ui.pipelineStageP0WasAddedToTheDevopsPipelineP1P2', { p0: entry.body.pipelineStage?.name, p1: entry.body.pipeline?.name, p2: entry.body.application ? `in Application '${entry.body.application.name}'` : '' }) }}</span>
        <span v-else-if="!error">{{ $t('ui.pipelineDataNotFoundInAuditEntry') }}</span>
    </template>
    <template v-else-if="entry.event === 'application.pipeline.stage-deployed'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.pipeline && entry.body?.pipelineStage && !entry.body?.pipelineStageTarget">{{ $t('ui.pipelineStageP0InDevopsPipelineP1P2WasDeployed', { p0: entry.body.pipelineStage.name, p1: entry.body.pipeline.name, p2: entry.body.application ? `in Application '${entry.body.application.name}'` : '' }) }}</span>
        <span v-if="!error && entry.body?.pipeline && entry.body?.pipelineStage && entry.body?.pipelineStageTarget">{{ $t('ui.pipelineStageP0InDevopsPipelineP1P2WasDeployedTo', { p0: entry.body.pipelineStage.name, p1: entry.body.pipeline.name, p2: entry.body.application ? `in Application '${entry.body.application.name}'` : '', p3: entry.body.pipelineStageTarget.name }) }}</span>
        <span v-else-if="!error">{{ $t('ui.pipelineDataNotFoundInAuditEntry') }}</span>
    </template>

    <!-- Application Device Events -->
    <template v-else-if="entry.event === 'application.device.assigned'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.application">{{ $t('ui.deviceP0WasAssignedToApplicationP1', { p0: entry.body.device?.name, p1: entry.body.application?.name }) }}</span>
        <span v-else-if="!error">{{ $t('ui.applicationDataNotFoundInAuditEntry') }}</span>
    </template>
    <template v-else-if="entry.event === 'application.device.unassigned'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.application">{{ $t('ui.deviceP0WasUnassignedFromApplicationP1', { p0: entry.body.device?.name, p1: entry.body.application?.name }) }}</span>
        <span v-else-if="!error">{{ $t('ui.applicationDataNotFoundInAuditEntry') }}</span>
    </template>
    <template v-else-if="entry.event === 'application.device.snapshot.created'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.device && entry.body.snapshot">{{ $t('ui.snapshotP0HasBeenBeenCreatedFromApplicationOwned', { p0: entry.body.snapshot?.name, p1: entry.body.device?.name }) }}</span>
        <span v-else-if="!error">{{ $t('ui.deviceOrSnapshotDataNotFoundInAuditEntry') }}</span>
    </template>
    <template v-else-if="entry.event === 'application.device.snapshot.updated'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error">{{ $t('ui.snapshotP0OfApplicationOwnedDeviceP1HasBeenBeenU', { p0: entry.body.snapshot?.name, p1: entry.body.device?.name }) }}</span>
    </template>
    <template v-else-if="entry.event === 'application.device.snapshot.deleted'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.device && entry.body.snapshot">{{ $t('ui.snapshotP0HasBeenBeenDeletedForApplicationOwnedD', { p0: entry.body.snapshot?.name, p1: entry.body.device?.name }) }}</span>
        <span v-else-if="!error">{{ $t('ui.deviceOrSnapshotDataNotFoundInAuditEntry') }}</span>
    </template>
    <template v-else-if="entry.event === 'application.device.snapshot.exported'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.device && entry.body.snapshot">{{ $t('ui.snapshotP0HasBeenBeenExportedForApplicationOwned', { p0: entry.body.snapshot?.name, p1: entry.body.device?.name }) }}</span>
        <span v-else-if="!error">{{ $t('ui.deviceOrSnapshotDataNotFoundInAuditEntry') }}</span>
    </template>
    <template v-else-if="entry.event === 'application.device.snapshot.imported'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.device && entry.body.snapshot">{{ $t('ui.snapshotP0HasBeenBeenImportedForApplicationOwned', { p0: entry.body.snapshot?.name, p1: entry.body.device?.name }) }}</span>
        <span v-else-if="!error">{{ $t('ui.deviceOrSnapshotDataNotFoundInAuditEntry') }}</span>
    </template>
    <template v-else-if="entry.event === 'application.device.snapshot.device-target-set'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.device && entry.body.snapshot">{{ $t('ui.snapshotP0HasBeenSetAsTheTargetForApplicationOwn', { p0: entry.body.snapshot?.name, p1: entry.body.device.name }) }}</span>
        <span v-else-if="!error">{{ $t('ui.deviceDataNotFoundInAuditEntry') }}</span>
    </template>
    <template v-else-if="entry.event === 'device.settings.updated'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.device">{{ $t('ui.deviceP0HasHadChangesMadeToItsSettings', { p0: entry.body.device?.name }) }}</span>
        <span v-else-if="!error">{{ $t('ui.instanceDataNotFoundInAuditEntry') }}</span>
    </template>

    <!-- Application Device Group Events -->
    <template v-else-if="entry.event === 'application.deviceGroup.updated'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.deviceGroup">{{ $t('ui.deviceGroupP0WasUpdatedForApplicationP1', { p0: entry.body.deviceGroup?.name, p1: entry.body.application?.name }) }}</span>
        <span v-else-if="!error">{{ $t('ui.deviceGroupDataNotFoundInAuditEntry') }}</span>
    </template>
    <template v-else-if="entry.event === 'application.deviceGroup.created'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.deviceGroup">{{ $t('ui.deviceGroupP0WasCreatedForApplicationP1', { p0: entry.body.deviceGroup?.name, p1: entry.body.application?.name }) }}</span>
        <span v-else-if="!error">{{ $t('ui.deviceGroupDataNotFoundInAuditEntry') }}</span>
    </template>
    <template v-else-if="entry.event === 'application.deviceGroup.deleted'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.deviceGroup">{{ $t('ui.deviceGroupP0WasDeletedFromApplicationP1', { p0: entry.body.deviceGroup?.name, p1: entry.body.application?.name }) }}</span>
        <span v-else-if="!error">{{ $t('ui.deviceGroupDataNotFoundInAuditEntry') }}</span>
    </template>
    <template v-else-if="entry.event === 'application.deviceGroup.members.changed'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.deviceGroup">{{ $t('ui.deviceGroupP0MembersInApplicationP1UpdatedP2', { p0: entry.body.deviceGroup?.name, p1: entry.body.application?.name, p2: entry.body?.info?.info ?? $t('ui.noChanges') }) }}</span>
        <span v-else-if="!error">{{ $t('ui.deviceGroupDataNotFoundInAuditEntry') }}</span>
    </template>
    <template v-else-if="entry.event === 'application.deviceGroup.settings.updated'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.deviceGroup">{{ $t('ui.deviceGroupP0SettingsInApplicationP1Updated', { p0: entry.body.deviceGroup?.name, p1: entry.body.application?.name }) }}</span>
        <span v-else-if="!error">{{ $t('ui.deviceGroupDataNotFoundInAuditEntry') }}</span>
    </template>

    <!-- Instance Events -->
    <template v-else-if="entry.event === 'project.created'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.project">{{ $t('ui.instanceP0WasCreatedP1', { p0: entry.body.project?.name, p1: entry.body.team ? `in Team '${entry.body.team.name}'` : '' }) }}</span>
        <span v-else-if="!error">{{ $t('ui.instanceDataNotFoundInAuditEntry') }}</span>
    </template>
    <template v-else-if="entry.event === 'project.deleted'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.project">{{ $t('ui.instanceP0WasDeletedP1', { p0: entry.body.project?.name, p1: entry.body.team ? `in Team '${entry.body.team.name}'` : '' }) }}</span>
        <span v-else-if="!error">{{ $t('ui.instanceDataNotFoundInAuditEntry') }}</span>
    </template>
    <template v-else-if="entry.event === 'project.duplicated'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.sourceProject && entry.body.project">{{ $t('ui.instanceP0WasDuplicatedToANewInstanceP1', { p0: entry.body.sourceProject?.name, p1: entry.body.project.name }) }}</span>
        <span v-else-if="!error">{{ $t('ui.instanceDataNotFoundInAuditEntry') }}</span>
    </template>
    <template v-else-if="entry.event === 'project.started'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.project">{{ $t('ui.instanceP0WasStarted', { p0: entry.body.project?.name }) }}</span>
        <span v-else-if="!error">{{ $t('ui.instanceDataNotFoundInAuditEntry') }}</span>
    </template>
    <template v-else-if="entry.event === 'project.start-failed'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.project">{{ $t('ui.somethingWentWrongAndWeWereUnableToStartInstance', { p0: entry.body.project.name }) }}</span>
        <span v-else-if="!error">{{ $t('ui.instanceDataNotFoundInAuditEntry') }}</span>
    </template>
    <template v-else-if="entry.event === 'project.stopped'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.project">{{ $t('ui.instanceP0WasStopped', { p0: entry.body.project.name }) }}</span>
        <span v-else-if="!error">{{ $t('ui.instanceDataNotFoundInAuditEntry') }}</span>
    </template>
    <template v-else-if="entry.event === 'project.restarted'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.project">{{ $t('ui.instanceP0WasRestarted', { p0: entry.body.project.name }) }}</span>
        <span v-else-if="!error">{{ $t('ui.instanceDataNotFoundInAuditEntry') }}</span>
    </template>
    <template v-else-if="entry.event === 'project.suspended'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.project">{{ $t('ui.instanceP0WasSuspended', { p0: entry.body.project.name }) }}</span>
        <span v-else-if="!error">{{ $t('ui.instanceDataNotFoundInAuditEntry') }}</span>
    </template>
    <template v-else-if="entry.event === 'project.copied'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.project && entry.body?.targetProject">{{ $t('ui.instanceP0WasCopiedToP1', { p0: entry.body.project.name, p1: entry.body.targetProject.name }) }}</span>
        <span v-else-if="!error">{{ $t('ui.instanceDataNotFoundInAuditEntry') }}</span>
    </template>
    <template v-else-if="entry.event === 'project.imported'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.project && entry.body?.sourceProject">{{ $t('ui.instanceP0WasCopiedToP12', { p0: entry.body.sourceProject.name, p1: entry.body.project.name }) }}</span>
        <span v-else-if="!error">{{ $t('ui.instanceDataNotFoundInAuditEntry') }}</span>
    </template>
    <template v-else-if="entry.event === 'project.assigned-to-pipeline-stage'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.project">{{ $t('ui.instanceP0WasAssignedToTheP1StageInTheP2Pipeline', { p0: entry.body.project.name, p1: entry.body.pipelineStage.name, p2: entry.body.pipeline.name }) }}</span>
        <span v-else-if="!error">{{ $t('ui.instanceDataNotFoundInAuditEntry') }}</span>
    </template>
    <template v-else-if="entry.event === 'project.protected'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.project">{{ $t('ui.instanceP0WasPlacedIntoProtectedState', { p0: entry.body.project.name }) }}</span>
        <span v-else-if="!error">{{ $t('ui.instanceDataNotFoundInAuditEntry') }}</span>
    </template>
    <template v-else-if="entry.event === 'project.unprotected'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.project">{{ $t('ui.instanceP0WasUnProtected', { p0: entry.body.project.name }) }}</span>
        <span v-else-if="!error">{{ $t('ui.instanceDataNotFoundInAuditEntry') }}</span>
    </template>
    <template v-else-if="entry.event === 'project.device.assigned'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.project">{{ $t('ui.deviceP0WasAssignedToInstanceP1', { p0: entry.body.device?.name, p1: entry.body.project?.name }) }}</span>
        <span v-else-if="!error">{{ $t('ui.instanceDataNotFoundInAuditEntry') }}</span>
    </template>
    <template v-else-if="entry.event === 'project.device.unassigned'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.project">{{ $t('ui.deviceP0WasUnassignedFromInstanceP1', { p0: entry.body.device?.name, p1: entry.body.project?.name }) }}</span>
        <span v-else-if="!error">{{ $t('ui.instanceDataNotFoundInAuditEntry') }}</span>
    </template>
    <template v-else-if="entry.event === 'project.type.changed'">
        <label>{{ $t('ui.instanceTypeChanged') }}</label>
        <span v-if="!error && entry.body?.project">{{ $t('ui.theTypeForInstanceP0HasBeenChangedToTypeP1', { p0: entry.body.project?.name, p1: entry.body.projectType?.name }) }}</span>
        <span v-else-if="!error">{{ $t('ui.instanceDataNotFoundInAuditEntry') }}</span>
    </template>
    <template v-else-if="entry.event === 'project.stack.changed'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.project">{{ $t('ui.theNodeRedVersionForInstanceP0HasBeenChangedToNo', { p0: entry.body.project?.name, p1: entry.body.stack?.name }) }}</span>
        <span v-else-if="!error">{{ $t('ui.instanceDataNotFoundInAuditEntry') }}</span>
    </template>
    <template v-else-if="entry.event === 'project.stack.restart'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.project">{{ $t('ui.theNodeRedVersionForInstanceP0HasBeenRestarted', { p0: entry.body.project?.name }) }}</span>
        <span v-else-if="!error">{{ $t('ui.instanceDataNotFoundInAuditEntry') }}</span>
    </template>
    <template v-else-if="entry.event === 'project.settings.updated'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.project">{{ $t('ui.instanceP0HasHadChangesMadeToItsSettings', { p0: entry.body.project?.name }) }}</span>
        <span v-else-if="!error">{{ $t('ui.instanceDataNotFoundInAuditEntry') }}</span>
    </template>
    <template v-else-if="entry.event === 'project.snapshot.created'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.project && entry.body.snapshot">{{ $t('ui.aNewSnapshotP0HasBeenCreatedForInstanceP1', { p0: entry.body.snapshot?.name, p1: entry.body.project?.name }) }}</span>
        <span v-else-if="!error">{{ $t('ui.instanceDataNotFoundInAuditEntry') }}</span>
    </template>
    <template v-else-if="entry.event === 'project.snapshot.updated'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body">{{ $t('ui.snapshotP0OfInstanceP1HasBeenBeenUpdated', { p0: entry.body.snapshot?.name, p1: entry.body.project?.name }) }}</span>
        <span v-else-if="!error">{{ $t('ui.changeDataNotFoundInAuditEntry') }}</span>
    </template>
    <template v-else-if="entry.event === 'project.device.snapshot.created'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.project && entry.body.snapshot">{{ $t('ui.aNewSnapshotP0HasBeenCreatedFromDeviceP1ForInsta', { p0: entry.body.snapshot?.name, p1: entry.body.device?.name, p2: entry.body.project?.name }) }}</span>
        <span v-else-if="!error">{{ $t('ui.instanceDataNotFoundInAuditEntry') }}</span>
    </template>
    <template v-else-if="entry.event === 'project.snapshot.rolled-back' || entry.event === 'project.snapshot.rollback'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.project && entry.body.snapshot">{{ $t('ui.instanceP0HasBeenRolledBackToTheSnapshotP1', { p0: entry.body.project?.name, p1: entry.body.snapshot?.name }) }}</span>
        <span v-else-if="!error">{{ $t('ui.instanceDataNotFoundInAuditEntry') }}</span>
    </template>
    <template v-else-if="entry.event === 'project.snapshot.deleted'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.project && entry.body.snapshot">{{ $t('ui.snapshotP0HasBeenDeletedInInstanceP1', { p0: entry.body.snapshot?.name, p1: entry.body.project?.name }) }}</span>
        <span v-else-if="!error">{{ $t('ui.instanceDataNotFoundInAuditEntry') }}</span>
    </template>
    <template v-else-if="entry.event === 'project.snapshot.device-target-set' || entry.event === 'project.snapshot.deviceTarget'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.project && entry.body.snapshot">{{ $t('ui.snapshotP0HasBeenSetAsTheDeviceTargetForInstance', { p0: entry.body.snapshot?.name, p1: entry.body.project?.name }) }}</span>
        <span v-else-if="!error">{{ $t('ui.instanceDataNotFoundInAuditEntry') }}</span>
    </template>
    <template v-else-if="entry.event === 'project.snapshot.imported'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.project && entry.body.snapshot">{{ $t('ui.snapshotP0HasBeenImportedForInstanceP1FromInstan', { p0: entry.body.snapshot?.name, p1: entry.body.project?.name, p2: entry.body.sourceProject?.name }) }}</span>
        <span v-else-if="!error">{{ $t('ui.instanceDataNotFoundInAuditEntry') }}</span>
    </template>
    <template v-else-if="entry.event === 'project.snapshot.exported'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.project && entry.body.snapshot">{{ $t('ui.snapshotP0HasBeenExported', { p0: entry.body.snapshot?.name }) }}</span>
        <span v-else-if="!error">{{ $t('ui.instanceDataNotFoundInAuditEntry') }}</span>
    </template>
    <template v-else-if="entry.event === 'project.httpToken.created'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error">{{ $t('ui.httpBearerTokenP0HasBeenCreatedForInstanceP1', { p0: entry.body.token.name, p1: entry.body.project.name }) }}</span>
    </template>
    <template v-else-if="entry.event === 'project.httpToken.updated'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error">{{ $t('ui.httpBearerTokenHasBeenUpdated') }}</span>
    </template>
    <template v-else-if="entry.event === 'project.httpToken.deleted'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error">{{ $t('ui.httpBearerTokenP0HasBeenDeletedFromInstanceP1', { p0: entry.body.token.name, p1: entry.body.project.name }) }}</span>
    </template>

    <!-- Node-RED Events -->
    <template v-else-if="entry.event === 'crashed'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span>{{ $t('ui.somethingHasGoneWrongCheckTheInstanceLogsToInves') }}</span>
    </template>
    <template v-else-if="entry.event === 'stopped'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.info">{{ $t('ui.stopReasonP0AdditionalInformationP1', { p0: entry.body.info.code, p1: entry.body.info.info || 'N/A' }) }}</span>
        <span v-else-if="!error">{{ $t('ui.nodeRedHasStoppedCheckTheInstanceLogsToInvestiga') }}</span>
    </template>
    <template v-else-if="entry.event === 'safe-mode'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span>{{ $t('ui.somethingHasGoneWrongRepeatedlyCheckTheInstanceL') }}</span>
    </template>
    <template v-else-if="entry.event === 'settings.update'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span>{{ $t('ui.nodeRedEditorUserSettingsHaveBeenUpdated') }}</span>
    </template>
    <template v-else-if="entry.event === 'flows.set'">
        <template v-if="entry.body?.flowsSet?.type === 'reload'">
            <label>{{ AuditEvents["flows.reloaded"] }}</label>
            <span>{{ $t('ui.flowsHaveBeenReloaded') }}</span>
        </template>
        <template v-else>
            <label>{{ AuditEvents[entry.event] }}</label>
            <span v-if="entry.body?.flowsSet.type === 'full'">{{ $t('ui.deployTypeFull') }}</span>
            <span v-else-if="entry.body?.flowsSet.type === 'flows'">{{ $t('ui.deployTypeFlows') }}</span>
            <span v-else-if="entry.body?.flowsSet.type === 'nodes'">{{ $t('ui.deployTypeNodes') }}</span>
            <span v-else>{{ $t('ui.flowsDeployed') }}</span>
        </template>
    </template>
    <template v-else-if="entry.event === 'library.set'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span>{{ $t('ui.aFlowOrFunctionHasBeenSavedToTheLibrary') }}</span>
    </template>
    <template v-else-if="entry.event === 'nodes.install'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span>{{ $t('ui.nodesHaveBeenInstalledViaTheManagePaletteOptionI') }}</span>
    </template>
    <template v-else-if="entry.event === 'nodes.remove'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span>{{ $t('ui.nodesHaveBeenRemovedViaTheManagePaletteOptionIns') }}</span>
    </template>
    <template v-else-if="entry.event === 'context.delete'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="entry.body?.context?.scope && entry.body?.context?.store && entry.body?.context?.key">{{ $t('ui.contextKeyP0P1WasDeletedFromContextStoreP2Inside', { p0: entry.body.context.scope, p1: entry.body.context.key, p2: entry.body.context.store }) }}</span>
        <span v-else>{{ $t('ui.aContextDataEntryWasDeletedInsideNodeRedP0', { p0: JSON.stringify(entry.body || {}) }) }}</span>
    </template>

    <template v-else-if="entry.event === 'resource.cpu'">
        <label>{{ $t('ui.instanceHighCpuUsage') }}</label>
        <span>{{ $t('ui.instanceHasSpentMoreThanP0MinutesAtMoreThanP1OfC', { p0: Math.floor(entry.body.interval / 60), p1: entry.body.threshold }) }}</span>
    </template>

    <template v-else-if="entry.event === 'resource.memory'">
        <label>{{ $t('ui.instanceHighMemoryUsage') }}</label>
        <span>{{ $t('ui.instanceHasSpentMoreThanP0MinutesAtMoreThanP1OfM', { p0: Math.floor(entry.body.interval / 60), p1: entry.body.threshold }) }}</span>
    </template>

    <!-- Catch All -->
    <template v-else>
        <label>{{ computeLabelForUnknown(entry) }}</label>
        <span v-if="error && entry.body.error.message">{{ entry.body.error.message }}</span>
        <span v-else>{{ $t('ui.weHaveNoDetailsAvailableForEventTypeP0', { p0: entry?.event ? ` '${entry.event}'` : '' }) }}</span>
    </template>

    <template v-if="error">
        <details class="ff-audit-entry--error">
            <summary>
                <ChevronRightIcon class="ff-icon ff-icon-sm" />
                {{ $t('ui.showError') }}
            </summary>
            <span class="font-mono ml-3 whitespace-pre">
                {{ entry.body }}
                <ChevronDownIcon class="ff-icon ff-icon-sm" />
            </span>
        </details>
    </template>
    <template v-if="updates">
        <details class="ff-audit-entry--error">
            <summary>
                <ChevronRightIcon class="ff-icon ff-icon-sm" />
                {{ $t('ui.showDetails') }}
            </summary>
            <span class="font-mono ml-3 whitespace-pre">
                <AuditEntryUpdates :entry="entry" />
                <ChevronDownIcon class="ff-icon ff-icon-sm" />
            </span>
        </details>
    </template>
</template>

<script>
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/vue/20/solid'

import AuditEventsService from '../../services/audit-events.js'

import AuditEntryUpdates from './AuditEntryUpdates.vue'

export default {
    name: 'AuditEntryVerbose',
    props: {
        entry: {
            type: Object,
            required: true
        }
    },
    computed: {
        error: function () {
            return this.entry.body?.error !== undefined
        },
        updates: function () {
            return this.entry.body?.updates && this.entry.body.updates.length ? this.entry.body.updates : null
        }
    },
    setup () {
        const AuditEvents = AuditEventsService.get()

        return {
            AuditEvents
        }
    },
    components: {
        ChevronRightIcon,
        ChevronDownIcon,
        AuditEntryUpdates
    },
    methods: {
        computeLabelForUnknown (entry) {
            if (!entry?.event) return 'Unknown'
            const known = !!this.AuditEvents[entry.event]
            if (known) {
                return this.AuditEvents[entry.event]
            }
            let labelText = entry.event
            // now replace any dashes, dots, underscores or colons with spaces
            labelText = labelText.replace(/[-._:]/g, ' ')
            // now capitalise the first letter of each word
            labelText = labelText.replace(/\b\w/g, l => l.toUpperCase())
            // replace camel case with spaces
            labelText = labelText.replace(/([a-z])([A-Z])/g, '$1 $2')
            return labelText
        }
    }
}
</script>
