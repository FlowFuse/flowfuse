<template>
    <ff-dialog
        ref="dialog"
        header="Add Git Personal Access Token"
        confirm-label="Add"
        :disable-primary="!formValid"
        @confirm="confirm()"
    >
        <template #default>
            <CascadingSelector v-model="input.type" :node="providerTree" />

            <form class="space-y-6 mt-4 mb-2">
                <FormRow v-model="input.name" data-form="token-name" :error="errors.name">Name</FormRow>
                <FormRow v-model="input.token" data-form="token-value">Token</FormRow>
                <FormRow v-if="input.type === 'generic'" v-model="input.username" data-form="username">Username</FormRow>
                <FormRow v-if="input.type === 'generic'" data-form="ca-certificate">
                    CA Certificate (optional)
                    <template #description>Only needed for self-hosted servers that use a private certificate authority.</template>
                    <template #input><textarea v-model="input.caCertificate" class="font-mono w-full" rows="6" placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----" /></template>
                </FormRow>
            </form>
        </template>
    </ff-dialog>
</template>

<script>
import { markRaw } from 'vue'

import AzureInstructions from './components/CreateGitTokenDialog/AzureInstructions.vue'
import GenericInstructions from './components/CreateGitTokenDialog/GenericInstructions.vue'
import GitHubInstructions from './components/CreateGitTokenDialog/GitHubInstructions.vue'

import teamApi from '@/api/team.js'

import FormRow from '@/components/FormRow.vue'
import AzureIcon from '@/components/icons/Azure.js'
import GitIcon from '@/components/icons/Git.js'
import GitHubIcon from '@/components/icons/GitHub.js'
import { CascadingSelector, OptionTileSelector } from '@/components/variant-selector/index.js'
import alerts from '@/services/alerts.js'

export default {
    name: 'CreateGitTokenDialog',
    components: {
        CascadingSelector,
        FormRow
    },
    props: {
        team: {
            required: true,
            type: Object
        }
    },
    emits: ['token-creating', 'token-created'],
    setup () {
        return {
            async show () {
                this.errors = {}
                this.input.name = ''
                this.input.token = ''
                this.input.type = 'github'
                this.input.username = ''
                this.input.caCertificate = ''
                this.$refs.dialog.show()
            }
        }
    },
    data () {
        return {
            input: {
                name: '',
                token: '',
                type: 'github',
                username: '',
                caCertificate: ''
            },
            errors: {},
            providerTree: {
                id: 'root',
                component: markRaw(OptionTileSelector),
                props: { columns: 3 },
                children: [
                    {
                        id: 'github',
                        component: markRaw(GitHubInstructions),
                        props: { label: 'GitHub', icon: markRaw(GitHubIcon) }
                    },
                    {
                        id: 'azure',
                        component: markRaw(AzureInstructions),
                        props: { label: 'Azure DevOps', icon: markRaw(AzureIcon) }
                    },
                    {
                        id: 'generic',
                        component: markRaw(GenericInstructions),
                        props: { label: 'Other', icon: markRaw(GitIcon) }
                    }
                ]
            }
        }
    },
    computed: {
        formValid () {
            const trimmed = this.input.name.trim()
            return trimmed.length > 0
        }
    },
    watch: {
        'input.type' () {
            this.input.name = ''
            this.input.token = ''
            this.input.username = ''
            this.input.caCertificate = ''
            this.errors = {}
        }
    },
    methods: {
        confirm () {
            const opts = {
                name: this.input.name.trim(),
                token: this.input.token,
                team: this.team.id,
                type: this.input.type,
                username: this.input.username,
                caCertificate: this.input.caCertificate
            }
            this.$emit('token-creating')
            teamApi.createGitToken(opts.team, opts).then((response) => {
                this.$emit('token-created', response)
                alerts.emit('Git Token successfully added.', 'confirmation')
            }).catch(err => {
                this.$emit('token-created', null)
                console.error(err.response.data)
                if (err.response.data) {
                    if (/name/.test(err.response.data.error)) {
                        this.errors.name = err.response.data.error
                    } else {
                        alerts.emit('Failed to add git token: ' + err.response.data.error, 'warning', 7500)
                    }
                }
            })
        }
    }
}
</script>
