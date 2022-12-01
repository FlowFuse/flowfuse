<template>
    <LockClosedIcon v-if="icon === 'security'" class="ff-icon" />
    <CogIcon v-if="icon === 'settings'" class="ff-icon" />
    <ProjectIcon v-if="icon === 'project'" class="ff-icon text-red-700" />
    <NodeRedIcon v-if="icon === 'nodered'" class="ff-icon text-red-700" />
    <ClockIcon v-if="icon === 'clock'" class="ff-icon text-purple-700" />
    <DesktopComputerIcon v-if="icon === 'stacks'" class="ff-icon text-red-700" />
    <ColorSwatchIcon v-if="icon === 'project-types'" class="ff-icon text-red-700" />
    <ChipIcon v-if="icon === 'device'" class="ff-icon text-blue-700" />
    <MailIcon v-if="icon === 'mail'" class="ff-icon text-green-700" />
    <IdentificationIcon v-if="icon === 'user-profile'" class="ff-icon text-green-700" />
    <UserIcon v-if="icon === 'user'" class="ff-icon text-green-700" />
    <UserGroupIcon v-if="icon === 'users'" class="ff-icon text-teal-700" />
    <CurrencyDollarIcon v-if="icon === 'billing'" class="ff-icon text-yellow-500" />
    <KeyIcon v-if="icon === 'key'" class="ff-icon text-green-700" />
    <LoginIcon v-if="icon === 'login'" class="ff-icon text-blue-700" />
    <LogoutIcon v-if="icon === 'logout'" class="ff-icon text-gray-600" />
    <ExclamationCircleIcon v-if="icon === 'error'" class="ff-icon text-red-500" />
</template>

<script>

import ProjectIcon from '@/components/icons/Projects'
import NodeRedIcon from '@/components/icons/NodeRed'
import {
    DesktopComputerIcon, ClockIcon, ColorSwatchIcon,
    UserIcon, UserGroupIcon, LockClosedIcon,
    MailIcon, LoginIcon, LogoutIcon, KeyIcon,
    CurrencyDollarIcon, CogIcon, ExclamationCircleIcon,
    ChipIcon, IdentificationIcon
} from '@heroicons/vue/outline'

const iconMap = {
    error: [
        'error'
    ],
    nodered: [
        'crashed',
        'stopped'
    ],
    project: [
        'project.created',
        'project.deleted',
        'project.duplicated',
        'project.started',
        'project.start-failed',
        'project.stopped',
        'project.restarted',
        'project.suspended'
    ],
    'project-types': [
        'platform.project-type.created',
        'platform.project-type.deleted',
        'platform.project-type.updated'
    ],
    stacks: [
        'platform.stack.created',
        'platform.stack.deleted',
        'platform.stack.updated',
        'project.stack.changed'
    ],
    login: [
        'account.login',
        'auth.login' // node-red event
    ],
    logout: [
        'account.logout',
        'auth.logout' // node-red event
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
    settings: [
        'platform.settings.updated',
        'platform.settings.update',
        'team.settings.updated',
        'project.settings.updated'
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
        'users.auto-created-team'
    ],
    mail: [
        'user.invite.accepted',
        'user.invite.deleted',
        'team.user.invited',
        'team.user.univited',
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
        'billing.subscription.deleted'
    ],
    clock: [
        'project.snapshot.created',
        'project.snapshot.deleted',
        'project.snapshot.rollback',
        'project.snapshot.rolled-back'
    ],
    device: [
        'project.device.unassigned',
        'project.device.assigned',
        'project.snapshot.device-target-set',
        'team.device.created',
        'team.device.deleted',
        'team.device.updated',
        'team.device.unassigned',
        'team.device.assigned',
        'team.device.credentials-generated',
        'team.device.credentialsGenerated', // legacy event
        'project.snapshot.deviceTarget' // legacy event
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
        for (const [icon, events] of Object.entries(iconMap)) {
            if (events.includes(props.event)) {
                return {
                    icon
                }
            }
        }
        return {
            icon: 'default'
        }
    },
    components: {
        DesktopComputerIcon,
        LockClosedIcon,
        ProjectIcon,
        NodeRedIcon,
        ChipIcon,
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
        ExclamationCircleIcon
    }
}
</script>
