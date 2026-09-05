<template>
    <ff-dialog
        ref="dialog" :header="'Publish Custom Package'"
        :confirm-label="'Close'"
        :canBeCanceled="false"
        @confirm="clear()"
    >
        <template #default>
            <div>
                <p>
                    {{ $t('ui.theseCommandsShouldBeRunWhereverYouStoreYourCode') }}
                </p>
                <p class="mt-2">
                    {{ $t('ui.publishingToThisRegistryWillMakeYourPackageAvail') }}
                </p>
                <details class="mt-4" open="true">
                    <summary class="mt-6 cursor-pointer mb-2 font-bold">{{ $t('ui.loginToRegistry') }}</summary>
                    <div>
                        <CodeSnippet>{{ commands.login }}</CodeSnippet>
                        <CopySnippet :snippet="commands.login" />
                    </div>
                </details>
                <details class="mt-4" open="true">
                    <summary class="mt-6 cursor-pointer mb-2 font-bold">{{ $t('ui.credentials') }}</summary>
                    <div>
                        <p class="mb-3">
                            {{ $t('ui.youWillBePromptedToInsertA') }} <b>{{ $t('ui.username3') }}</b> {{ $t('ui.and') }} <b>{{ $t('ui.password3') }}</b>{{ $t('ui.youCanReUseTheCredentialsYouHavePreviouslyUsedOr') }}
                        </p>
                        <ff-button kind="secondary" @click="generateCreds">{{ $t('ui.generateNewCredentials') }}</ff-button>
                        <div v-if="loading.credentials" class="text-center p-2 mt-2 bg-gray-100 rounded-sm text-gray-400 border-gray-300">
                            {{ $t('ui.generatingNewCredentials') }}
                        </div>
                        <div v-else-if="credentials.username && credentials.token" class="mt-2">
                            <div>
                                <label class="text-sm mb-1 font-bold">{{ $t('ui.username4') }}</label>
                                <CodeSnippet>{{ credentials.username }}</CodeSnippet>
                                <CopySnippet :snippet="credentials.username" />
                            </div>
                            <div>
                                <label class="text-sm mb-1 font-bold">{{ $t('ui.token3') }}</label>
                                <CodeSnippet>{{ credentials.token }}</CodeSnippet>
                                <CopySnippet :snippet="credentials.token" />
                            </div>
                            <p class="text-gray-600 italic text-sm">
                                {{ $t('ui.noteTheseCredentialsAreOnlyShownThisOneTimeMakeS') }}
                            </p>
                        </div>
                    </div>
                </details>
                <details class="mt-4" open="true">
                    <summary class="mt-6 cursor-pointer mb-2 font-bold">{{ $t('ui.publishPackage') }}</summary>
                    <div>
                        <p class="mb-2">{{ $t('ui.makeSureThatThePackageNameIsScopedTo') }} <code>{{ $t('ui.flowfuse') }}</code> {{ $t('ui.andYourTeamSId') }}</p>
                        <code class="text-sm block text-gray-500 p-2 bg-gray-50">{{ $t('ui.nameFlowfuseP0MyPackageName', { p0: team.id }) }}</code>
                        <p class="mt-2 mb-2">{{ $t('ui.thenRunThisCommandToPublishYourPackageWhenItIsRe') }}</p>
                        <CodeSnippet>{{ commands.publish }}</CodeSnippet>
                        <CopySnippet :snippet="commands.publish" />
                    </div>
                </details>
                <p>{{ $t('ui.forMoreDetailedInstructionsYouCanViewTheDocument') }} <a href="https://flowfuse.com/docs">{{ $t('ui.here') }}</a>.</p>
            </div>
        </template>
    </ff-dialog>
</template>

<script>
import { mapState } from 'pinia'

import TeamAPI from '../../../../../api/team.js'
import CodeSnippet from '../../../../../components/CodeSnippet.vue'
import CopySnippet from '../../../../../components/CopySnippet.vue'
import Alerts from '../../../../instance/Settings/Alerts.vue'

import { useAccountSettingsStore } from '@/stores/account-settings.js'
import { useContextStore } from '@/stores/context.js'

export default {
    name: 'PublishNodeDialog',
    components: {
        CopySnippet,
        CodeSnippet
    },
    setup () {
        return {
            show () {
                this.$refs.dialog.show()
            }
        }
    },
    data () {
        return {
            credentials: {
                username: '',
                token: ''
            },
            loading: {
                credentials: false
            }
        }
    },
    computed: {
        ...mapState(useContextStore, ['team']),
        ...mapState(useAccountSettingsStore, ['settings']),
        registryHost () {
            return this.settings ? this.settings['team:npm:registry'] : ''
        },
        commands () {
            return {
                login: `npm login --registry ${this.registryHost}`,
                publish: `npm publish --registry ${this.registryHost}`
            }
        }
    },
    async mounted () {

    },
    methods: {
        clear () {
            this.credentials = {
                username: '',
                token: ''
            }
        },
        async generateCreds () {
            this.loading.credentials = true
            try {
                const creds = await TeamAPI.generateRegistryUserToken(this.team.id)
                this.credentials.username = creds.data.username.toLowerCase()
                this.credentials.token = creds.data.token
            } catch (err) {
                console.error(err)
                Alerts.emit('Failed to generate credentials.', 'error')
            }
            this.loading.credentials = false
        }
    }
}
</script>
