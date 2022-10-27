<template>
    <form class="space-y-6">
        <TemplateSettingsPalette v-model="editable" :editTemplate="false" />
        <TemplatePaletteModulesEditor v-model="editable" :editTemplate="false" :readOnly="!paletteEditable" :project="project"/>
        <div class="space-x-4 whitespace-nowrap">
            <ff-button size="small" :disabled="!unsavedChanges && !modulesChanged" @click="saveSettings()">Save settings</ff-button>
        </div>
    </form>
</template>

<script>
import alerts from '@/services/alerts'

import projectApi from '@/api/project'
import TemplateSettingsPalette from '../../admin/Template/sections/Palette'
import TemplatePaletteModulesEditor from '../../admin/Template/sections/PaletteModules'

import {
    getTemplateValue,
    setTemplateValue,
    templateFields,
    prepareTemplateForEdit
} from '../../admin/Template/utils'

import { useRouter } from 'vue-router'
import { mapState } from 'vuex'
import permissionsMixin from '@/mixins/Permissions'

export default {
    name: 'ProjectSettingsPalette',
    data () {
        return {
            unsavedChanges: false,
            modulesChanged: false,
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
    props: ['project'],
    mixins: [permissionsMixin],
    computed: {
        ...mapState('account', ['team', 'teamMembership']),
        paletteEditable () {
            return this.editable?.settings.palette_allowInstall
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
                let changed = false
                let errors = false

                let originalCount = 0
                this.editable.settings.palette_modules.forEach(field => {
                    errors = errors || field.error
                    if (/^add/.test(field.index)) {
                        changed = true
                    } else {
                        originalCount++
                        if (this.original.settings.palette_modulesMap[field.name]) {
                            const original = this.original.settings.palette_modulesMap[field.name]
                            if (original.index !== field.index) {
                                changed = true
                            } else if (original.name !== field.name) {
                                changed = true
                            } else if (original.version !== field.version) {
                                changed = true
                            }
                        } else {
                            changed = true
                        }
                    }
                })
                if (originalCount !== this.original.settings.palette_modules.length) {
                    changed = true
                }
                this.modulesChanged = changed
                this.hasErrors = errors
            }
        }
    },
    mounted () {
        this.checkAccess()
        this.getSettings()
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
            await projectApi.updateProject(this.project.id, { settings })
            this.$emit('projectUpdated')
            alerts.emit('Project successfully updated.', 'confirmation')
        }
    },
    components: {
        TemplateSettingsPalette,
        TemplatePaletteModulesEditor
    }
}
</script>
