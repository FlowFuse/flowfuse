<template>
    <Teleport v-if="mounted" to="#platform-sidenav">
        <SideNavigation>
            <template v-slot:back>
                <router-link :to="{name: 'AdminSettingsSSO'}">
                    <nav-item :icon="icons.chevronLeft" label="Back to SSO"></nav-item>
                </router-link>
            </template>
        </SideNavigation>
    </Teleport>
    <main>
        <div class="max-w-2xl m-auto">
            <ff-loading v-if="loading && !isCreate" message="Loading SSO Configuration..."/>
            <ff-loading v-if="loading && isCreate" message="Creating SSO Configuration..."/>
            <form v-else class="space-y-6">
                <FormHeading>{{ pageTitle }}</FormHeading>
                <FormRow v-model="input.name" :error="errors.name">
                    Configuration Name
                </FormRow>
                <FormRow v-model="input.domainFilter" :error="errors.domainFilter" placeholder="@example.com">
                    Email Domain
                    <template v-slot:description>The email domain this provider should be used for.</template>
                </FormRow>
                <ff-button v-if="isCreate" :disabled="!formValid" @click="createProvider()">
                    Create configuration
                </ff-button>
                <template v-else>
                    <FormRow v-model="provider.acsURL" type="uneditable">ACS URL</FormRow>
                    <FormRow v-model="provider.entityID" type="uneditable">Entity ID / Issuer</FormRow>
                    <FormRow v-model="input.options.entryPoint">
                        Identity Provider Single Sign-On URL
                        <template v-slot:description>Supplied by your Identity Provider</template>
                    </FormRow>
                    <FormRow v-model="input.options.idpIssuer">
                        Identity Provider Issuer ID / URL
                        <template v-slot:description>Supplied by your Identity Provider</template>
                    </FormRow>
                    <FormRow v-model="input.options.cert">
                        X.509 Certificate Public Key
                        <template v-slot:description>Supplied by your Identity Provider</template>
                        <template #input><textarea class="font-mono w-full" placeholder="---BEGIN CERTIFICATE---&#10;loremipsumdolorsitamet&#10;consecteturadipiscinge&#10;---END CERTIFICATE---&#10;" rows="6" v-model="input.options.cert"></textarea></template>
                    </FormRow>
                    <FormRow v-model="input.active" type="checkbox">Active</FormRow>
                    <ff-button :disabled="!formValid" @click="updateProvider()">
                        Update configuration
                    </ff-button>
                </template>
            </form>
        </div>
    </main>
</template>

<script>
import ssoApi from '@/api/sso'
import FormRow from '@/components/FormRow'
import FormHeading from '@/components/FormHeading'
import { mapState } from 'vuex'

import NavItem from '@/components/NavItem'
import SideNavigation from '@/components/SideNavigation'
import { ChevronLeftIcon } from '@heroicons/vue/solid'

export default {
    name: 'AdminEditSSOProvider',
    data () {
        return {
            mounted: false,
            loading: false,
            provider: {},
            icons: {
                chevronLeft: ChevronLeftIcon
            },
            originalValues: '',
            input: {
                name: '',
                domainFilter: '',
                active: false,
                options: {}
            },
            errors: {}
        }
    },
    computed: {
        ...mapState('account', ['features']),
        isCreate () {
            return this.$route.params.id === 'create'
        },
        formValid () {
            return (this.isCreate && !!this.input.domainFilter) || (!this.isCreate && JSON.stringify(this.input) !== this.originalValues)
        },
        pageTitle () {
            if (this.isCreate) {
                return 'Create new SSO Configuration'
            } else {
                return 'Edit SSO Configuration'
            }
        }
    },
    async beforeMount () {
        if (!this.features.sso) {
            this.$router.push({ path: '/admin/settings' })
        }
    },
    mounted () {
        this.mounted = true
    },
    methods: {
        createProvider () {
            if (this.formValid) {
                this.loading = true
                // Initial create
                ssoApi.createProvider({
                    name: this.input.name,
                    domainFilter: this.input.domainFilter
                }).then(response => {
                    this.$router.push({ name: 'AdminSettingsSSOEdit', params: { id: response.id } })
                    this.loading = false
                    this.provider = response
                })
            }
        },
        updateProvider () {
            if (this.formValid) {
                const opts = {
                    ...this.input
                }
                delete opts.id
                ssoApi.updateProvider(this.provider.id, opts).then(response => {
                    this.$router.push({ name: 'AdminSettingsSSO' })
                }).catch(err => {
                    console.log(err)
                })
            }
        },
        async loadProvider () {
            if (this.$route.params.id === 'create') {
                this.provider = {}
                this.input.name = ''
                this.input.domainFilter = ''
                this.input.active = false
                this.input.options = {}
            } else {
                this.loading = true
                try {
                    this.provider = await ssoApi.getProvider(this.$route.params.id)
                    this.input.name = this.provider.name
                    this.input.domainFilter = this.provider.domainFilter
                    this.input.active = this.provider.active
                    this.input.options = { ...this.provider.options }
                    this.originalValues = JSON.stringify(this.input)
                } catch (err) {
                    if (err.response.status === 404) {
                        this.$router.push({ name: 'AdminSettingsSSO' })
                    }
                    console.log(err)
                } finally {
                    this.loading = false
                }
            }
        }

    },
    async created () {
        await this.loadProvider()
    },
    components: {
        FormRow,
        FormHeading,
        SideNavigation,
        NavItem
    }
}
</script>
