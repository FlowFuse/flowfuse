<template>
    <ff-page>
        <template #header>
            <ff-page-header title="Certified Nodes" :tabs="sideNavigation" />
        </template>
        <div class="flex-grow">
            <ff-loading v-if="loading" message="Saving Settings..." />
            <FormRow v-model="input['platform:certifiedNodes:npmRegistryURL']" :label="'NPM Registry URL'" :error="errors['platform:certifiedNodes:npmRegistryURL']">
                NPM Registry URL for Certified Nodes
                <template #description>
                    The URL of the NPM registry to use for certified nodes.
                </template>
            </FormRow>
            <FormRow v-model="input['platform:certifiedNodes:token']" :label="'NPM Registry Token'" :error="errors['platform:certifiedNodes:token']">
                NPM Registry Authentication Token
                <template #description>
                    The authentication token for the NPM registry to use for certified nodes.
                </template>
            </FormRow>
            <FormRow v-model="input['platform:certifiedNodes:catalogueURL']" :label="'Node-RED Catalogue URL'" :error="errors['platform:certifiedNodes:catalogueURL']">
                Node-RED Catalogue URL
                <template #description>
                    The URL of the Node-RED catalogue to use for certified nodes.
                </template>
            </FormRow>
            <div class="pt-8">
                <ff-button :disabled="!saveEnabled" data-action="save-settings" @click="saveChanges">Save settings</ff-button>
            </div>
        </div>
    </ff-page>
</template>

<script>
import { mapActions, mapState } from 'vuex'

import settingsApi from '../../../api/settings.js'
import FormHeading from '../../../components/FormHeading.vue'
import FormRow from '../../../components/FormRow.vue'
import Alerts from '../../../services/alerts.js'

const validSettings = [
    'platform:certifiedNodes:npmRegistryURL',
    'platform:certifiedNodes:token',
    'platform:certifiedNodes:catalogueURL',
]

export default {
    name: 'AdminCertifiedNodes',
    components: {
        FormHeading,
        FormRow
    },
    data() {
        return {
            loading: false,
            input: {},
            errors: {
                'platform:certifiedNodes:npmRegistryURL': '',
                'platform:certifiedNodes:token': '',
                'platform:certifiedNodes:catalogueURL': ''
            }
        }
    },
    computed: {
        ...mapState('account', ['features', 'settings']),
        sideNavigation () {
            return []
        },
        isLicensed () {
            return !!this.settings['platform:licensed']
        },
        saveEnabled () {
            let result = false
            if (this.validate()) {
                validSettings.forEach((s) => {
                    result = result || (this.input[s] !== this.settings[s])
                })
            }
            return result
        }
    },
    created () {
        validSettings.forEach(s => {
            this.input[s] = this.settings[s]
        })
    },
    methods: {
        ...mapActions('account', ['refreshSettings']),
        validate () {
            if (this.input['platform:certifiedNodes:npmRegistryURL']) {
                try {
                    new URL(this.input['platform:certifiedNodes:npmRegistryURL'])
                    const url = URL.parse(this.input['platform:certifiedNodes:npmRegistryURL'])
                    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
                        this.errors['platform:certifiedNodes:npmRegistryURL'] = 'Invalid URL'
                        return false
                    } else {
                        this.errors['platform:certifiedNodes:npmRegistryURL'] = ''
                    }
                } catch (e) {
                    console.log(e)
                    this.errors['platform:certifiedNodes:npmRegistryURL'] = 'Invalid URL'
                    return false
                }
            } else {
                this.errors['platform:certifiedNodes:npmRegistryURL'] = ''
            }

            if (this.input['platform:certifiedNodes:catalogueURL']) {
                try {
                    new URL(this.input['platform:certifiedNodes:catalogueURL'])
                    const url = URL.parse(this.input['platform:certifiedNodes:catalogueURL'])
                    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
                        this.errors['platform:certifiedNodes:catalogueURL'] = 'Invalid URL'
                        return false
                    } else {
                        this.errors['platform:certifiedNodes:catalogueURL'] = ''
                    }
                } catch (e) {
                    console.log(e)
                    this.errors['platform:certifiedNodes:catalogueURL'] = 'Invalid URL'
                    return false
                }
            } else {
                this.errors['platform:certifiedNodes:catalogueURL'] = ''
            }

            if (this.input['platform:certifiedNodes:npmRegistryURL'] && 
                this.input['platform:certifiedNodes:catalogueURL'] &&
                !this.input['platform:certifiedNodes:token']) {
                this.errors['platform:certifiedNodes:token'] = 'Token is required when NPM Registry URL is set'
                return false
            } else {
                this.errors['platform:certifiedNodes:token'] = ''
            }

            return true
        },
        async saveChanges () {
            console.log('Saving changes', this.input)
            this.loading = true
            const options = {}
            validSettings.forEach((s) => {
                if (this.input[s] !== this.settings[s]) {
                    options[s] = this.input[s]
                }
            })
            console.log('Options to save:', options)

            settingsApi.updateSettings(options)
                .then(async () => {
                    await this.refreshSettings()
                    Alerts.emit('Settings changed successfully.', 'confirmation')
                })
                .catch(async (err) => {
                    console.error(err)
                    Alerts.emit(`Something went wrong: ${err}`, 'warning')
                })
                .finally(() => {
                    this.loading = false
                })
        }
    }
}
</script>
