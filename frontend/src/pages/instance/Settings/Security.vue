<template>
    <form class="space-y-6">
        <TemplateSettingsSecurity v-model="editable" :editTemplate="false" :team="team" />
        <div v-if="!!settings.features.httpBearerTokens && editable.settings.httpNodeAuth_type === 'flowforge-user'">
            <FormHeading>HTTP Node Bearer Tokens</FormHeading>
            <div v-if="projectLauncherCompatible">
                <ff-data-table
                    data-el="tokens-table"
                    :rows="tokens" :columns="columns" :show-search="true" search-placeholder="Search Tokens..."
                    :show-load-more="false"
                >
                    <template #actions>
                        <ff-button data-action="new-token" @click="newToken()">
                            <template #icon-left>
                                <PlusSmIcon />
                            </template>
                            Add Token
                        </ff-button>
                    </template>
                    <template #context-menu="{row}">
                        <ff-list-item data-action="edit-token" label="Edit" @click="editToken(row)" />
                        <ff-list-item data-action="delete-token" label="Delete" @click="deleteToken(row)" />
                    </template>
                    <template v-if="tokens.length === 0" #table>
                        <div class="ff-no-data ff-no-data-large">
                            You don't have any tokens yet
                        </div>
                    </template>
                </ff-data-table>
            </div>
            <div v-else>
                Upgrade your stack to enable this feature
            </div>
        </div>
        <div class="space-x-4 whitespace-nowrap">
            <ff-button data-action="new-token" size="small" :disabled="!unsavedChanges" @click="saveSettings()">Save settings</ff-button>
        </div>
    </form>
    <TokenDialog ref="tokenDialog" data-el="http-token-diag" :project="project" @token-created="newTokenDone" @token-updated="getTokens" />
    <TokenCreated ref="tokenCreated" />
</template>

<script>
import { PlusSmIcon } from '@heroicons/vue/outline'
import SemVer from 'semver'

import { markRaw } from 'vue'
import { useRouter } from 'vue-router'
import { mapState } from 'vuex'

import InstanceApi from '../../../api/instances.js'
import FormHeading from '../../../components/FormHeading.vue'
import permissionsMixin from '../../../mixins/Permissions.js'
import alerts from '../../../services/alerts.js'
import TokenCreated from '../../account/Security/dialogs/TokenCreated.vue'
import ExpiryCell from '../../account/components/ExpiryCell.vue'
import TemplateSettingsSecurity from '../../admin/Template/sections/Security.vue'
import {
    getObjectValue,
    getTemplateValue,
    isPasswordField,
    prepareTemplateForEdit,
    setTemplateValue,
    templateFields,
    templateValidators
} from '../../admin/Template/utils.js'

import TokenDialog from './dialogs/TokenDialog.vue'

export default {
    name: 'InstanceSettingsSecurity',
    components: {
        FormHeading,
        PlusSmIcon,
        TemplateSettingsSecurity,
        TokenCreated,
        TokenDialog
    },
    mixins: [permissionsMixin],
    inheritAttrs: false,
    props: {
        project: {
            type: Object,
            required: true
        }
    },
    emits: ['instance-updated'],
    data () {
        return {
            unsavedChanges: false,
            editable: {
                name: '',
                settings: {},
                policy: {},
                changed: {
                    name: false,
                    description: false,
                    settings: {},
                    policy: {}
                },
                errors: {}
            },
            original: {},
            tokens: [],
            columns: [
                { label: 'Name', key: 'name', sortable: true },
                // { label: 'Scope', key: 'scope' },
                {
                    label: 'Expires',
                    key: 'expiresAt',
                    component: {
                        is: markRaw(ExpiryCell)
                    }
                }
            ]
        }
    },
    computed: {
        ...mapState('account', ['team', 'teamMembership', 'settings']),
        projectLauncherCompatible () {
            const launcherVersion = this.project?.meta?.versions?.launcher
            if (!launcherVersion) {
                // We won't have this for a suspended project - so err on the side
                // of permissive
                return true
            }
            return SemVer.satisfies(SemVer.coerce(launcherVersion), '>=2.2.0')
        }
    },
    watch: {
        project: 'getSettings',
        editable: {
            deep: true,
            handler (v) {
                if (this.project.template) {
                    let changed = false
                    let errors = false
                    templateFields.forEach(field => {
                        // this.editable.changed.settings[field] = this.editable.settings[field] != this.original.settings[field]
                        changed = changed || (this.editable.settings[field] !== this.original.settings[field])
                        if (templateValidators[field]) {
                            const validationResult = templateValidators[field](this.editable.settings[field])
                            if (validationResult) {
                                this.editable.errors[field] = validationResult
                                errors = true
                            } else {
                                delete this.editable.errors[field]
                            }
                        }
                    })
                    this.unsavedChanges = changed
                    this.hasErrors = errors
                }
            }
        }
    },
    mounted () {
        this.checkAccess()
        this.getSettings()
        if (this.settings.features.httpBearerTokens) {
            this.getTokens()
        }
    },
    methods: {
        checkAccess: async function () {
            if (!this.hasPermission('project:edit')) {
                useRouter().push({ replace: true, path: 'general' })
            }
        },
        getSettings: function () {
            if (this.project.template) {
                const preparedTemplate = prepareTemplateForEdit(this.project.template)
                this.editable = preparedTemplate.editable
                this.original = preparedTemplate.original
                // Merge in the `project.settings` values
                templateFields.forEach(field => {
                    let projectSettingsValue = getTemplateValue(this.project.settings, field)
                    if (isPasswordField(field)) {
                        // This is a password field - so the handling is a bit more complicated.
                        // getTemplateValue for a password field returns '' if it isn't set. However
                        // we need to know if the property is explicitly set on the instance or not
                        // so that we don't override the template-provided value with ''

                        // getObjectValue gets the true value without doing any encode/decoding
                        const passwordSettingValue = getObjectValue(this.project.settings, field)
                        if (passwordSettingValue === undefined || passwordSettingValue === false) {
                            projectSettingsValue = undefined
                        }
                    }
                    if (projectSettingsValue !== undefined) {
                        this.editable.settings[field] = projectSettingsValue
                        // Also update original for change detection - although if we want to
                        // have a 'revert to default' option, we'll want the Template-provided
                        // original to use
                        this.original.settings[field] = projectSettingsValue
                    }
                })
            }
        },
        async saveSettings () {
            const settings = {}
            templateFields.forEach(field => {
                if (this.editable.settings[field] !== this.original.settings[field]) {
                    setTemplateValue(settings, field, this.editable.settings[field])
                }
            })
            if (this.editable.settings.httpNodeAuth_type !== 'basic') {
                setTemplateValue(settings, 'httpNodeAuth_user', '')
                setTemplateValue(settings, 'httpNodeAuth_pass', '')
            }
            await InstanceApi.updateInstance(this.project.id, { settings })
            this.$emit('instance-updated')
            alerts.emit('Instance successfully updated.', 'confirmation')
        },
        async getTokens () {
            const response = await InstanceApi.getHTTPTokens(this.project.id)
            this.tokens = response.tokens
        },
        newToken () {
            this.$refs.tokenDialog.showCreate()
        },
        newTokenDone (token) {
            this.$refs.tokenCreated.showToken(token)
            this.getTokens()
        },
        editToken (row) {
            this.$refs.tokenDialog.showEdit(row)
        },
        deleteToken: async function (row) {
            await InstanceApi.deleteHTTPToken(this.project.id, row.id)
            this.getTokens()
        }
    }
}
</script>
