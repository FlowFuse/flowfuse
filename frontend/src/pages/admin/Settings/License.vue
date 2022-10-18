<template>
    <ff-loading v-if="loading.updating" message="Updating License..." />
    <ff-loading v-if="loading.checking" message="Checking License..." />
    <div v-else-if="!isLoading" class="space-y-6">
        <template v-if="!editing.license">
            <FormHeading>License</FormHeading>
            <template v-if="license">
                <table data-el="license-details">
                    <tr v-if="license.dev"><td class="font-medium p-2 pr-4 align-top" colspan="2"></td></tr>
                    <tr><td class="font-medium p-2 pr-4 align-top">Type</td><td class="p-2"><span v-if="!license.dev">FlowForge Enterprise Edition</span><span v-else class="font-bold">FlowForge Development Only</span></td></tr>
                    <tr><td class="font-medium p-2 pr-4 align-top">Organisation</td><td class="p-2">{{license.organisation}}</td></tr>
                    <tr><td class="font-medium p-2 pr-4 align-top">Tier</td><td class="p-2">{{license.tier}}</td></tr>
                    <tr><td class="font-medium p-2 pr-4 align-top">Expires</td><td class="p-2">{{license.expires}}<br><span class="text-xs">{{license.expiresAt}}</span></td></tr>
                </table>
                <details><pre class="break-words">{{license}}</pre></details>
            </template>
            <template v-else>
                <table>
                    <tr><td class="font-medium p-2 pr-4 align-top">Type</td><td class="p-2">FlowForge Community Edition</td></tr>
                </table>
            </template>
            <div class="space-x-4 whitespace-nowrap">
                <ff-button @click="editLicense" data-form="update-licence">Update license</ff-button>
            </div>
        </template>
        <template v-if="editing.license">
            <FormHeading>1. Upload new license</FormHeading>
            <template v-if="!inspectedLicense">
                <FormRow v-model="input.license" :error="errors.license" id="license" placeholder="Enter new license" ref="row-license" data-form="license"></FormRow>
                <div class="space-x-4 whitespace-nowrap flex">
                    <ff-button @click="cancelEditLicense">Cancel</ff-button>
                    <ff-button :disabled="!formValid" @click="inspectLicense" data-form="check-license">Check license</ff-button>
                </div>
            </template>
            <template v-if="inspectedLicense">
                <FormHeading>2. Check license details</FormHeading>
                <table>
                    <tr v-if="inspectedLicense.dev"><td class="font-medium p-2 pr-4 align-top" colspan="2">Development-mode Only</td></tr>
                    <tr><td class="font-medium p-2 pr-4 align-top">Organisation</td><td class="p-2">{{inspectedLicense.organisation}}</td></tr>
                    <tr><td class="font-medium p-2 pr-4 align-top">Expires</td><td class="p-2">{{inspectedLicense.expires}}<br><span class="text-xs">{{inspectedLicense.expiresAt}}</span></td></tr>
                </table>
                <details><pre class="break-words">{{inspectedLicense}}</pre></details>
                <div class="space-x-4 whitespace-nowrap flex">
                    <ff-button kind="secondary" @click="cancelEditLicense">Cancel</ff-button>
                    <ff-button kind="primary" @click="applyLicense" data-form="submit">Apply license</ff-button>
                </div>
            </template>
        </template>
    </div>
</template>

<script>
import FormRow from '@/components/FormRow'
import FormHeading from '@/components/FormHeading'
import adminApi from '@/api/admin'

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
    async mounted () {
        this.license = await adminApi.getLicenseDetails()
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
    methods: {
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
                    this.errors.license = 'Error inspecting license'
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
                this.$store.dispatch('account/refreshSettings')
                this.cancelEditLicense()
                this.loading.updating = false
            } catch (err) {
                console.log(err)
                if (err.response && err.response.data && err.response.data.error) {
                    this.errors.license = err.response.data.error
                } else {
                    this.errors.license = 'Error applying license'
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
