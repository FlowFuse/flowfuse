<template>
    <li class="ff-auditlog-entry">
        <div v-if="entry.date" class="font-medium mt-2 mb-1">{{entry.date}}</div>
        <div class="ml-8 flex py-3 border-b text-base">
            <div class="w-20 text-gray-500">{{entry.time}}</div>
            <div class="w-12">
                <UserIcon v-if="iconMap[entry.id] === 'user'" class=" text-gray-300 w-8 h-8" />
                <UsersIcon v-if="iconMap[entry.id] === 'team'" class=" text-gray-300 w-8 h-8" />
                <CogIcon v-if="iconMap[entry.id] === 'settings'" class=" text-gray-300 w-8 h-8" />
                <ClockIcon v-if="iconMap[entry.id] === 'snapshot'" class=" text-gray-300 w-8 h-8" />
                <CurrencyDollarIcon v-if="iconMap[entry.id] === 'billing'" class=" text-gray-300 w-8 h-8" />
                <ChipIcon v-if="iconMap[entry.id] === 'devices'" class=" text-gray-300 w-8 h-8" />
                <ProjectIcon v-if="iconMap[entry.id] === 'settings'" class=" text-gray-300 w-8 h-8" />
                <PlayIcon v-else class=" text-gray-300 w-8 h-8" />
            </div>
            <div class="flex-grow flex flex-col">
                <div>{{entry.title}}</div>
                <div class="text-sm text-gray-500">{{entry.username}}</div>
                <div class="text-sm text-gray-500">{{entry.body}}</div>
            </div>
            <div class="flex flex-col">
                <div>team/project name</div>
            </div>
            <div class="flex flex-col">
                <div class="text-sm text-gray-500">{{ entry.username }}</div>
                <div class="text-sm text-gray-500">role</div>
            </div>
        </div>
    </li>
</template>

<script>
/* eslint-disable no-template-curly-in-string */

import { UserIcon, UsersIcon } from '@heroicons/vue/solid'
import { CogIcon, ClockIcon, CurrencyDollarIcon, ChipIcon } from '@heroicons/vue/outline'
import { ProjectIcon } from '@/components/icons/Projects'

// easier to manage/check groupings like this.
// We convert to id:group map in the setup()
const iconGroups = {
    device: []
}

const eventDescriptions = {
    'project.created': 'Project created',
    'project.dulplicated': 'Project Duplicated',
    'project.deleted': 'Project deleted',
    'project.stopped': 'Project stopped',
    'project.started': 'Project started',
    'auth.login': '${user} logged in',
    'auth.login.revoke': '${user} logged out',
    'flows.set': 'Flows updated',

    // Project Log
    'user.invited': 'User invited',
    'user.uninvited': 'User uninvited',
    'user.invite.accept': '${user} accepted invitation',
    'user.invite.reject': '${user} declined invitation'

}

const eventIcons = {
    'project.started': 'play',
    'project.stopped': 'stop',
    'project.created': 'create',
    'project.duplicated': 'create',
    'project.deleted': 'create',
    'auth.login': 'user',
    'auth.login.revoke': 'logout',
    'flows.set': 'pencil'
}

export default {
    name: 'AuditLogEntry',
    props: ['entry'],
    setup () {
        const iconMap = {}
        // easier to
        for (const [group, id] of Object.entries(iconGroups)) {
            iconMap[id] = group
        }
        return {
            iconMap
        }
    },
    methods: {
        formatResults: function (log) {
            let lastDate = null
            return log.map(entry => {
                if (!entry.time) {
                    const date = new Date(entry.createdAt)
                    const thisDate = date.toDateString()
                    if (thisDate !== lastDate) {
                        entry.date = date.toDateString()
                        lastDate = thisDate
                    }
                    entry.time = date.toLocaleTimeString()
                    entry.icon = eventIcons[entry.event] || null
                    entry.title = eventDescriptions[entry.event] || entry.event
                    entry.title = entry.title.replace(/\${user}/g, entry.username)
                } else if (entry.date) {
                    lastDate = entry.date
                }
                return entry
            })
        }
    },
    components: {
        UserIcon,
        UsersIcon,
        CogIcon,
        ClockIcon,
        CurrencyDollarIcon,
        ChipIcon,
        ProjectIcon
    }
}
</script>

<style scoped lang="scss">

</style>
