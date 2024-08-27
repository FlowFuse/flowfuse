<template>
    <form class="space-y-6">
        <TemplateSettingsPalette v-model="editable" :editTemplate="false" />
        <TemplateSectionCatalogue v-model="editable" :editTemplate="false" :readOnly="!catalogueEditable" :project="project" />
        <TemplateSectionNPM v-model="editable" :editTemplate="false" :readOnly="!npmEditable" :project="project" />
        <TemplatePaletteModulesEditor v-model="editable" :editTemplate="false" :readOnly="!paletteEditable" :project="project" />
        <div class="space-x-4 whitespace-nowrap">
            <ff-button size="small" :disabled="!unsavedChanges && !modulesChanged" @click="saveSettings()">Save settings</ff-button>
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
    emits: ['instance-updated'],
    data () {
        return {
            unsavedChanges: false,
            modulesChanged: false,
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
                        if (field !== 'palette_modules') {
                            // this.editable.changed.settings[field] = this.editable.settings[field] != this.original.settings[field]
                            changed = changed || (this.editable.settings[field] !== this.original.settings[field])
                        }
                    })
                    this.unsavedChanges = changed
                }
            }
        },
        'editable.settings.palette_modules': {
            deep: true,
            handler (v) {
                if (!this.mounted || !this.project) {
                    return // not yet mounted or no project
                }
                const result = comparePaletteModules(v, this.original.settings.palette_modulesMap || {})
                this.modulesChanged = result.changed
                this.hasErrors = result.errors
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
