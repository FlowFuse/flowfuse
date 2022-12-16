<template>
    <SectionTopMenu hero="Node-RED Logs" help-header="FlowForge - Node-RED Logs" info="Live logs from your FlowForge instance of Node-RED">
        <template v-slot:helptext>
            <p>This is a raw feed from the running instance of Node-RED on this domain.</p>
            <p>Use this to debug issues if your project will not start correctly.</p>
        </template>
    </SectionTopMenu>
    <ff-loading v-if="loading" message="Loading Logs..." />
    <div v-else-if="project.meta && project.meta.state !== 'suspended'" class="mx-auto text-xs border bg-gray-800 text-gray-200 rounded p-2 font-mono">
        <div v-if="prevCursor" class="flex">
            <a @click="loadPrevious" class=" text-center w-full hover:text-blue-400 cursor-pointer pb-1">Load earlier...</a>
        </div>
        <div v-for="(item, itemIdx) in logEntries" :key="itemIdx" class="flex" :class="'forge-log-entry-level-' + item.level">
            <div class="w-40 flex-shrink-0">{{item.date}}</div>
            <div class="w-20 flex-shrink-0 align-right">[{{item.level}}]</div>
            <div class="flex-grow break-all whitespace-pre-wrap">{{item.msg}}</div>
        </div>
    </div>
    <div v-else class="flex text-gray-500 justify-center italic mb-4 p-8">
        Logs unavailable
    </div>
</template>

<script>
import projectApi from '@/api/project'

import SectionTopMenu from '@/components/SectionTopMenu'

export default {
    name: 'ProjectLogs',
    props: ['project'],
    data () {
        return {
            doneInitialLoad: false,
            loading: true,
            logEntries: [],
            prevCursor: null,
            nextCursor: null,
            checkInterval: null
        }
    },
    watch: {
        project: 'fetchData'
    },
    mounted () {
        if (this.project.meta && this.project.meta.state === 'suspended') {
            this.loading = false
        }
        this.fetchData()
        this.checkInterval = setInterval(() => {
            if (this.project.meta && this.project.meta.state !== 'suspended') {
                this.loadNext()
            } else {
                clearInterval(this.checkInterval)
            }
        }, 5000)
    },
    beforeUnmount () {
        clearInterval(this.checkInterval)
    },
    methods: {
        fetchData: async function () {
            if (this.project.id) {
                if (this.project.meta.state !== 'suspended') {
                    await this.loadItems(this.project.id)
                    this.loading = false
                } else {
                    clearInterval(this.checkInterval)
                }
            }
        },
        loadPrevious: async function () {
            this.loadItems(this.project.id, this.prevCursor)
        },
        loadNext: async function () {
            this.loadItems(this.project.id, this.nextCursor)
        },
        loadItems: async function (projectId, cursor) {
            const entries = await projectApi.getProjectLogs(projectId, cursor)
            if (!cursor) {
                this.logEntries = []
            }
            const toPrepend = []
            if (entries.log.length > 0) {
                entries.log.forEach(l => {
                    const d = new Date(parseInt(l.ts.substring(0, l.ts.length - 4)))
                    l.date = `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`
                    if (typeof l.msg === 'object') {
                        l.msg = JSON.stringify(l.msg)
                    }
                    l.msg = l.msg.replace(/^[\n]*/, '')
                    if (!cursor || cursor[0] !== '-') {
                        this.logEntries.push(l)
                    } else {
                        toPrepend.push(l)
                    }
                })
                if (toPrepend.length > 0) {
                    this.logEntries = toPrepend.concat(this.logEntries)
                }
                if (!cursor || cursor[0] === '-') {
                    this.prevCursor = entries.meta.previous_cursor
                }
                if (!cursor || cursor[0] !== '-') {
                    this.nextCursor = entries.meta.next_cursor
                }
            }
        }
    },
    components: {
        SectionTopMenu
    }
}
</script>
