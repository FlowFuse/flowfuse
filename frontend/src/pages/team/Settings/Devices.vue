<template>
    <SectionTopMenu hero="Device Provisioning" help-header="Device Provisioning Tokens" info="A list of device provisioning tokens that can be used to auto register devices to a team and, optionally, a project.">
        <template v-slot:helptext>
            <p>FlowForge can be used to manage instances of Node-RED running on remote devices.</p>
            <p>Each device must run the <a href="https://flowforge.com/docs/user/devices/" target="_blank">FlowForge Device Agent</a>, which connects back to the platform to receive updates.</p>
            <p>Provisioning tokens can be created to allow devices to automatically connect to a team, application and instance without having to register them first.</p>
        </template>
    </SectionTopMenu>

    <div class="space-y-6">
        <ff-loading v-if="loading" message="Loading Tokens..." />
        <ff-loading v-else-if="creatingDevice" message="Creating Token..." />
        <ff-loading v-else-if="deletingItem" message="Deleting Token..." />
        <template v-else>
            <template v-if="this.tokens.size === 0">
                <div class="ff-no-data ff-no-data-large">
                    You don't have any tokens yet
                </div>
            </template>
            <template v-if="this.tokens.size > 0">
                <ff-data-table
                    data-el="provisioning-tokens"
                    :columns="columns"
                    :rows="Array.from(this.tokens.values())"
                    :show-search="true"
                    search-placeholder="Search Tokens..."
                    :show-load-more="!!nextCursor"
                    @load-more="loadMore"
                >
                    <template #actions>
                        <ff-button
                            v-if="addEnabled"
                            class="font-normal"
                            data-action="register-device"
                            kind="primary"
                            @click="showCreateTokenDialog"
                        >
                            <template #icon-right>
                                <PlusSmIcon />
                            </template>
                            Add Token
                        </ff-button>
                    </template>
                    <template v-if="editEnabled || deleteEnabled" v-slot:context-menu="{row}">
                        <ff-list-item :disabled="!editEnabled" label="Edit Details" @click="menuAction('edit', row.id)"/>
                        <ff-list-item :disabled="!deleteEnabled" kind="danger" label="Delete Token" @click="menuAction('delete', row.id)" />
                    </template>
                </ff-data-table>
            </template>
        </template>
    </div>
    <CreateProvisioningTokenDialog :team="team" @tokenCreating="tokenCreating" @tokenCreated="tokenCreated" @tokenUpdated="tokenUpdated" ref="CreateProvisioningTokenDialog"/>
    <ProvisioningCredentialsDialog :team="team" ref="provisioningCredentialsDialog" />
</template>

<script>
import { markRaw } from 'vue'
import { KeyIcon, PlusSmIcon } from '@heroicons/vue/outline'
import SectionTopMenu from '@/components/SectionTopMenu'
import permissionsMixin from '@/mixins/Permissions'
import Alerts from '@/services/alerts'
import Dialog from '@/services/dialog'
import teamApi from '@/api/team'

import CreateProvisioningTokenDialog from '../Devices/dialogs/CreateProvisioningTokenDialog.vue'
import ProvisioningCredentialsDialog from '../Devices/dialogs/ProvisioningCredentialsDialog.vue'

const TokenFieldFormatter = {
    template: '<span><span v-if="name">{{name}}</span><span v-else class="italic text-gray-500">unnamed</span></span>',
    props: ['name'],
    components: { KeyIcon }
}

const ProjectFieldFormatter = {
    template: `
        <template v-if="project">
            <router-link :to="{ name: 'Instance', params: { id: project }}">{{projectName}}</router-link>
        </template>
        <template v-else><span class="italic text-gray-500">Don't assign</span></template>`,
    props: ['project', 'projectName']
}

export default {
    name: 'TeamDeviceProvisioningTokens',
    mixins: [permissionsMixin],
    data () {
        return {
            loading: true,
            creatingDevice: false,
            deletingItem: false,
            tokens: new Map(),
            checkInterval: null,
            nextCursor: null,
            projectNames: []
        }
    },
    watch: {
        team: 'fetchData'
    },
    async mounted () {
        await this.fetchData()
        this.loading = false
        this.checkInterval = setTimeout(this.pollForData, 10000)
    },
    unmounted () {
        clearInterval(this.checkInterval)
    },
    methods: {
        async pollForData () {
            try {
                await this.fetchData(null, true) // TODO: Implement pagination
            } finally {
                this.checkInterval = setTimeout(this.pollForData, 10000)
            }
        },
        async fetchData (nextCursor = null, polled = false) {
            // load project names into local cache (TODO: consider moving this to a vuex store for global access)
            this.projectNames = await teamApi.getTeamProjectList(this.team.id)
            // get the tokens
            const data = await teamApi.getTeamDeviceProvisioningTokens(this.team.id, nextCursor)

            // Polling never resets the devices list
            if (!nextCursor && !polled) {
                this.tokens = new Map()
            }
            data.tokens.forEach(token => {
                this.updateTokenCache(token)
            })

            // TODO: Implement pagination
            if (!polled) {
                this.nextCursor = data.meta.next_cursor
            }
        },
        getProjectName (id) {
            const project = this.projectNames?.find(p => p.id === id)
            return project ? project.name : id
        },
        async loadMore () {
            await this.fetchData(this.nextCursor)
        },
        showCreateTokenDialog () {
            this.$refs.CreateProvisioningTokenDialog.show(null, this.project)
        },
        showEditDialog (token) {
            this.$refs.CreateProvisioningTokenDialog.show(token)
        },
        tokenCreating () {
            this.creatingDevice = true
        },
        async tokenCreated (token) {
            this.creatingDevice = false
            if (token) {
                setTimeout(() => {
                    this.$refs.provisioningCredentialsDialog.show(token)
                }, 500)
                this.updateTokenCache(token)
            }
        },
        tokenUpdated (token) {
            this.updateTokenCache(token)
        },
        updateTokenCache (token) {
            token.projectName = this.getProjectName(token.project)
            this.tokens.set(token.id, token)
        },
        menuAction (action, tokenId) {
            const token = this.tokens.get(tokenId)
            if (action === 'edit') {
                this.showEditDialog(token)
            } else if (action === 'delete') {
                Dialog.show({
                    header: 'Delete Provisioning Token',
                    kind: 'danger',
                    text: 'Are you sure you want to delete this provisioning token? Once deleted, it can no longer be used to provision new devices to the team.',
                    confirmLabel: 'Delete'
                }, async () => {
                    this.deletingItem = true
                    try {
                        await teamApi.deleteTeamDeviceProvisioningToken(this.team.id, token.id)
                        Alerts.emit('Successfully deleted the token', 'confirmation')
                        this.tokens.delete(token.id)
                    } catch (err) {
                        Alerts.emit('Failed to delete token: ' + err.toString(), 'warning', 7500)
                    } finally {
                        this.deletingItem = false
                    }
                })
            } else if (action === 'updateCredentials') {
                this.$refs.provisioningCredentialsDialog.show(token)
            }
        }
    },
    computed: {
        addEnabled: function () {
            return this.hasPermission('team:device:provisioning-token:create')
        },
        editEnabled: function () {
            return this.hasPermission('team:device:provisioning-token:edit')
        },
        deleteEnabled: function () {
            return this.hasPermission('team:device:provisioning-token:delete')
        },
        columns: function () {
            return [
                { label: 'Token Name', class: ['w-64'], key: 'name', sortable: true, component: { is: markRaw(TokenFieldFormatter) } },
                { label: 'Auto Assign Project', class: ['w-64'], key: 'project', sortable: true, component: { is: markRaw(ProjectFieldFormatter) } },
                { label: 'Target Snapshot', class: ['w-64'], key: 'targetSnapshot', sortable: true }
            ]
        }
    },
    props: {
        team: {
            required: true
        },
        teamMembership: {
            required: true
        }
    },
    components: {
        CreateProvisioningTokenDialog,
        ProvisioningCredentialsDialog,
        SectionTopMenu,
        PlusSmIcon
    }
}
</script>
