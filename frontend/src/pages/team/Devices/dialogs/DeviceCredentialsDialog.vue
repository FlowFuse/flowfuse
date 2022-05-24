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
                    <FormRow v-model="device.id" type="uneditable">Device ID</FormRow>
                    <FormRow v-model="device.credentials.token" type="uneditable">Access Token</FormRow>
                    <FormRow v-model="device.credentials.credentialSecret" type="uneditable">Credential Secret</FormRow>
                </template>
            </form>
        </template>
        <template v-slot:actions>
            <template v-if="!hasCredentials">
                <ff-button kind="secondary" @click="close()">Cancel</ff-button>
                <ff-button kind="danger" class="ml-4" @click="regenerateCredentials()">Regenerate credentials</ff-button>
            </template>
            <template v-else>
                <ff-button kind="secondary" @click="downloadCredentials()"><template v-slot:icon-left><DocumentDownloadIcon /></template>Download credentials file</ff-button>
                <ff-button class="ml-4" @click="close()">Done</ff-button>
            </template>
        </template>
    </ff-dialog>
</template>

<script>
// import devicesApi from '@/api/devices'

import { ref } from 'vue'
import deviceApi from '@/api/devices'

import FormRow from '@/components/FormRow'
import { DocumentDownloadIcon } from '@heroicons/vue/outline'
export default {
    name: 'DeviceCredentialsDialog',
    components: {
        FormRow,
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
            element.setAttribute('download', `ff-credentials-${this.device.id}.yml`)
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
        hasCredentials: function () {
            return this.device && this.device.credentials
        },
        credentials: function () {
            if (this.device) {
                return `deviceId: ${this.device.id}
token: ${this.device.credentials.token}
credentialSecret: ${this.device.credentials.credentialSecret}
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
