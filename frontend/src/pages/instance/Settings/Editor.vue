<template>
    <form class="space-y-6">
        <TemplateSettingsEditor v-model="editable" :editTemplate="false" :team="team" :instance="project" />
        <div class="space-x-4 whitespace-nowrap">
            <ff-button size="small" :disabled="!unsavedChanges" @click="saveSettings()">Save settings</ff-button>
        </div>
    </form>
</template>

<script>

import { useRouter } from 'vue-router'
import { mapState } from 'vuex'

import InstanceApi from '../../../api/instances.js'
import permissionsMixin from '../../../mixins/Permissions.js'
import alerts from '../../../services/alerts.js'
import TemplateSettingsEditor from '../../admin/Template/sections/Editor.vue'
import {
    getObjectValue,
    getTemplateValue,
    isPasswordField,
    prepareTemplateForEdit,
    setTemplateValue,
    templateFields,
    templateValidators
} from '../../admin/Template/utils.js'

export default {
    name: 'InstanceSettingsEditor',
    components: {
        TemplateSettingsEditor
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
            original: {}
        }
    },
    computed: {
        ...mapState('account', ['team', 'teamMembership'])
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
            await InstanceApi.updateInstance(this.project.id, { settings })
            this.$emit('instance-updated')
            alerts.emit('Instance successfully updated.', 'confirmation')
        }
    }
}
</script>
