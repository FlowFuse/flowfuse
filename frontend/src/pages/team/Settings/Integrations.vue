<template>
    <SectionTopMenu hero="Git Version Control" help-header="Git Version Control" info="A list of access tokens that can be used in Pipelines to connect your instances with git repositories.">
        <template #helptext>
            <p>Pipelines can be created to push snapshots to a connected Git repository. Currently, only GitHub.com hosted repositories are supported.</p>
            <p>Here you can manage the tokens used by your pipelines to access the repositories.</p>
        </template>
    </SectionTopMenu>

    <div class="space-y-6">
        <EmptyState
            v-if="tokens?.size === 0 || !features.gitIntegration || !featuresCheck.isGitIntegrationFeatureEnabled"
            :feature-unavailable="!features.gitIntegration"
            :feature-unavailable-to-team="!featuresCheck.isGitIntegrationFeatureEnabled"
        >
            <template #img>
                <img src="../../../images/empty-states/instance-snapshots.png" alt="logo">
            </template>
            <template #header>
                <span>Git Integration</span>
            </template>
            <template #message>
                <p>Pipelines can be created to push snapshots to a connected Git repository. Currently, only GitHub.com hosted repositories are supported.</p>
                <p>Here you can manage the tokens used by your pipelines to access the repositories.</p>
                <template v-if="featuresCheck.isGitIntegrationFeatureEnabled">
                    <p>To get started, create a GitHub Personal Access Token and add it here. You can then create Git Repository pipeline stages.</p>
                    <ff-button
                        v-if="addEnabled"
                        class="font-normal"
                        data-action="add-git-token"
                        kind="primary"
                        @click="showCreateTokenDialog"
                    >
                        <template #icon-left>
                            <PlusSmIcon />
                        </template>
                        Add Token
                    </ff-button>
                </template>
            </template>
        </EmptyState>
        <ff-loading v-else-if="loading" message="Loading Tokens..." />
        <ff-loading v-else-if="creatingToken" message="Creating Token..." />
        <ff-loading v-else-if="deletingItem" message="Deleting Token..." />
        <template v-else>
            <ff-data-table
                data-el="git-tokens"
                :columns="columns"
                :rows="Array.from(tokens?.values())"
                :show-search="true"
                search-placeholder="Search Tokens..."
                :show-load-more="!!nextCursor"
                @load-more="loadMore"
            >
                <template #actions>
                    <ff-button
                        v-if="addEnabled"
                        class="font-normal"
                        data-action="add-git-token"
                        kind="primary"
                        @click="showCreateTokenDialog"
                    >
                        <template #icon-left>
                            <PlusSmIcon />
                        </template>
                        Add Token
                    </ff-button>
                </template>
                <template v-if="editEnabled || deleteEnabled" #context-menu="{row}">
                    <!-- <ff-list-item :disabled="!editEnabled" label="Edit Details" @click="menuAction('edit', row.id)" /> -->
                    <ff-list-item :disabled="!deleteEnabled" kind="danger" label="Delete Token" @click="menuAction('delete', row.id)" />
                </template>
                <template v-if="tokens.size === 0" #table>
                    <div class="ff-no-data ff-no-data-large">
                        You don't have any tokens yet
                    </div>
                </template>
            </ff-data-table>
        </template>
    </div>
    <CreateGitTokenDialog ref="createGitTokenDialog" :team="team" @token-creating="tokenCreating" @token-created="tokenCreated" />
</template>

<script>
import { PlusSmIcon } from '@heroicons/vue/outline'
import { mapGetters, mapState } from 'vuex'

import teamApi from '../../../api/team.js'
import EmptyState from '../../../components/EmptyState.vue'
import SectionTopMenu from '../../../components/SectionTopMenu.vue'
import permissionsMixin from '../../../mixins/Permissions.js'
import Alerts from '../../../services/alerts.js'
import Dialog from '../../../services/dialog.js'

import CreateGitTokenDialog from './dialogs/CreateGitTokenDialog.vue'

export default {
    name: 'TeamIntegrations',
    components: {
        CreateGitTokenDialog,
        SectionTopMenu,
        PlusSmIcon,
        EmptyState
    },
    mixins: [permissionsMixin],
    data () {
        return {
            loading: true,
            creatingToken: false,
            deletingItem: false,
            tokens: new Map(),
            nextCursor: null
        }
    },
    computed: {
        ...mapState('account', ['features']),
        ...mapGetters('account', ['featuresCheck']),
        addEnabled: function () {
            return this.hasPermission('team:git:tokens:create')
        },
        editEnabled: function () {
            return this.hasPermission('team:git:tokens:edit')
        },
        deleteEnabled: function () {
            return this.hasPermission('team:git:tokens:delete')
        },
        columns: function () {
            return [
                { label: 'Token Name', key: 'name', sortable: true }
            ]
        }
    },
    watch: {
        team: 'fetchData'
    },
    async mounted () {
        await this.fetchData()
        this.loading = false
    },
    methods: {
        async fetchData (nextCursor = null) {
            // get the tokens - skipping pagination support for now
            const data = await teamApi.getGitTokens(this.team.id, nextCursor)
            if (!nextCursor) {
                this.tokens = new Map()
            }
            data.tokens.forEach(token => {
                this.updateTokenCache(token)
            })
            this.nextCursor = data.meta.next_cursor
        },
        async loadMore () {
            await this.fetchData(this.nextCursor)
        },
        showCreateTokenDialog () {
            this.$refs.createGitTokenDialog.show()
        },
        tokenCreating () {
            this.creatingToken = true
        },
        async tokenCreated (token) {
            this.creatingToken = false
            if (token) {
                this.updateTokenCache(token)
            }
        },
        tokenUpdated (token) {
            this.updateTokenCache(token)
        },
        updateTokenCache (token) {
            this.tokens.set(token.id, token)
        },
        menuAction (action, tokenId) {
            const token = this.tokens.get(tokenId)
            if (action === 'edit') {
                this.showEditDialog(token)
            } else if (action === 'delete') {
                Dialog.show({
                    header: 'Delete Git Token',
                    kind: 'danger',
                    text: 'Are you sure you want to delete this token? Once deleted, it can no longer be used to connect pipelines to your Git repository.',
                    confirmLabel: 'Delete'
                }, async () => {
                    this.deletingItem = true
                    try {
                        await teamApi.deleteGitToken(this.team.id, token.id)
                        Alerts.emit('Successfully deleted the token', 'confirmation')
                        this.tokens.delete(token.id)
                    } catch (err) {
                        Alerts.emit('Failed to delete token: ' + err.toString(), 'warning', 7500)
                    } finally {
                        this.deletingItem = false
                    }
                })
            }
        }
    }
}
</script>
