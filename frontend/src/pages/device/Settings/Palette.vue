<template>
    <div v-if="device.ownerType == 'application'">
        <form class="space-y-6 max-w-2xl" @submit.prevent>
            <FormHeading>
                <template #default>
                    Node Catalogues
                </template>
            </FormHeading>
            <div class="flex flex-col sm:flex-row" />
            <div class="w-full flex flex-col sm:flex-row">
                <div class="w-full sm:mr-8 space-y-2">
                    <div class="w-full flex items-center">
                        <div class="flex-grow" :class="{'opacity-20': !defaultEnabled}">{{ defaultCatalogue }}</div>
                        <!-- Default is enabled, allow for removal -->
                        <ff-button v-if="!defaultEnabled" v-ff-tooltip:left="'Restore Default Catalogue'" kind="tertiary" size="small" @click="addDefault()">
                            <template #icon><UndoIcon /></template>
                        </ff-button>
                        <!-- Default is disabled, allow for restoration -->
                        <ff-button v-else kind="tertiary" size="small" :disabled="readOnly" @click="removeURL(defaultCatalogue)">
                            <template #icon><XIcon /></template>
                        </ff-button>
                    </div>
                    <div v-for="(u, index) in thirdPartyUrls" :key="index" class="w-full flex items-center">
                        <div class="flex-grow">{{ u }}</div>
                        <ff-button kind="tertiary" size="small" :disabled="readOnly" @click="removeURL(u)">
                            <template #icon><XIcon /></template>
                        </ff-button>
                    </div>
                    <FormRow v-model="url" class="w-full sm:mr-8" :error="error" containerClass="none" appendClass="ml-2 relative">
                        <template #append>
                            <ff-button kind="secondary" size="small" @click="addURL()">
                                <template #icon>
                                    <PlusSmIcon />
                                </template>
                            </ff-button>
                        </template>
                    </FormRow>
                </div>
            </div>
            <FormHeading>
                <template #default>
                    NPM configuration file
                </template>
            </FormHeading>
            <div class="flex flex-col sm:flex-row">
                <div class="space-y-4 w-full sm:mr-8">
                    <FormRow containerClass="none">
                        <template #input><textarea v-model="npmrc" class="font-mono w-full" placeholder=".npmrc" rows="8" /></template>
                    </FormRow>
                </div>
            </div>
            <ff-button size="small" :disabled="!changed" @click="save">Save Settings</ff-button>
        </form>
    </div>
    <div v-else>
        Only available to Application bound instances, Instance bound Devices will inherit from the Instance.
    </div>
</template>

<script>
import { PlusSmIcon, XIcon } from '@heroicons/vue/outline'

import { mapState } from 'vuex'

import deviceApi from '../../../api/devices.js'
import FormHeading from '../../../components/FormHeading.vue'
import FormRow from '../../../components/FormRow.vue'
import UndoIcon from '../../../components/icons/Undo.js'
import permissionsMixin from '../../../mixins/Permissions.js'
import alerts from '../../../services/alerts.js'

export default {
    name: 'DeviceSettingsPalette',
    components: {
        FormHeading,
        FormRow,
        PlusSmIcon,
        UndoIcon,
        XIcon
    },
    mixins: [permissionsMixin],
    props: {
        device: {
            type: Object,
            required: true
        }
    },
    emits: ['device-updated'],
    data () {
        return {
            readOnly: false,
            defaultCatalogue: 'https://catalogue.nodered.org/catalogue.json',
            urls: [],
            url: '',
            npmrc: '',
            error: '',
            initial: {
                urls: [],
                npmrc: ''
            }
        }
    },
    computed: {
        ...mapState('account', ['teamMembership']),
        defaultEnabled () {
            return this.urls.includes(this.defaultCatalogue)
        },
        thirdPartyUrls () {
            // whether or not this Template has any third party catalogues enabled
            return this.urls.filter(url => url !== this.defaultCatalogue)
        },
        changed () {
            const changed = this.npmrc !== this.initial.npmrc || (
                this.initial.urls.length !== this.urls.length ||
                this.initial.urls.every((v, i) => v !== this.urls[i])
            )
            return changed
        }
    },
    mounted () {
        this.getSettings()
    },
    methods: {
        getSettings: async function () {
            if (this.device) {
                const settings = await deviceApi.getSettings(this.device.id)
                if (settings.palette?.catalogues) {
                    this.urls = settings.palette.catalogues
                    this.initial.urls.push(...settings.palette.catalogues)
                } else {
                    this.urls = [this.defaultCatalogue]
                    this.initial.urls = [this.defaultCatalogue]
                }
                if (settings.palette?.npmrc) {
                    this.npmrc = settings.palette.npmrc
                    this.initial.npmrc = `${settings.palette.npmrc}`
                }
            }
        },
        save: async function () {
            const settings = await deviceApi.getSettings(this.device.id)
            settings.palette = {
                catalogues: this.urls,
                npmrc: this.npmrc ? this.npmrc : undefined
            }
            deviceApi.updateSettings(this.device.id, settings)
            this.$emit('device-updated')
            alerts.emit('Device settings successfully updated.', 'confirmation', 6000)
            this.initial.urls = []
            this.initial.urls.push(...this.urls)
            this.initial.npmrc = `${this.npmrc}`
        },
        addURL () {
            const newURL = this.url.trim()
            if (newURL) {
                try {
                    // eslint-disable-next-line no-new
                    new URL(newURL)
                } catch (err) {
                    this.error = 'Invalid URL'
                    return
                }
                if (!this.urls.includes(newURL)) {
                    this.urls.push(newURL)
                    this.url = ''
                    this.error = ''
                } else {
                    this.error = 'Catalogue already present'
                }
            }
        },
        removeURL (url) {
            const index = this.urls.indexOf(url)
            this.urls.splice(index, 1)
        },
        addDefault () {
            if (this.urls.indexOf(this.defaultCatalogue)) {
                this.urls.unshift(this.defaultCatalogue)
            }
        }
    }
}
</script>
