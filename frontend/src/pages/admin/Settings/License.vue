<template>
    <ff-loading v-if="loading.updating" :message="$t('ui.updatingLicense')" />
    <ff-loading v-if="loading.checking" :message="$t('ui.checkingLicense')" />
    <div v-else-if="!isLoading" class="space-y-6">
        <template v-if="!editing.license">
            <FormHeading>{{ $t('ui.license') }}</FormHeading>
            <template v-if="license">
                <table data-el="license-details">
                    <tbody>
                        <tr v-if="license.dev"><td class="font-medium p-2 pr-4 align-top" colspan="2" /></tr>
                        <tr><td class="font-medium p-2 pr-4 align-top">{{ $t('ui.type') }}</td><td class="p-2"><span v-if="!license.dev">{{ $t('ui.flowfuseEnterpriseEdition') }}</span><span v-else class="font-bold">{{ $t('ui.flowfuseDevelopmentOnly') }}</span></td></tr>
                        <tr><td class="font-medium p-2 pr-4 align-top">{{ $t('ui.licenseId') }}</td><td class="p-2">{{ license.id }}</td></tr>
                        <tr><td class="font-medium p-2 pr-4 align-top">{{ $t('ui.organisation') }}</td><td class="p-2">{{ license.organisation }}</td></tr>
                        <tr v-if="!!license.tier"><td class="font-medium p-2 pr-4 align-top">{{ $t('ui.tier') }}</td><td class="p-2">{{ license.tier }}</td></tr>
                        <tr v-if="!!license.tiers"><td class="font-medium p-2 pr-4 align-top">{{ $t('ui.tierEntitlements') }}</td><td class="p-2">{{ license.tiers }}</td></tr>
                        <tr><td class="font-medium p-2 pr-4 align-top">{{ $t('ui.expires') }}</td><td class="p-2">{{ license.expires }}<br><span class="text-xs">{{ license.expiresAt }}</span></td></tr>
                    </tbody>
                </table>
                <details><pre class="wrap-break-word">{{ license }}</pre></details>
            </template>
            <template v-else>
                <table>
                    <tbody>
                        <tr><td class="font-medium p-2 pr-4 align-top">{{ $t('ui.type') }}</td><td class="p-2">{{ $t('ui.flowfuseCommunityEdition') }}</td></tr>
                    </tbody>
                </table>
            </template>
            <div class="space-x-4 whitespace-nowrap">
                <ff-button data-form="update-licence" @click="editLicense">{{ $t('ui.updateLicense') }}</ff-button>
            </div>
        </template>
        <template v-if="editing.license">
            <FormHeading>{{ $t('ui.n1UploadNewLicense') }}</FormHeading>
            <template v-if="!inspectedLicense">
                <FormRow id="license" ref="row-license" v-model="input.license" :error="errors.license" :placeholder="$t('ui.enterNewLicense')" data-form="license" />
                <div class="space-x-4 whitespace-nowrap flex">
                    <ff-button @click="cancelEditLicense">{{ $t('ui.cancel') }}</ff-button>
                    <ff-button :disabled="!formValid" data-form="check-license" @click="inspectLicense">{{ $t('ui.checkLicense') }}</ff-button>
                </div>
            </template>
            <template v-if="inspectedLicense">
                <FormHeading>{{ $t('ui.n2CheckLicenseDetails') }}</FormHeading>
                <table>
                    <tbody>
                        <tr v-if="inspectedLicense.dev"><td class="font-medium p-2 pr-4 align-top" colspan="2">{{ $t('ui.developmentModeOnly') }}</td></tr>
                        <tr><td class="font-medium p-2 pr-4 align-top">{{ $t('ui.licenseId') }}</td><td class="p-2">{{ inspectedLicense.id }}</td></tr>
                        <tr><td class="font-medium p-2 pr-4 align-top">{{ $t('ui.organisation') }}</td><td class="p-2">{{ inspectedLicense.organisation }}</td></tr>
                        <tr v-if="!!inspectedLicense.tier"><td class="font-medium p-2 pr-4 align-top">{{ $t('ui.tier') }}</td><td class="p-2">{{ inspectedLicense.tier }}</td></tr>
                        <tr v-if="!!inspectedLicense.tiers"><td class="font-medium p-2 pr-4 align-top">{{ $t('ui.tierEntitlements') }}</td><td class="p-2">{{ inspectedLicense.tiers }}</td></tr>
                        <tr><td class="font-medium p-2 pr-4 align-top">{{ $t('ui.expires') }}</td><td class="p-2">{{ inspectedLicense.expires }}<br><span class="text-xs">{{ inspectedLicense.expiresAt }}</span></td></tr>
                    </tbody>
                </table>
                <details><pre class="wrap-break-word">{{ inspectedLicense }}</pre></details>
                <div class="space-x-4 whitespace-nowrap flex">
                    <ff-button kind="secondary" @click="cancelEditLicense">{{ $t('ui.cancel') }}</ff-button>
                    <ff-button kind="primary" data-form="submit" @click="applyLicense">{{ $t('ui.applyLicense') }}</ff-button>
                </div>
            </template>
        </template>
    </div>
</template>

<script>
import { mapActions } from 'pinia'

import adminApi from '../../../api/admin.js'
import FormHeading from '../../../components/FormHeading.vue'
import FormRow from '../../../components/FormRow.vue'

import { t } from '../../../i18n.js'

import { useAccountSettingsStore } from '@/stores/account-settings.js'

export default {
    name: 'AdminSettingsLicense',
    components: {
        FormRow,
        FormHeading
    },
    data () {
        return {
            loading: {
                updating: false,
                checking: false
            },
            license: null,
            inspectedLicense: null,
            errors: {
                license: null
            },
            editing: {
                license: false
            },
            input: {
                license: ''
            }
        }
    },
    computed: {
        formValid () {
            return this.input.license.length > 0
        },
        isLoading () {
            return this.loading.updating || this.loading.checking
        }
    },
    watch: {
        'input.license': function () {
            this.errors.license = null
        }
    },
    async mounted () {
        this.license = await adminApi.getLicenseDetails()
    },
    methods: {
        ...mapActions(useAccountSettingsStore, ['refreshSettings']),
        editLicense () {
            this.input.license = ''
            this.editing.license = true
            this.$nextTick(() => {
                this.$refs['row-license'].focus()
            })
        },
        async inspectLicense () {
            this.loading.checking = true
            try {
                this.inspectedLicense = await adminApi.updateLicense({
                    license: this.input.license,
                    action: 'inspect'
                })
                this.loading.checking = false
            } catch (err) {
                if (err.response && err.response.data && err.response.data.error) {
                    this.errors.license = err.response.data.error
                } else {
                    this.errors.license = t('ui.errorInspectingLicense')
                }
                this.loading.checking = false
            }
        },
        async applyLicense () {
            this.loading.updating = true
            try {
                this.license = await adminApi.updateLicense({
                    license: this.input.license,
                    action: 'apply'
                })
                this.refreshSettings()
                this.cancelEditLicense()
                this.loading.updating = false
            } catch (err) {
                console.error(err)
                if (err.response && err.response.data && err.response.data.error) {
                    this.errors.license = err.response.data.error
                } else {
                    this.errors.license = t('ui.errorApplyingLicense')
                }
                this.loading.updating = false
            }
        },
        cancelEditLicense () {
            this.inspectedLicense = null
            this.editing.license = false
            this.input.license = ''
            this.errors.license = null
        }
    }
}
</script>
