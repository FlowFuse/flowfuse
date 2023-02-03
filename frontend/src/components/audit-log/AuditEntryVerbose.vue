<template>
    <!-- -->
    <template v-if="error">
        <label>Error: </label>
    </template>
    <!-- Team Scoped Events -->
    <template v-if="entry.event === 'team.created'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.team">Team '{{ entry.body.team?.name }}' has been created.</span>
        <span v-else-if="!error">Team data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'team.deleted'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.team">Team '{{ entry.body.team?.name }}' has been deleted.</span>
        <span v-else-if="!error">Team data not found in audit entry.</span>
    </template>

    <!-- Team User Events -->
    <template v-else-if="entry.event === 'team.user.added' || entry.event === 'user.added'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.user">User '{{ entry.body.user.name }}' has been added to the team.</span>
        <span v-else-if="!error">User data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'team.user.removed' || entry.event === 'user.removed'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.user">User '{{ entry.body.user.name }}' has been removed from the team.</span>
        <span v-else-if="!error">User data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'team.user.invited' || entry.event === 'user.invited'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.user">User '{{ entry.body.user.name }}' has been invited to the team.</span>
        <span v-else-if="!error">User data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'team.user.uninvited' || entry.event === 'user.uninvited'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.user">User '{{ entry.body.user.name }}' has been uninvited from the team.</span>
        <span v-else-if="!error">User data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'team.user.invite.accepted'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.user">User '{{ entry.body.user.name }}' has accepted the invite to join the team{{ entry.body.role ? ` as a ${entry.body.role}` : '' }}.</span>
        <span v-else-if="!error">User data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'team.user.invite.rejected'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.user">User '{{ entry.body.user.name }}' has rejected the invite to join the team{{ entry.body.role ? ` as a ${entry.body.role}` : '' }}.</span>
        <span v-else-if="!error">User data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'team.user.role-changed' || entry.event === 'user.roleChanged'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.user">The role for '{{ entry.body.user.name }}' has been changed <AuditEntryUpdates :updates="entry.body.updates" />.</span>
        <span v-else-if="!error">User data not found in audit entry.</span>
    </template>

    <!-- Team Settings Events -->
    <template v-else-if="entry.event === 'team.settings.updated'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.updates">The following updates have been made to the team settings: <AuditEntryUpdates :updates="entry.body.updates" />.</span>
        <span v-else-if="!error">Updates not found in audit entry.</span>
    </template>

    <!-- Team Device Events -->
    <template v-else-if="entry.event === 'team.device.created'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.device">Device '{{ entry.body.device?.name }}' has been created.</span>
        <span v-else-if="!error">Device data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'team.device.deleted'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.device">Device '{{ entry.body.device?.name }}' has been deleted.</span>
        <span v-else-if="!error">Device data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'team.device.updated'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.device">Device '{{ entry.body.device?.name }}' has been updated with the following changes: <AuditEntryUpdates :updates="entry.body.updates" />.</span>
        <span v-else-if="!error">Device data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'team.device.assigned'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.device">Device '{{ entry.body.device?.name }}' has been assigned from the Project '{{ entry.body.project?.name }}'.</span>
        <span v-else-if="!error">Device data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'team.device.unassigned'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.device">Device '{{ entry.body.device?.name }}' has been unassigned from the Project '{{ entry.body.project?.name }}'.</span>
        <span v-else-if="!error">Device data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'team.device.credentials-generated' || entry.event === 'team.device.credentialsGenerated'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.device">Credentials generated for Device '{{ entry.body.device?.name }}'.</span>
        <span v-else-if="!error">Device data not found in audit entry.</span>
    </template>

    <!-- Account Scoped Events -->
    <template v-else-if="entry.event === 'account.register'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.user">'{{ entry.body.user?.username }}' has registered on FlowForge.</span>
        <span v-else-if="!error">User data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'account.login' || entry.event === 'auth.login'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.trigger?.name">User '{{ entry.trigger.name }}' has logged in.</span>
        <span v-else-if="!error">User data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'account.logout' || entry.event === 'auth.logout'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.trigger?.name">User '{{ entry.trigger.name }}' has logged out.</span>
        <span v-else-if="!error">User data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'account.forgot-password'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.user">'{{ entry.body.user?.name }}' has forgotted their password.</span>
        <span v-else-if="!error">User data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'account.reset-password'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.user">'{{ entry.body.user?.name }}' has reset their password.</span>
        <span v-else-if="!error">User data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'account.verify.auto-create-team'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.team">The team '{{ entry.body.team?.name }}' has been created and verified.</span>
        <span v-else-if="!error">Team data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'account.verify.request-token'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error">A token has been requested.</span>
    </template>
    <template v-else-if="entry.event === 'account.verify.verify-token'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error">The request token has been verified successfully.</span>
    </template>
    <template v-else-if="entry.event === 'user.updated-user'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.user">User '{{ entry.body.user?.name }}' has been updated, with the following changes:</span>
        <span v-else-if="!error">User data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'user.updated-password'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.user">User '{{ entry.body.user?.name }}' has updated their password</span>
        <span v-else-if="!error">User data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'user.invite.accepted' || entry.event === 'user.invite.accept' || entry.event === 'user.invitations.accept-invite'">
        <!-- TODO: Add team/invite data to this event -->
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.trigger.user">User '{{ entry.trigger.user?.name }}' has accepted the invite.</span>
        <span v-else-if="!error">User data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'user.invite.deleted' || entry.event === 'user.invite.delete' || entry.event === 'user.invitations.delete-invite'">
        <!-- TODO: Add team/invite data to this event -->
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.trigger.user">User '{{ entry.trigger.user?.name }}' has deleted the invite.</span>
        <span v-else-if="!error">User data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'user.created-user'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.trigger.user && entry.body.user">User '{{ entry.trigger.user?.name }}' has created a new user, '{{ entry.body.user?.name }}'.</span>
        <span v-else-if="!error">User data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'user.deleted-user'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.trigger.user && entry.body.user">User '{{ entry.trigger.user?.name }}' has deleted the user, '{{ entry.body.user?.name }}'.</span>
        <span v-else-if="!error">User data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'users.updated-user'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.user">User '{{ entry.body.user?.name }}' has been updated, with the following changes {{ entry.body.updates }}.</span>
        <span v-else-if="!error">User data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'users.auto-created-team'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.team">Team '{{ entry.body.team?.name }}' has been created for the User '{{ entry.body.user?.name }}'.</span>
        <span v-else-if="!error">Team data not found in audit entry.</span>
    </template>

    <!-- Billing Events -->
    <template v-else-if="entry.event === 'billing.session.created'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.billingSession">A billing session has been created with Stripe.</span>
        <span v-else-if="!error">Billing data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'billing.session.completed'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.billingSession">The billing session has been completed via Stripe.</span>
        <span v-else-if="!error">Billing data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'billing.subscription.deleted'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.billingSession"></span>
        <span v-else-if="!error">Billing data not found in audit entry.</span>
    </template>

    <!-- Platform License Events -->
    <template v-else-if="entry.event === 'platform.license.applied' || entry.event === 'platform.licence.apply'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.license">A new license has been applied with the following details: {{ entry.body.license }}</span>
        <span v-else-if="!error">License data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'platform.license.inspected' || entry.event === 'platform.licence.inspect'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.license">A license was inspected with the following details: {{ entry.body.license }}</span>
        <span v-else-if="!error">License data not found in audit entry.</span>
    </template>
    <!-- Platform License Events -->
    <template v-else-if="entry.event === 'platform.project-type.created'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.projectType">A new project type '{{ entry.body.projectType }}' has been created.</span>
        <span v-else-if="!error">Project Type data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'platform.project-type.deleted'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.projectType">Project type '{{ entry.body.projectType }}' has been deleted.</span>
        <span v-else-if="!error">Project Type data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'platform.project-type.updated'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.projectType">Project type '{{ entry.body.projectType }}' has been updated with the following changes: <AuditEntryUpdates :updates="entry.body.updates" /></span>
        <span v-else-if="!error">Project Type data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'platform.stack.created'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.stack">Stack '{{ entry.body.stack.name }}' has been created.</span>
        <span v-else-if="!error">Stack data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'platform.stack.deleted'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.stack">Stack '{{ entry.body.stack.name }}' has been deleted.</span>
        <span v-else-if="!error">Stack data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'platform.stack.updated'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.stack">Stack '{{ entry.body.stack.name }}' has been updated with the following changes: <AuditEntryUpdates :updates="entry.body.updates" /></span>
        <span v-else-if="!error">Stack data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'platform.settings.updated' || entry.event === 'platform.settings.update'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.updates">Platform settings have been updated with the following changes: <AuditEntryUpdates :updates="entry.body.updates" /></span>
        <span v-else-if="!error">Update data not found in audit entry.</span>
    </template>

    <!-- Project Events -->
    <template v-else-if="entry.event === 'project.created'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.project">Project {{ entry.body.project?.name }} was created {{ entry.body.team ? `in Team '${entry.body.team.name}'` : '' }}</span>
        <span v-else-if="!error">Project data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'project.deleted'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.project">Project {{ entry.body.project?.name }} was deleted {{ entry.body.team ? `in Team '${entry.body.team.name}'` : '' }}</span>
        <span v-else-if="!error">Project data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'project.duplicated'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.sourceProject && entry.body.project">Project '{{ entry.body.sourceProject?.name }}' was duplicated to a new Project '{{ entry.body.project.name }}'</span>
        <span v-else-if="!error">Project data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'project.started'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.project">Project '{{ entry.body.project?.name }}' was started.</span>
        <span v-else-if="!error">Project data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'project.start-failed'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.project">Something went wrong, and we were unable to start Project '{{ entry.body.project.name }}'. Please check the logs to find out more.</span>
        <span v-else-if="!error">Project data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'project.stopped'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.project">Project '{{ entry.body.project.name }}' was stopped.</span>
        <span v-else-if="!error">Project data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'project.restarted'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.project">Project '{{ entry.body.project.name }}' was restarted.</span>
        <span v-else-if="!error">Project data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'project.suspended'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.project">Project '{{ entry.body.project.name }}' was suspended.</span>
        <span v-else-if="!error">Project data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'project.copied'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.project && entry.body?.targetProject">Project '{{ entry.body.project.name }}' was copied to '{{ entry.body.targetProject.name }}'</span>
        <span v-else-if="!error">Project data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'project.imported'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.project && entry.body?.sourceProject">Project '{{ entry.body.sourceProject.name }}' was copied to '{{ entry.body.project.name }}'</span>
        <span v-else-if="!error">Project data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'project.device.assigned'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.project">Device '{{ entry.body.device?.name }}' was assigned to Project '{{ entry.body.project?.name }}'</span>
        <span v-else-if="!error">Project data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'project.device.unassigned'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.project">Device '{{ entry.body.device?.name }}' was unassigned from Project '{{ entry.body.project?.name }}'</span>
        <span v-else-if="!error">Project data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'project.type.changed'">
        <label>Project Type Changed</label>
        <span v-if="!error && entry.body?.project">The type for Project '{{ entry.body.project?.name }}' has been changed to Type '{{ entry.body.projectType?.name }}'</span>
        <span v-else-if="!error">Project data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'project.stack.changed'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.project">The stack for Project '{{ entry.body.project?.name }}' has been changed to Stack '{{ entry.body.stack?.name }}'</span>
        <span v-else-if="!error">Project data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'project.stack.restart'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.project">The stack for Project '{{ entry.body.project?.name }}' has been restarted</span>
        <span v-else-if="!error">Project data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'project.settings.updated'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.project">Project '{{ entry.body.project?.name }}' has had the following changes made to its settings: <AuditEntryUpdates :updates="entry.body.updates" /></span>
        <span v-else-if="!error">Project data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'project.snapshot.created'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.project && entry.body.snapshot">A new Snapshot '{{ entry.body.snapshot?.name }}' has been created for Project '{{ entry.body.project?.name }}'.</span>
        <span v-else-if="!error">Project data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'project.snapshot.rolled-back' || entry.event === 'project.snapshot.rollback'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.project && entry.body.snapshot">Project '{{ entry.body.project?.name }}' has been rolled back to the Snapshot '{{ entry.body.snapshot?.name }}'.</span>
        <span v-else-if="!error">Project data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'project.snapshot.deleted'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.project && entry.body.snapshot">Snapshot '{{ entry.body.snapshot?.name }}' has been deleted in Project '{{ entry.body.project?.name }}'.</span>
        <span v-else-if="!error">Project data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'project.snapshot.device-target-set' || entry.event === 'project.snapshot.deviceTarget'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.project && entry.body.snapshot">Snapshot '{{ entry.body.snapshot?.name }}' has been set as the device target for Project '{{ entry.body.project?.name }}'.</span>
        <span v-else-if="!error">Project data not found in audit entry.</span>
    </template>

    <!-- Node-RED Events -->
    <template v-else-if="entry.event === 'crashed'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span>Something has gone wrong. Check the project logs to investigate further.</span>
    </template>
    <template v-else-if="entry.event === 'stopped'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span>Something has gone wrong. Check the project logs to investigate further.</span>
    </template>
    <template v-else-if="entry.event === 'settings.update'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span>Node-RED editor user settings have been updated.</span>
    </template>
    <template v-else-if="entry.event === 'flows.set'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span>A new flow has been deployed</span>
    </template>
    <template v-else-if="entry.event === 'library.set'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span>A flow or function has been saved to the Library</span>
    </template>

    <!-- Catch All -->
    <template v-else>
        <label>{{ AuditEvents[entry.event] }}{{ entry.event }}</label>
        <span>We have no details available for this event type</span>
    </template>

    <template v-if="error">
        <details class="ff-audit-entry--error">
            <summary>
                <ChevronRightIcon class="ff-icon ff-icon-sm"/>
                Show Error
            </summary>
            <span>
                {{ entry.body }}
                <ChevronDownIcon class="ff-icon ff-icon-sm"/>
            </span>
        </details>
    </template>
</template>

<script>
import { ChevronRightIcon, ChevronDownIcon } from '@heroicons/vue/solid'
import AuditEntryUpdates from './AuditEntryUpdates.vue'

import AuditEventsService from '@/services/audit-events.js'

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
    }
}
</script>
