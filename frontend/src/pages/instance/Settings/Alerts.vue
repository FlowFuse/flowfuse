<template>
    <form class="space-y-6">
        <TemplateSettingsAlert v-model="editable" :editTemplate="false" />
    </form>
</template>

<script>
import { useRouter } from 'vue-router'
import { mapState } from 'vuex'

import InstanceApi from '../../../api/instances.js'
import permissionsMixin from '../../../mixins/Permissions.js'
import alerts from '../../../services/alerts.js'
import TemplateSettingsAlert from '../../admin/Template/sections/Alerts.vue'
import {
    getObjectValue,
    getTemplateValue,
    isPasswordField,
    prepareTemplateForEdit,
    setTemplateValue,
    templateFields
} from '../../admin/Template/utils.js'

export default {
    name: 'InstanceSettingsAlerts',
    components: {
        TemplateSettingsAlert
    },
    mixins: [permissionsMixin],
    inheritAttrs: false,
    props: {
        project: {
            type: Object,
            required: true
        }
    },
    emits: ['instance-updated', 'save-button-state'],
    data () {
        return {
            unsavedChanges: false,
            mounted: false,
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
            original: {}
        }
    },
    computed: {
        ...mapState('account', ['team', 'teamMembership', 'features']),
        emailOptions () {
            return [
                {
                    label: 'Owners',
                    value: 'owners',
                    description: 'Email Team Owners'
                },
                {
                    label: 'Owners & Members',
                    value: 'both',
                    description: 'Email Team Owners and Members'
                },
                {
                    label: 'Members',
                    value: 'members',
                    description: 'Email Team Members'
                }
            ]
        },
        saveButton () {
            return {
                visible: true,
                disabled: !this.unsavedChanges
            }
        }
    },
    watch: {
        project: 'getSettings',
        editable: {
            deep: true,
            handler (v) {
                if (this.project.template) {
                    let changed = false
                    templateFields.forEach(field => {
                        changed = changed || (this.editable.settings[field] !== this.original.settings[field])
                    })
                    this.unsavedChanges = changed
                }
            }
        },
        saveButton: {
            immediate: true,
            handler (state) {
                this.$emit('save-button-state', state)
            }
        }
    },
    mounted () {
        this.checkAccess()
        this.getSettings()
        this.mounted = true
    },
    methods: {
        checkAccess: function () {
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
            await InstanceApi.updateInstance(this.project.id, { settings })
            this.$emit('instance-updated')
            alerts.emit('Instance successfully updated.', 'confirmation')
        }
    }
}
</script>
