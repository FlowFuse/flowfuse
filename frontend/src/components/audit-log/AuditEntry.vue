<template>
    <div class="ff-audit-entry py-1 lg:py-3 border-b text-base gap-4">
        <!-- Time -->
        <div class="ff-audit-entry-time">{{ entry.time }}</div>

        <!-- Icon -->
        <div class="ff-audit-entry-info flex items-center gap-4 lg:ml-3">
            <div class="ff-audit-entry-icon text-center">
                <AuditEntryIcon v-if="entry.body?.error" event="error" />
                <AuditEntryIcon v-else :event="entry.event" />
            </div>
            <!-- Event -->
            <div class="ff-audit-entry-description flex-1">
                <AuditEntryVerbose :entry="entry" />
            </div>
            <div v-if="!disableAssociations" class="lg:w-36">
                <template v-if="association && entry.scope.type === 'device'">
                    <router-link class="flex content-center" :to="{ name: 'Device', params: { id: entry.scope.id } }"><CpuChipIcon class="ff-icon relative invisible lg:visible " /> <span class="truncate ml-2 leading-normal!">{{ association.name }}</span></router-link>
                </template>
                <template v-else-if="association && entry.scope.type === 'project'">
                    <router-link class="flex content-center" :to="{ name: 'Instance', params: { id: entry.scope.id } }"><ProjectsIcon class="ff-icon relative invisible lg:visible" /> <span class="truncate ml-2 leading-normal!">{{ association.name }}</span></router-link>
                </template>
                <template v-else-if="association && entry.scope.type === 'application'">
                    <router-link class="flex content-center" :to="{ name: 'Application', params: { id: entry.scope.id }}"><RectangleGroupIcon class="ff-icon relative invisible lg:visible" /> <span class="truncate ml-2 leading-normal!">{{ association.name }}</span></router-link>
                </template>
                <template v-else-if="entry.scope.type === 'team'">
                    <router-link class="flex content-center" :to="'#'"><UserGroupIcon class="ff-icon relative invisible lg:visible" /> <span class="truncate ml-2 leading-normal!">This Team</span></router-link>
                </template>
            </div>
        </div>
        <!-- User/Trigger -->
        <div v-if="entry.trigger.name !== 'unknown'" class="ff-audit-entry-trigger lg:w-36 flex items-center flex-nowrap">
            <span class="flex-1 text-right">{{ entry.trigger.name }}</span>
            <span v-if="sourceIcon" v-ff-tooltip:left="sourceLabel" class="flex-0 cursor-help"><component :is="sourceIcon" class="ff-icon-sm ml-1" /></span>
        </div>
        <div v-else class="ff-audit-entry-trigger lg:w-36">
            &nbsp;
        </div>
    </div>
</template>

<script>

import { CommandLineIcon, CpuChipIcon, RectangleGroupIcon, SparklesIcon, UserGroupIcon } from '@heroicons/vue/24/outline'

import ProjectsIcon from '../../components/icons/Projects.js'

import AuditEntryIcon from './AuditEntryIcon.vue'
import AuditEntryVerbose from './AuditEntryVerbose.vue'

export default {
    name: 'AuditLogEntry',
    props: {
        entry: {
            required: true,
            type: Object
        },
        association: {
            type: Object,
            default: () => {}
        },
        disableAssociations: {
            type: Boolean,
            default: false
        }
    },
    components: {
        AuditEntryIcon,
        AuditEntryVerbose,
        ProjectsIcon,
        CommandLineIcon,
        CpuChipIcon,
        RectangleGroupIcon,
        SparklesIcon,
        UserGroupIcon
    },
    computed: {
        sourceIcon () {
            if (!this.entry.source) {
                return null
            }
            if (this.entry.source.startsWith('mcp')) {
                return SparklesIcon
            }
            if (this.entry.source === 'api') {
                return CommandLineIcon
            }
            return null
        },
        sourceLabel () {
            const toolName = this.entry.body?.sourceContext?.toolName
            if (this.entry.source === 'mcp:expert') {
                return toolName ? `via Expert (Tool name: ${toolName})` : 'via Expert'
            }
            if (this.entry.source === 'mcp') {
                return toolName ? `via MCP (Tool name: ${toolName})` : 'via MCP'
            }
            if (this.entry.source === 'api') {
                return 'via API'
            }
            return ''
        }
    },
    methods: {
        getApplication (association) {
            return association.ownerType === 'application' ? association : null
        },
        getInstance (association) {
            return association.ownerType === 'instance' ? association : null
        }
    }
}
</script>
