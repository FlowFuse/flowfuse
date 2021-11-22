<template>
    <template v-if="logEntries.length > 0">
        <ul class="mx-auto max-w-4xl">
            <li v-for="(item, itemIdx) in logEntries" :key="item.id">
                <div v-if="item.date" class="text-lg font-medium mt-2 mb-1">{{item.date}}</div>
                <div class="ml-8 flex py-3 border-b text-base">
                    <div class="w-20 text-gray-500">{{item.time}}</div>
                    <div class="w-12">
                        <PlayIcon v-if="item.icon === 'play'" class=" text-gray-300 w-8 h-8" />
                        <StopIcon v-if="item.icon === 'stop'" class=" text-gray-300 w-8 h-8" />
                        <ChipIcon v-if="item.icon === 'create' || item.icon === 'delete'" class=" text-gray-300 w-8 h-8" />
                        <UserIcon v-if="item.icon === 'user'" class=" text-gray-300 w-8 h-8" />
                        <PencilIcon v-if="item.icon === 'pencil'" class=" text-gray-300 w-8 h-8" />
                        <LogoutIcon v-if="item.icon === 'logout'" class=" text-gray-300 w-8 h-8" />
                    </div>
                    <div class="flex-grow flex flex-col">
                        <div>{{item.title}}</div>
                        <div class="text-sm text-gray-500">{{item.username}}</div>
                        <div class="text-sm text-gray-500">{{item.body}}</div>
                    </div>
                </div>
            </li>
            <li v-if="nextCursor" class="px-8 py-4">
                <a v-if="!loading" @click.stop="loadMore" class="forge-button-inline">Load more...</a>
                <div class="text-gray-500" v-else>Loading...</div>
            </li>
        </ul>
    </template>
</template>

<script>
import { LogoutIcon, ExclamationCircleIcon, PlayIcon, StopIcon, DotsCircleHorizontalIcon, SupportIcon, ChipIcon, UserIcon, PencilIcon } from '@heroicons/vue/outline'

const eventDescriptions = {
    "project.created": "Project created",
    "project.deleted": "Project deleted",
    "project.stopped": "Project stopped",
    "project.started": "Project started",
    "auth.login": "${user} logged in",
    "auth.login.revoke": "${user} logged out",
    "flows.set": "Flows updated",

    // Project Log
    "user.invited": "User invited",
    "user.uninvited": "User uninvited",
    "user.invite.accept": "${user} accepted invitation",
    "user.invite.reject": "${user} declined invitation"

}

const eventIcons = {
    "project.started": "play",
    "project.stopped": "stop",
    "project.created": "create",
    "project.deleted": "create",
    "auth.login": "user",
    "auth.login.revoke": "logout",
    "flows.set": "pencil"
}

export default {
    name: 'AuditLog',
    props:[ "entity", "loadItems" ],
    watch: {
        entity: 'fetchData',
    },
    data() {
        return {
            nextCursor: null,
            logEntries: [],
            loading: false,
        }
    },
    mounted() {
        this.fetchData()
    },
    methods: {
        loadMore: async function() {
            this.loading = true;
            const result = await this.loadItems(this.entity.id, this.nextCursor);
            this.nextCursor = result.meta.next_cursor;
            this.logEntries = this.formatResults(this.logEntries.concat(result.log))
            this.loading = false;
        },
        formatResults: function(log) {
            let lastDate = null;
            return log.map(entry => {
                if (!entry.time) {
                    const date = new Date(entry.createdAt);
                    const thisDate = date.toDateString();
                    if (thisDate !== lastDate) {
                        entry.date = date.toDateString();
                        lastDate = thisDate
                    }
                    entry.time = date.toLocaleTimeString();
                    entry.icon = eventIcons[entry.event] || null
                    entry.title = eventDescriptions[entry.event] || entry.event
                    entry.title = entry.title.replace(/\${user}/g,entry.username)

                } else if (entry.date) {
                    lastDate = entry.date;
                }
                return entry
            })
        },
        fetchData: async function(newVal) {
            if (this.entity && this.entity.id) {
                const result = await this.loadItems(this.entity.id);
                this.logEntries = this.formatResults(result.log)
                this.nextCursor = result.meta.next_cursor;
            }
        }
    },
    components: {
        ExclamationCircleIcon,
        PlayIcon,
        StopIcon,
        DotsCircleHorizontalIcon,
        SupportIcon,
        ChipIcon,
        UserIcon,
        PencilIcon,
        LogoutIcon
    }
}
</script>
