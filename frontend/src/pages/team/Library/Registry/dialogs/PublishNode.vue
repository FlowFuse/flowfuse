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
                    These commands should be run wherever you store your codebase for your custom node package.
                </p>
                <p class="mt-2">
                    Publishing to this registry, will make your package available to all of your Node-RED instances in FlowFuse.
                </p>
                <details class="mt-4" open="true">
                    <summary class="mt-6 cursor-pointer mb-2 font-bold">Login to Registry</summary>
                    <div>
                        <CodeSnippet>{{ commands.login }}</CodeSnippet>
                        <CopySnippet :snippet="commands.login" />
                    </div>
                </details>
                <details class="mt-4" open="true">
                    <summary class="mt-6 cursor-pointer mb-2 font-bold">Credentials</summary>
                    <div>
                        <p class="mb-3">
                            You will be prompted to insert a <b>username</b> and <b>password</b>.
                            You can re-use the credentials you have previously used, or regenerate credentials now.
                        </p>
                        <ff-button kind="secondary" @click="generateCreds">Generate New Credentials</ff-button>
                        <div v-if="loading.credentials" class="text-center p-2 mt-2 bg-gray-100 rounded text-gray-400 border-gray-300">
                            Generating New Credentials...
                        </div>
                        <div v-else-if="credentials.username && credentials.token" class="mt-2">
                            <div>
                                <label class="text-sm mb-1 font-bold">username:</label>
                                <CodeSnippet>{{ credentials.username }}</CodeSnippet>
                                <CopySnippet :snippet="credentials.username" />
                            </div>
                            <div>
                                <label class="text-sm mb-1 font-bold">token:</label>
                                <CodeSnippet>{{ credentials.token }}</CodeSnippet>
                                <CopySnippet :snippet="credentials.token" />
                            </div>
                            <p class="text-gray-600 italic text-sm">
                                Note: These credentials are only shown this one time. Make sure to store them securely for future use.
                            </p>
                        </div>
                    </div>
                </details>
                <details class="mt-4" open="true">
                    <summary class="mt-6 cursor-pointer mb-2 font-bold">Publish Package</summary>
                    <div>
                        <p class="mb-2">Make sure that the package name is scoped to your Team's ID:</p>
                        <code class="text-sm block text-gray-500 p-2 bg-gray-50">"name": "@{{ team.id }}/my-package-name"</code>
                        <p class="mt-2 mb-2">Then run this command to publish your package when it is ready:</p>
                        <CodeSnippet>{{ commands.publish }}</CodeSnippet>
                        <CopySnippet :snippet="commands.publish" />
                    </div>
                </details>
                <p>For more detailed instructions you can view the documentation <a href="https://flowfuse.com/docs">here</a>.</p>
            </div>
        </template>
    </ff-dialog>
</template>

<script>
import { mapState } from 'vuex'

import TeamAPI from '../../../../../api/team.js'
import CodeSnippet from '../../../../../components/CodeSnippet.vue'
import CopySnippet from '../../../../../components/CopySnippet.vue'
import Alerts from '../../../../instance/Settings/Alerts.vue'

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
        ...mapState('account', ['settings', 'team']),
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
                this.credentials.username = creds.data.username
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
