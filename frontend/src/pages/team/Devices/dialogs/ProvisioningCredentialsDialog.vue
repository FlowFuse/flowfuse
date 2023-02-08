<template>
    <ff-dialog ref="dialog" header="Device Provisioning Credentials">
        <template v-slot:default>
            <form class="space-y-6 mt-2">
                <p class="text-sm text-gray-500">
                    To auto provision your devices on the platform, use the following
                    credentials. Make a note of them as this is the only
                    time you will see them.
                </p>
                <pre class="overflow-auto text-sm p-4 border rounded bg-gray-800 text-gray-200">{{ this.credentials }}</pre>
            </form>
        </template>
        <template v-slot:actions>
            <ff-button kind="secondary" @click="downloadCredentials()"><template v-slot:icon-left><DocumentDownloadIcon /></template>Download device.yml</ff-button>
            <ff-button class="ml-4" @click="close()">Done</ff-button>
        </template>
    </ff-dialog>
</template>

<script>

import { mapState } from 'vuex'

import { DocumentDownloadIcon } from '@heroicons/vue/outline'
export default {
    name: 'ProvisioningCredentialsDialog',
    components: {
        DocumentDownloadIcon
    },
    props: ['team'],
    data () {
        return {
            token: null
        }
    },
    methods: {
        downloadCredentials () {
            const element = document.createElement('a')
            element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(this.credentials))
            element.setAttribute('download', 'device.yml')
            element.style.display = 'none'
            document.body.appendChild(element)
            element.click()
            document.body.removeChild(element)
        },
        close () {
            this.$refs.dialog.close()
            this.token = undefined
        }
    },
    computed: {
        ...mapState('account', ['settings']),
        hasCredentials: function () {
            return !!this.token?.token
        },
        credentials: function () {
            const result = ['### PROVISIONING TOKEN ###']
            if (this.token) {
                if (this.token.name) {
                    result.push(`provisioningName: ${this.token.name}`)
                }
                result.push(`provisioningTeam: ${this.token.team}`)
                result.push(`provisioningToken: ${this.token.token}`)
            }
            result.push(`forgeURL: ${this.settings.base_url}`)
            return result.join('\n')
        }
    },
    setup () {
        return {
            show (token) {
                this.token = token
                this.$refs.dialog.show()
            }
        }
    }
}
</script>
