<template>
    <form class="space-y-6">
        <TemplateSettingsEnvironment :readOnly="!hasPermission('device:edit-env')" v-model="editable" :editTemplate="false" />
        <div v-if="hasPermission('device:edit-env')" class="space-x-4 whitespace-nowrap">
            <ff-button size="small" :disabled="!unsavedChanges" @click="saveSettings()">Save settings</ff-button>
        </div>
    </form>
</template>

<script>
import { mapState } from 'vuex'

import alerts from '@/services/alerts'
import permissionsMixin from '@/mixins/Permissions'

import projectApi from '@/api/project'
import TemplateSettingsEnvironment from '../../admin/Template/sections/Environment'
import {
    prepareTemplateForEdit
} from '../../admin/Template/utils'

export default {
    name: 'ProjectSettingsEnvironment',
    mixins: [permissionsMixin],
    data () {
        return {
            unsavedChanges: false,
            editable: {
                name: '',
                settings: { env: [] },
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
            templateEnvValues: {}
        }
    },
    props: ['project'],
    computed: {
        ...mapState('account', ['teamMembership'])
    },
    watch: {
        project: 'getSettings',
        'editable.settings.env': {
            deep: true,
            handler (v) {
                if (this.project.template) {
                    let changed = false
                    let errors = false

                    let originalCount = 0
                    this.editable.settings.env.forEach(field => {
                        errors = errors || field.error
                        if (/^add/.test(field.index)) {
                            changed = true
                        } else {
                            originalCount++
                            if (this.original.settings.envMap[field.name]) {
                                const original = this.original.settings.envMap[field.name]
                                if (original.index !== field.index) {
                                    changed = true
                                } else if (original.name !== field.name) {
                                    changed = true
                                } else if (original.value !== field.value) {
                                    changed = true
                                } else if (original.policy !== field.policy) {
                                    changed = true
                                }
                            } else {
                                changed = true
                            }
                        }
                    })
                    if (originalCount !== this.original.settings.env.length) {
                        changed = true
                    }
                    this.unsavedChanges = changed
                    this.hasErrors = errors
                }
            }
        }
    },
    mounted () {
        this.getSettings()
    },
    methods: {
        getSettings: function () {
            if (this.project.template) {
                const preparedTemplate = prepareTemplateForEdit(this.project.template)
                this.editable = preparedTemplate.editable
                this.original = preparedTemplate.original
                const templateEnvMap = {}
                this.templateEnvValues = {}
                this.editable.settings.env.forEach(envVar => {
                    templateEnvMap[envVar.name] = envVar
                    this.templateEnvValues[envVar.name] = envVar.value
                })
                if (this.project.settings.env) {
                    this.project.settings.env.forEach(envVar => {
                        if (templateEnvMap[envVar.name]) {
                            if (templateEnvMap[envVar.name].policy) {
                                templateEnvMap[envVar.name].value = envVar.value
                                const templateValue = this.original.settings.env.find(ev => ev.name === envVar.name)
                                if (templateValue) {
                                    templateValue.value = envVar.value
                                    this.original.settings.envMap[envVar.name].value = envVar.value
                                }
                            }
                        } else {
                            this.editable.settings.env.push(Object.assign({}, envVar))
                            this.original.settings.env.push(Object.assign({}, envVar))
                            this.original.settings.envMap[envVar.name] = envVar
                        }
                    })
                }
            }
        },
        async saveSettings () {
            const settings = {
                env: []
            }
            this.editable.settings.env.forEach(field => {
                if (field.policy === false) {
                    // This is a value that cannot be overwritten, so skip it
                    return
                } else if (field.policy && field.value === this.templateEnvValues[field.name]) {
                    // This is a template value that can be overwritten. Check
                    // if the value matches template - if so, skip adding it
                    return
                }
                settings.env.push({
                    name: field.name,
                    value: field.value
                })
            })
            await projectApi.updateProject(this.project.id, { settings })
            this.$emit('projectUpdated')
            alerts.emit('Project successfully updated.', 'confirmation')
        }
    },
    components: {
        TemplateSettingsEnvironment
    }
}
</script>
