<template>
    <div class="ff-admin-audit">
        <div>
            <SectionTopMenu hero="Project Activity" info="Recorded events that have taken place in Project.">
            </SectionTopMenu>
            <AuditLog :entries="entries" />
        </div>
        <div>
            <SectionTopMenu hero="Filters" />
            <FormHeading class="mt-4">Search:</FormHeading>
            <ff-text-input v-model="auditFilters.string" placeholder="Search Activity...">
                <template v-slot:icon><SearchIcon/></template>
            </ff-text-input>
            <FormHeading class="mt-4">User:</FormHeading>
            <div>
                <ff-dropdown class="w-full" v-model="auditFilters.user">
                    <ff-dropdown-option label="Not Specified" :value="undefined"></ff-dropdown-option>
                    <ff-dropdown-option v-for="user in auditFilters.users" :key="user.username"
                                        :label="`${user.name} (${user.username})`" :value="user.username"></ff-dropdown-option>
                </ff-dropdown>
            </div>
        </div>
    </div>
</template>

<script>
import { mapState } from 'vuex'
import { SearchIcon } from '@heroicons/vue/outline'

import TeamAPI from '@/api/team'
import ProjectAPI from '@/api/project'

import AuditLog from '@/components/audit-log/AuditLog'
import SectionTopMenu from '../../components/SectionTopMenu.vue'
import FormHeading from '@/components/FormHeading'

let timer = null

export default {
    name: 'ProjectAuditLog',
    props: ['project', 'is-visiting-admin'],
    emits: ['project-start', 'project-delete', 'project-suspend', 'project-restart', 'projectUpdated'],
    computed: {
        ...mapState('account', ['team'])
    },
    data () {
        return {
            loading: true,
            entries: null,
            auditFilters: {
                string: '',
                user: null,
                users: []
            }
        }
    },
    watch: {
        project: function () {
            this.loadLog()
        },
        'auditFilters.string': function () {
            if (timer) {
                clearTimeout(timer)
            }
            timer = setTimeout(() => {
                this.loadLog()
            }, 300)
        },
        'auditFilters.user': function () {
            this.loadLog()
        }
    },
    methods: {
        loadItems: async function (projectId, cursor) {
            if (projectId) {
                const params = new URLSearchParams()
                if (this.auditFilters.string) {
                    params.append('query', this.auditFilters.string)
                }
                if (this.auditFilters.user) {
                    params.append('username', this.auditFilters.user)
                }
                return await ProjectAPI.getProjectAuditLog(projectId, params, cursor, 200)
            }
        },
        async loadLog () {
            const audit = await this.loadItems(this.project.id)
            if (audit) {
                this.entries = audit.log
            }
        },
        loadUsers () {
            TeamAPI.getTeamMembers(this.team.id).then((data) => {
                this.auditFilters.users = data.members
            })
        }
    },
    mounted () {
        this.loadUsers()
        this.loadLog()
    },
    components: {
        AuditLog,
        SectionTopMenu,
        SearchIcon,
        FormHeading
    }
}
</script>
