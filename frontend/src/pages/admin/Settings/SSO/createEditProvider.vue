<template>
    <ff-page>
        <div class="max-w-2xl m-auto">
            <ff-loading v-if="loading && !isCreate" message="Loading SSO Configuration..." />
            <ff-loading v-if="loading && isCreate" message="Creating SSO Configuration..." />
            <form v-else class="space-y-6">
                <FormHeading>{{ pageTitle }}</FormHeading>
                <FormRow v-model="input.name" :error="errors.name">
                    Configuration Name
                </FormRow>
                <FormRow v-model="input.domainFilter" :error="errors.domainFilter" placeholder="@example.com">
                    Email Domain
                    <template #description>The email domain this provider should be used for.</template>
                </FormRow>
                <ff-radio-group v-if="isCreate" v-model="input.type" :options="ssoTypeOptions" />
                <ff-button v-if="isCreate" :disabled="!formValid" @click="createProvider()">
                    Create configuration
                </ff-button>
                <template v-else>
                    <FormRow v-model="input.active" type="checkbox">Active</FormRow>
                    <template v-if="input.type === 'saml'">
                        <FormRow v-model="provider.acsURL" type="uneditable">ACS URL</FormRow>
                        <FormRow v-model="provider.entityID" type="uneditable">Entity ID / Issuer</FormRow>
                        <FormRow v-model="input.options.entryPoint">
                            Identity Provider Single Sign-On URL
                            <template #description>Supplied by your Identity Provider</template>
                        </FormRow>
                        <FormRow v-model="input.options.idpIssuer">
                            Identity Provider Issuer ID / URL
                            <template #description>Supplied by your Identity Provider</template>
                        </FormRow>
                        <FormRow v-model="input.options.cert">
                            X.509 Certificate Public Key
                            <template #description>Supplied by your Identity Provider</template>
                            <template #input><textarea v-model="input.options.cert" class="font-mono w-full" placeholder="---BEGIN CERTIFICATE---&#10;loremipsumdolorsitamet&#10;consecteturadipiscinge&#10;---END CERTIFICATE---&#10;" rows="6" /></template>
                        </FormRow>
                        <!-- <FormRow v-model="input.options.groupMapping" type="checkbox">Manage roles using group assertions</FormRow>
                        <div v-if="input.options.groupMapping" class="pl-4 space-y-6">
                            <FormRow v-model="input.options.groupAssertionName" :error="groupAssertionNameError">
                                Group Assertion Name
                                <template #description>The name of the SAML Assertion containing group membership details</template>
                            </FormRow>
                            <FormRow v-model="input.options.groupAllTeams" :options="[{ value:true, label: 'Apply to all teams' }, { value:false, label: 'Apply to selected teams' }]">
                                Team Scope
                                <template #description>Should this apply to all teams on the platform, or just a restricted list of teams</template>
                            </FormRow>
                            <FormRow v-if="input.options.groupAllTeams === false" v-model="input.options.groupTeams" class="pl-4">
                                <template #description>A list of team <b>slugs</b> that will managed by this configuration - one per line</template>
                                <template #input><textarea v-model="input.options.groupTeams" class="font-mono w-full" rows="6" /></template>
                            </FormRow>
                            <FormRow v-if="input.options.groupAllTeams === false" v-model="input.options.groupOtherTeams" type="checkbox" class="pl-4">
                                Allow users to be in other teams
                                <template #description>
                                    If enabled, users can be members of any teams not listed above and their membership/roles are not managed
                                    by this SSO configuration.
                                </template>
                            </FormRow>
                            <FormRow v-model="input.options.groupAdmin" type="checkbox">Manage Admin roles using group assertions</FormRow>
                            <FormRow v-if="input.options.groupAdmin" v-model="input.options.groupAdminName" :error="groupAdminNameError" class="pl-4">Admin Users SAML Group name</FormRow>
                        </div> -->
                    </template>
                    <template v-else-if="input.type === 'ldap'">
                        <FormRow v-model="input.options.server">
                            Server
                            <template #description>For example, <b>localhost:389</b></template>
                        </FormRow>
                        <FormRow v-model="input.options.username">
                            Username
                            <template #description>The Bind DN to access the server</template>
                        </FormRow>
                        <FormRow v-model="input.options.password" type="password">
                            Password
                            <template #description>The password to access the server</template>
                        </FormRow>
                        <ff-button :disabled="!allowTest" size="small" kind="secondary" @click="testProvider()">
                            Test Connection
                        </ff-button>
                        <FormRow v-model="input.options.baseDN">
                            Base DN
                            <template #description>The name of the base object to search for users</template>
                        </FormRow>
                        <FormRow v-model="input.options.userFilter">
                            User Search Filter
                            <template #description>The filter used to lookup users.</template>
                        </FormRow>
                        <FormRow v-model="input.options.tls" type="checkbox">Enable TLS</FormRow>
                        <div v-if="input.options.tls" class="pl-4 space-y-6">
                            <FormRow v-model="input.options.tlsVerifyServer" type="checkbox">Verify Server Certificate</FormRow>
                        </div>
                    </template>
                    <FormRow v-model="input.options.groupMapping" type="checkbox">Manage roles using group assertions</FormRow>
                    <div v-if="input.options.groupMapping" class="pl-4 space-y-6">
                        <div v-if="input.type === 'saml'">
                            <FormRow v-model="input.options.groupAssertionName" :error="groupAssertionNameError">
                                Group Assertion Name
                                <template #description>The name of the SAML Assertion containing group membership details</template>
                            </FormRow>
                        </div>
                        <div v-else-if="input.type === 'ldap'">
                            <FormRow v-model="input.options.groupsDN" :error="groupsDNError">
                                Group DN
                                <template #description>The name of the base object to search for groups</template>
                            </FormRow>
                        </div>
                        <FormRow v-model="input.options.groupPrefixLength" :error="groupPrefixLengthError" type="number">
                            Group Name Prefix Length
                            <template #description>The length of any prefix added to the FlowFuse Group Name format</template>
                        </FormRow>
                        <FormRow v-model="input.options.groupSuffixLength" :error="groupSuffixLengthError" type="number">
                            Group Name Postfix Length
                            <template #description>The length of any suffix added to the FlowFuse Group Name format</template>
                        </FormRow>
                        <FormRow v-model="input.options.groupAllTeams" :options="[{ value:true, label: 'Apply to all teams' }, { value:false, label: 'Apply to selected teams' }]">
                            Team Scope
                            <template #description>Should this apply to all teams on the platform, or just a restricted list of teams</template>
                        </FormRow>
                        <FormRow v-if="input.options.groupAllTeams === false" v-model="input.options.groupTeams" class="pl-4">
                            <template #description>A list of team <b>slugs</b> that will managed by this configuration - one per line</template>
                            <template #input><textarea v-model="input.options.groupTeams" class="font-mono w-full" rows="6" /></template>
                        </FormRow>
                        <FormRow v-if="input.options.groupAllTeams === false" v-model="input.options.groupOtherTeams" type="checkbox" class="pl-4">
                            Allow users to be in other teams
                            <template #description>
                                If enabled, users can be members of any teams not listed above and their membership/roles are not managed
                                by this SSO configuration.
                            </template>
                        </FormRow>
                        <FormRow v-model="input.options.groupAdmin" type="checkbox">Manage Admin roles using group assertions</FormRow>
                        <FormRow v-if="input.options.groupAdmin" v-model="input.options.groupAdminName" :error="groupAdminNameError" class="pl-4">Admin Users SAML Group name</FormRow>
                    </div>
                    <FormRow v-model="input.options.provisionNewUsers" type="checkbox">Allow Provisioning of New Users on first login</FormRow>
                    <ff-button :disabled="!formValid" @click="updateProvider()">
                        Update configuration
                    </ff-button>
                </template>
            </form>
        </div>
    </ff-page>
</template>

<script>
import { ChevronLeftIcon } from '@heroicons/vue/solid'
import { mapState } from 'vuex'

import ssoApi from '../../../../api/sso.js'
import FormHeading from '../../../../components/FormHeading.vue'
import FormRow from '../../../../components/FormRow.vue'
import Alerts from '../../../../services/alerts.js'

export default {
    name: 'AdminEditSSOProvider',
    components: {
        FormRow,
        FormHeading
    },
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
                type: 'saml',
                active: false,
                options: {
                    provisionNewUsers: false,
                    groupAssertionName: '',
                    groupsDN: '',
                    groupMapping: false,
                    groupAdminName: '',
                    groupPrefixLength: 0,
                    groupSuffixLength: 0
                }
            },
            errors: {},
            ssoTypeOptions: [
                { value: 'saml', label: 'SAML' },
                { value: 'ldap', label: 'LDAP' }
            ]
        }
    },
    computed: {
        ...mapState('account', ['features']),
        isCreate () {
            return this.$route.params.id === 'create'
        },
        isGroupOptionsValid () {
            return !this.input.options.groupMapping || (
                (this.input.type === 'saml' ? this.isGroupAssertionNameValid : this.isGroupsDNValid) &&
                  this.isGroupAdminNameValid && this.isGroupPrefixValid && this.isGroupSuffixValid
            )
        },
        isGroupAssertionNameValid () {
            return this.input.options.groupAssertionName && this.input.options.groupAssertionName.length > 0
        },
        groupAssertionNameError () {
            return !this.isGroupAssertionNameValid ? 'Group Assertion name is required' : ''
        },
        isGroupsDNValid () {
            return this.input.options.groupsDN && this.input.options.groupsDN.length > 0
        },
        groupsDNError () {
            return !this.isGroupsDNValid ? 'Group DN is required' : ''
        },
        groupPrefixLengthError () {
            return this.input.options.groupPrefixLength < 0 ? 'Must be a greater or equal to 0' : ''
        },
        isGroupPrefixValid () {
            return this.input.options.groupPrefixLength >= 0
        },
        groupSuffixLengthError () {
            return this.input.options.groupSuffixLength < 0 ? 'Must be a greater or equal to 0' : ''
        },
        isGroupSuffixValid () {
            return this.input.options.groupSuffixLength >= 0
        },
        isGroupAdminNameValid () {
            return !this.input.options.groupAdmin || (this.input.options.groupAdminName && this.input.options.groupAdminName.length > 0)
        },
        groupAdminNameError () {
            return !this.isGroupAdminNameValid ? 'Admin Group name is required' : ''
        },
        formValid () {
            return this.isGroupOptionsValid && ((this.isCreate && !!this.input.domainFilter) || (!this.isCreate && JSON.stringify(this.input) !== this.originalValues))
        },
        pageTitle () {
            if (this.isCreate) {
                return 'Create new SSO Configuration'
            } else {
                return `Edit SSO ${this.input.type.toUpperCase()} Configuration`
            }
        },
        allowTest () {
            return this.input.options.server && this.input.options.username && this.input.options.password
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
    async created () {
        await this.loadProvider()
    },
    methods: {
        createProvider () {
            if (this.formValid) {
                this.loading = true
                // Initial create
                ssoApi.createProvider({
                    name: this.input.name,
                    domainFilter: this.input.domainFilter,
                    type: this.input.type
                }).then(response => {
                    this.$router.push({ name: 'admin-settings-sso-edit', params: { id: response.id } })
                    this.loading = false
                    this.provider = response
                    this.updateForm()
                }).catch(err => {
                    console.warn('Failed to create provider', err)
                })
            }
        },
        updateProvider () {
            if (this.formValid) {
                const opts = {
                    ...this.input
                }
                if (!opts.options.groupMapping) {
                    // Remove any group-related config
                    delete opts.options.groupAssertionName
                    delete opts.options.groupsDN
                    delete opts.options.groupAllTeams
                    delete opts.options.groupTeams
                    delete opts.options.groupAdmin
                    delete opts.options.groupAdminName
                } else {
                    if (opts.options.groupAllTeams) {
                        delete opts.options.groupTeams
                        delete opts.options.groupOtherTeams
                    } else {
                        // groupTeams is stored as an array of team ids.
                        opts.options.groupTeams = opts.options.groupTeams.split(/(?:\r|\n|\r\n)/).filter(n => n.trim().length > 0)
                    }
                    if (!opts.options.groupAdmin) {
                        delete opts.options.groupAdminName
                    }
                }
                if (opts.type === 'ldap') {
                    if (!opts.options.tls) {
                        delete opts.options.tls
                        delete opts.options.tlsVerifyServer
                    }
                    // if (opts.options.provisionNewUsers) {
                    //     delete opts.options.provisionNewUsers
                    // }
                }
                delete opts.type
                delete opts.id
                ssoApi.updateProvider(this.provider.id, opts).then(response => {
                    this.$router.push({ name: 'admin-settings-sso' })
                }).catch(err => {
                    console.error(err)
                })
            }
        },
        async loadProvider () {
            if (this.$route.params.id === 'create') {
                this.provider = {}
                this.input.name = ''
                this.input.domainFilter = ''
                this.input.type = 'saml'
                this.input.active = false
                this.input.options = {
                    groupMapping: false,
                    groupAllTeams: true,
                    groupOtherTeams: false,
                    groupAdmin: false,
                    groupAdminName: 'ff-admins',
                    groupAssertionName: 'ff-roles',
                    groupPrefixLength: 0,
                    groupSuffixLength: 0
                }
            } else {
                this.loading = true
                try {
                    this.provider = await ssoApi.getProvider(this.$route.params.id)
                    this.updateForm()
                } catch (err) {
                    if (err.response.status === 404) {
                        this.$router.push({ name: 'admin-settings-sso' })
                    }
                    console.error(err)
                } finally {
                    this.loading = false
                }
            }
        },
        updateForm () {
            this.input.name = this.provider.name
            this.input.domainFilter = this.provider.domainFilter
            this.input.active = this.provider.active
            this.input.type = this.provider.type || 'saml'
            this.input.options = { ...this.provider.options }
            if (this.input.type === 'saml') {
                this.input.options.groupMapping = this.input.options.groupMapping ?? false
                this.input.options.groupAllTeams = this.input.options.groupAllTeams ?? false
                this.input.options.groupOtherTeams = this.input.options.groupOtherTeams ?? false
                this.input.options.groupAdmin = this.input.options.groupAdmin ?? false
                this.input.options.groupAdminName = this.input.options.groupAdminName || 'ff-admins'
                this.input.options.groupAssertionName = this.input.options.groupAssertionName || 'ff-roles'
                // groupTeams is stored as an array - convert to multi-line string for the edit form
                this.input.options.groupTeams = (this.input.options.groupTeams || []).join('\n')
            } else {
                // eslint-disable-next-line no-template-curly-in-string
                this.input.options.userFilter = this.input.options.userFilter || '(uid=${username})'
                if (this.input.options.tlsVerifyServer === undefined) {
                    // Default to enabled
                    this.input.options.tlsVerifyServer = true
                }
            }
            if (this.provider.options.groupPrefixLength === undefined) {
                this.input.options.groupPrefixLength = 0
            }
            if (this.provider.options.groupSuffixLength === undefined) {
                this.input.options.groupSuffixLength = 0
            }
            this.originalValues = JSON.stringify(this.input)
        },
        async testProvider () {
            const opts = {
                ...this.input
            }
            if (opts.type === 'ldap') {
                if (!opts.options.tls) {
                    delete opts.options.tls
                    delete opts.options.tlsVerifyServer
                }

                try {
                    await ssoApi.testProvider(this.provider.id, opts)
                    Alerts.emit('Connection succeeded', 'confirmation')
                } catch (err) {
                    const message = err.response.data.error
                    Alerts.emit(`Connection failed: ${message}`, 'warning')
                }
            }
        }

    }
}
</script>
