<template>
    <ff-dialog :open="isOpen" header="Device Credentials">
        <template v-slot:default>
            <form class="space-y-6 mt-2">
                <template v-if="!hasCredentials">
                    <p class="text-sm text-gray-500">
                        Are you sure you want to regenerate credentials for this device?
                    </p>
                    <p class="text-sm text-gray-500">
                        The existing credentials will be reset and the device will not
                        be able to reconnect until it has been given its new credentials.
                    </p>
                </template>
                <template v-if="hasCredentials">
                    <p class="text-sm text-gray-500">
                        To connect your device to the platform, use the following
                        credentials. Make a note of them as this is the only
                        time you will see them.
                    </p>
                    <pre class="overflow-auto text-sm p-4 border rounded bg-gray-800 text-gray-200">{{ this.credentials }}</pre>
                </template>
            </form>
        </template>
        <template v-slot:actions>
            <template v-if="!hasCredentials">
                <ff-button kind="secondary" @click="close()">Cancel</ff-button>
                <ff-button kind="danger" class="ml-4" @click="regenerateCredentials()">Regenerate credentials</ff-button>
            </template>
            <template v-else>
                <ff-button kind="secondary" @click="downloadCredentials()"><template v-slot:icon-left><DocumentDownloadIcon /></template>Download device-{{ this.device.id }}.yml</ff-button>
                <ff-button class="ml-4" @click="close()">Done</ff-button>
            </template>
        </template>
    </ff-dialog>
</template>

<script>
// import devicesApi from '@/api/devices'

import { ref } from 'vue'
import { mapState } from 'vuex'
import deviceApi from '@/api/devices'

import { DocumentDownloadIcon } from '@heroicons/vue/outline'
export default {
    name: 'DeviceCredentialsDialog',
    components: {
        DocumentDownloadIcon
    },
    props: ['team'],
    data () {
        return {
            device: null
        }
    },
    methods: {
        downloadCredentials () {
            const element = document.createElement('a')
            element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(this.credentials))
            element.setAttribute('download', `device-${this.device.id}.yml`)
            element.style.display = 'none'
            document.body.appendChild(element)
            element.click()
            document.body.removeChild(element)
        },
        async regenerateCredentials () {
            const creds = await deviceApi.generateCredentials(this.device.id)
            this.device.credentials = creds
        },
        close () {
            this.isOpen = false
            this.device.credentials = undefined
        }
    },
    computed: {
        ...mapState('account', ['settings']),
        hasCredentials: function () {
            return this.device && this.device.credentials
        },
        credentials: function () {
            if (this.device) {
                return `deviceId: ${this.device.id}
token: ${this.device.credentials.token}
credentialSecret: ${this.device.credentials.credentialSecret}
forgeURL: ${this.settings.base_url}
brokerUsername: ${this.device.credentials.broker.username}
brokerPassword: ${this.device.credentials.broker.password}
`
            } else {
                return ''
            }
        }
    },
    setup () {
        const isOpen = ref(false)
        return {
            isOpen,
            show (device) {
                this.device = device
                isOpen.value = true
            }
        }
    }
}
</script>
