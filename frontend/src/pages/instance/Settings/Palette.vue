<template>
    <form class="space-y-6">
        <TemplateSettingsPalette v-model="editable" :editTemplate="false" />
        <TemplateSectionCatalogue v-model="editable" :editTemplate="false" :readOnly="!catalogueEditable" :project="project" />
        <TemplateSectionNPM v-model="editable" :editTemplate="false" :readOnly="!npmEditable" :project="project" />
        <TemplatePaletteModulesEditor v-model="editable" :editTemplate="false" :readOnly="!paletteEditable" :project="project" />
        <div class="space-x-4 whitespace-nowrap">
            <ff-button size="small" :disabled="!unsavedChanges && !unsavedModules" @click="saveSettings()">Save settings</ff-button>
        </div>
    </form>
</template>

<script>

import { useRouter } from 'vue-router'

import { mapState } from 'vuex'

import InstanceApi from '../../../api/instances.js'
import permissionsMixin from '../../../mixins/Permissions.js'
import alerts from '../../../services/alerts.js'
import TemplateSectionCatalogue from '../../admin/Template/sections/Catalogues.vue'
import TemplateSectionNPM from '../../admin/Template/sections/NPMRegistry.vue'
import TemplateSettingsPalette from '../../admin/Template/sections/Palette.vue'
import TemplatePaletteModulesEditor from '../../admin/Template/sections/PaletteModules.vue'

import {
    comparePaletteModules,
    getTemplateValue,
    prepareTemplateForEdit,
    setTemplateValue,
    templateFields
} from '../../admin/Template/utils.js'

export default {
    name: 'InstanceSettingsPalette',
    components: {
        TemplateSectionCatalogue,
        TemplateSectionNPM,
        TemplateSettingsPalette,
        TemplatePaletteModulesEditor
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
            // unsavedChanges: false,
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
        catalogFeatureEnabledForTeam () {
            if (!this.features.customCatalogs) {
                return false
            }
            const flag = this.team.type.properties.features?.customCatalogs
            return flag === undefined || flag
        },
        paletteEditable () {
            return this.editable?.settings.palette_allowInstall
        },
        catalogueEditable () {
            return this.editable?.policy.palette_catalogue
        },
        npmEditable () {
            return this.editable?.policy.palette_npmrc
        },
        saveButton () {
            // todo not working properly from the get-go
            return {
                visible: true,
                disabled: !this.unsavedChanges && !this.unsavedModules
            }
        },
        unsavedChanges () {
            let flag = false
            if (this.project.template) {
                templateFields.forEach(field => {
                    if (field !== 'palette_modules') {
                        let current = null
                        if (Object.prototype.hasOwnProperty.call(this.editable?.settings ?? {}, field)) {
                            current = this.editable?.settings[field]
                        }

                        let original = null
                        if (Object.prototype.hasOwnProperty.call(this.original?.settings ?? {}, field)) {
                            original = this.original?.settings[field]
                        }

                        if (typeof current === 'object') {
                            current = JSON.stringify(current)
                        }

                        if (typeof original === 'object') {
                            original = JSON.stringify(original)
                        }
                        if (current !== original) {
                            flag = true
                        }
                    }
                })
            }

            return flag
        },
        comparedPaletteModules () {
            if (!this.mounted || !this.project) {
                return false
            }
            return comparePaletteModules(this.editable.settings.palette_modules, this.original.settings.palette_modulesMap || {})
        },
        unsavedModules () {
            if (!this.mounted || !this.project) {
                return false
            }

            return this.comparedPaletteModules.changed
        },
        hasErrors () {
            return this.comparedPaletteModules.errors
        }
    },
    watch: {
        project: 'getSettings',
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
                    const projectSettingsValue = getTemplateValue(this.project.settings, field)
                    if (projectSettingsValue !== undefined) {
                        this.editable.settings[field] = JSON.parse(JSON.stringify(projectSettingsValue))
                        // Also update original for change detection - although if we want to
                        // have a 'revert to default' option, we'll want the Template-provided
                        // original to use
                        this.original.settings[field] = JSON.parse(JSON.stringify(projectSettingsValue))
                    }
                })
                this.original.settings.palette_modulesMap = {}
                this.project.settings.palette?.modules?.forEach(module => {
                    this.original.settings.palette_modulesMap[module.name] = module
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
