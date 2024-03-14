<template>
    <LockClosedIcon v-if="icon === 'security'" class="ff-icon" />
    <CogIcon v-else-if="icon === 'settings'" class="ff-icon" />
    <NodeRedIcon v-else-if="icon === 'nodered'" class="ff-icon text-red-700" />
    <ProjectIcon v-else-if="icon === 'project'" class="ff-icon text-red-700" />
    <TemplateIcon v-else-if="icon === 'template'" class="ff-icon text-red-700" />
    <PipelineIcon v-else-if="icon === 'pipeline'" class="ff-icon text-indigo-600" />
    <ChipIcon v-else-if="icon === 'device'" class="ff-icon text-blue-700" />
    <BeakerIcon v-else-if="icon === 'beaker'" class="ff-icon text-yellow-600" />
    <DeviceGroupSolidIcon v-else-if="icon === 'device-group'" class="ff-icon text-teal-700" />
    <UserIcon v-else-if="icon === 'user'" class="ff-icon text-green-700" />
    <ClockIcon v-else-if="icon === 'clock'" class="ff-icon text-purple-700" />
    <LoginIcon v-else-if="icon === 'login'" class="ff-icon text-blue-700" />
    <LogoutIcon v-else-if="icon === 'logout'" class="ff-icon text-gray-600" />
    <MailIcon v-else-if="icon === 'mail'" class="ff-icon text-green-700" />
    <UserGroupIcon v-else-if="icon === 'users'" class="ff-icon text-teal-700" />
    <DesktopComputerIcon v-else-if="icon === 'stacks'" class="ff-icon text-red-700" />
    <ColorSwatchIcon v-else-if="icon === 'project-types'" class="ff-icon text-red-700" />
    <IdentificationIcon v-else-if="icon === 'user-profile'" class="ff-icon text-green-700" />
    <ExclamationCircleIcon v-else-if="icon === 'error'" class="ff-icon text-red-500" />
    <TicketIcon v-else-if="icon === 'token'" class="ff-icon text-blue-500" />
    <ExclamationIcon v-else-if="icon === 'resource'" class="ff-icon text-yellow-500" />
    <CurrencyDollarIcon v-else-if="icon === 'billing'" class="ff-icon text-yellow-500" />
    <KeyIcon v-else-if="icon === 'key'" class="ff-icon text-green-700" />
    <KeyIcon v-else-if="icon === 'overage'" class="ff-icon text-red-700" />
    <InformationCircleIcon v-else class="ff-icon text-gray-600" />
</template>

<script>

import {
    BeakerIcon, ChipIcon, ClockIcon, CogIcon, ColorSwatchIcon,
    CurrencyDollarIcon, DesktopComputerIcon, ExclamationCircleIcon,
    ExclamationIcon, IdentificationIcon, InformationCircleIcon,
    KeyIcon, LockClosedIcon, LoginIcon, LogoutIcon, MailIcon,
    TemplateIcon, TicketIcon, UserGroupIcon, UserIcon
} from '@heroicons/vue/outline'

import DeviceGroupSolidIcon from '../icons/DeviceGroupSolid.js'
import NodeRedIcon from '../icons/NodeRed.js'
import PipelineIcon from '../icons/Pipelines.js'
import ProjectIcon from '../icons/Projects.js'

const iconMap = {
    error: [
        'error'
    ],
    nodered: [
        'crashed',
        'stopped',
        'safe-mode',
        'settings.update',
        'flows.set',
        'library.set',
        'nodes.install',
        'nodes.remove',
        'context.delete'
    ],
    template: [
        'application.created',
        'application.updated',
        'application.deleted'
    ],
    project: [
        'project.created',
        'project.deleted',
        'project.duplicated',
        'project.started',
        'project.start-failed',
        'project.stopped',
        'project.restarted',
        'project.suspended',
        'project.protected',
        'project.unprotected'
    ],
    'project-types': [
        'platform.project-type.created',
        'platform.project-type.deleted',
        'platform.project-type.updated',
        'project.type.changed'
    ],
    stacks: [
        'platform.stack.created',
        'platform.stack.deleted',
        'platform.stack.updated',
        'project.stack.changed',
        'project.stack.restart'
    ],
    login: [
        'account.login',
        'auth.login' // node-red event
    ],
    logout: [
        'account.logout',
        'auth.logout', // node-red event
        'auth.login.revoke' // node-red event
    ],
    security: [
        'account.verify.auto-create-team',
        'account.verify.request-token',
        'account.verify.verify-token',
        'user.updated-password',
        'account.forgot-password',
        'account.reset-password'
    ],
    key: [
        'platform.license.applied',
        'platform.license.inspected',
        'platform.licence.apply',
        'platform.licence.inspect'
    ],
    overage: [
        'platform.license.overage'
    ],
    settings: [
        'project.copied',
        'project.imported',
        'platform.settings.updated',
        'platform.settings.update',
        'team.settings.updated',
        'project.settings.updated',
        'device.settings.updated',
        'team.type.changed'
    ],
    'user-profile': [
        'account.register',
        'user.updated-user',
        'users.updated-user',
        'team.user.role-changed',
        'user.roleChanged' // legacy event
    ],
    user: [
        'users.created-user',
        'users.deleted-user',
        'team.user.added',
        'team.user.removed',
        'user.added', // legacy event
        'user.removed' // legacy event
    ],
    users: [
        'team.created',
        'team.deleted',
        'platform.team.created',
        'platform.team.deleted',
        'users.auto-created-team'
    ],
    mail: [
        'user.invite.accepted',
        'user.invite.deleted',
        'team.user.invited',
        'team.user.uninvited',
        'team.user.invite.accepted',
        'team.user.invite.rejected',
        'user.invited', // legacy event
        'user.invite.accept', // legacy event
        'user.invitations.accept-invite', // legacy event
        'user.invite.delete', // legacy event
        'user.uninvited', // legacy event
        'user.invitations.delete-invite'
    ],
    billing: [
        'billing.session.completed',
        'billing.session.created',
        'billing.subscription.updated',
        'billing.subscription.deleted',
        'billing.subscription.credit-applied'
    ],
    clock: [
        'project.snapshot.created',
        'project.device.snapshot.created',
        'project.snapshot.deleted',
        'project.snapshot.rollback',
        'project.snapshot.rolled-back',
        'project.snapshot.imported'
    ],
    device: [
        'project.device.unassigned',
        'project.device.assigned',
        'application.device.unassigned',
        'application.device.assigned',
        'application.device.snapshot.created',
        'application.device.snapshot.deleted',
        'application.device.snapshot.device-target-set',
        'project.snapshot.device-target-set',
        'team.device.created',
        'team.device.deleted',
        'team.device.updated',
        'team.device.unassigned',
        'team.device.assigned',
        'team.device.credentials-generated',
        'team.device.credentialsGenerated', // legacy event
        'project.snapshot.deviceTarget', // legacy event
        'device.credentials.generated',
        'device.started',
        'device.start-failed',
        'device.restarted',
        'device.restart-failed',
        'device.suspended',
        'device.suspend-failed'
    ],
    'device-group': [
        'application.deviceGroup.created',
        'application.deviceGroup.updated',
        'application.deviceGroup.deleted',
        'application.deviceGroup.members.changed'
    ],
    beaker: [
        'team.device.developer-mode.enabled',
        'team.device.developer-mode.disabled',
        'team.device.remote-access.enabled',
        'team.device.remote-access.disabled',
        'device.developer-mode.enabled',
        'device.developer-mode.disabled',
        'device.remote-access.enabled',
        'device.remote-access.disabled'
    ],
    token: [
        'team.device.provisioning.created',
        'team.device.provisioning.updated',
        'team.device.provisioning.deleted',
        'project.httpToken.created',
        'project.httpToken.updated',
        'project.httpToken.deleted'
    ],
    pipeline: [
        'application.pipeline.created',
        'application.pipeline.updated',
        'application.pipeline.deleted',
        'application.pipeline.stage-added',
        'application.pipeline.stage-deployed',
        'project.assigned-to-pipeline-stage'
    ],
    resource: [
        'resource.cpu',
        'resource.memory'
    ]
}

export default {
    name: 'AuditLogIcon',
    props: {
        event: {
            required: true,
            type: String
        }
    },
    setup (props) {
        // convert the iconMap into an object where the key is the event and the value is the icon
        const flatIconMap = Object.entries(iconMap).flatMap(([icon, events]) => events.map(event => [event, icon]))
        const icon = flatIconMap.find(([event]) => event === props.event)

        if (icon) {
            return { icon: icon[1] }
        }
        // if we get here, we don't have an icon for this event. Lets
        // at least attempt to show something relevant by looking at
        // the first two parts of the event
        const eventParts = props.event.split('.')
        if (eventParts.length > 1) {
            const first2Parts = eventParts.slice(0, 2).join('.')
            for (const [event, icon] of flatIconMap) {
                if (event.startsWith(first2Parts)) {
                    return { icon }
                }
            }
        }
        return {
            icon: 'default'
        }
    },
    components: {
        PipelineIcon,
        BeakerIcon,
        DesktopComputerIcon,
        LockClosedIcon,
        ProjectIcon,
        NodeRedIcon,
        TemplateIcon,
        ChipIcon,
        DeviceGroupSolidIcon,
        ColorSwatchIcon,
        MailIcon,
        CogIcon,
        KeyIcon,
        ClockIcon,
        IdentificationIcon,
        UserIcon,
        UserGroupIcon,
        LoginIcon,
        LogoutIcon,
        CurrencyDollarIcon,
        ExclamationCircleIcon,
        ExclamationIcon,
        TicketIcon,
        InformationCircleIcon
    }
}
</script>
