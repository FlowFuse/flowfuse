<template>
    <SectionTopMenu :hero="$t('ui.gitVersionControl')" :help-header="$t('ui.gitVersionControl')" :info="$t('ui.aListOfAccessTokensThatCanBeUsedInPipelinesToCon')">
        <template #helptext>
            <p>Pipelines can be created to push snapshots to a connected Git repository — GitHub, Azure DevOps, GitLab, Bitbucket, or any HTTPS Git server.</p>
            <p>{{ $t('ui.hereYouCanManageTheTokensUsedByYourPipelinesToAc') }}</p>
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
                <span>{{ $t('ui.gitIntegration') }}</span>
            </template>
            <template #message>
                <p>Pipelines can be created to push snapshots to a connected Git repository — GitHub, Azure DevOps, GitLab, Bitbucket, or any HTTPS Git server.</p>
                <p>{{ $t('ui.hereYouCanManageTheTokensUsedByYourPipelinesToAc') }}</p>
                <template v-if="featuresCheck.isGitIntegrationFeatureEnabled">
                    <p>{{ $t('ui.toGetStartedCreateAPersonalAccessTokenOnYourGitP') }}</p>
                    <ff-button
                        v-if="addEnabled"
                        class="font-normal"
                        data-action="add-git-token"
                        kind="primary"
                        @click="showCreateTokenDialog"
                    >
                        <template #icon-left>
                            <PlusSmallIcon />
                        </template>
                        {{ $t('ui.addToken') }}
                    </ff-button>
                </template>
            </template>
        </EmptyState>
        <ff-loading v-else-if="loading" :message="$t('ui.loadingTokens')" />
        <ff-loading v-else-if="creatingToken" :message="$t('ui.creatingToken')" />
        <ff-loading v-else-if="deletingItem" :message="$t('ui.deletingToken')" />
        <template v-else>
            <ff-data-table
                data-el="git-tokens"
                :columns="columns"
                :rows="Array.from(tokens?.values())"
                :show-search="true"
                :search-placeholder="$t('ui.searchTokens')"
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
                            <PlusSmallIcon />
                        </template>
                        {{ $t('ui.addToken') }}
                    </ff-button>
                </template>
                <template v-if="editEnabled || deleteEnabled" #context-menu="{row}">
                    <ff-kebab-item :disabled="!deleteEnabled" kind="danger" :label="$t('ui.deleteToken')" @click="menuAction('delete', row.id)" />
                </template>
                <template v-if="tokens.size === 0" #table>
                    <div class="ff-no-data ff-no-data-large">
                        {{ $t('ui.youDonTHaveAnyTokensYet') }}
                    </div>
                </template>
            </ff-data-table>
        </template>
    </div>
    <CreateGitTokenDialog ref="createGitTokenDialog" :team="team" @token-creating="tokenCreating" @token-created="tokenCreated" />
</template>

<script>
import { PlusSmallIcon } from '@heroicons/vue/24/outline'
import { mapState } from 'pinia'

import teamApi from '../../../api/team.js'
import EmptyState from '../../../components/EmptyState.vue'
import SectionTopMenu from '../../../components/SectionTopMenu.vue'
import usePermissions from '../../../composables/Permissions.js'
import { t } from '../../../i18n.js'
import Alerts from '../../../services/alerts.js'
import Dialog from '../../../services/dialog.js'

import CreateGitTokenDialog from './dialogs/CreateGitTokenDialog.vue'

import { useAccountSettingsStore } from '@/stores/account-settings.js'
import { useContextStore } from '@/stores/context.js'

export default {
    name: 'TeamIntegrations',
    components: {
        CreateGitTokenDialog,
        SectionTopMenu,
        PlusSmallIcon,
        EmptyState
    },
    setup () {
        const { hasPermission } = usePermissions()

        return { hasPermission }
    },
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
        ...mapState(useContextStore, ['team']),
        ...mapState(useAccountSettingsStore, ['features', 'featuresCheck']),
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
                { label: t('ui.tokenName'), key: 'name', sortable: true },
                { label: t('ui.type'), key: 'type', sortable: true }
            ]
        }
    },
    watch: {
        team: 'fetchData'
    },
    async mounted () {
        if (this.featuresCheck.isGitIntegrationFeatureEnabled) {
            await this.fetchData()
        }
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
            if (action === 'delete') {
                Dialog.show({
                    header: t('ui.deleteGitToken'),
                    kind: 'danger',
                    text: t('ui.areYouSureYouWantToDeleteThisTokenOnceDeletedItC'),
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
