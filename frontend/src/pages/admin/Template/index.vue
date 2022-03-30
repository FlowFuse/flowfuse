<template>
    <div class="flex flex-col sm:flex-row mb-8 max-w-4xl">
        <div class="flex-grow">
            <div v-if="!isNew" class="text-gray-800 text-xl"><span class=" font-bold">Template:</span> {{ template.name }}</div>
            <div v-else class="text-gray-800 text-xl"><span class=" font-bold">Create a new template</span></div>

        </div>
        <div class="text-right space-x-4 flex h-8" >
            <template v-if="unsavedChanges">
                <ff-button kind="secondary" class="ml-4" @click="cancelEdit">Cancel</ff-button>
                <ff-button class="ml-4" :disabled="hasErrors" @click="showSaveTemplateDialog">Save changes</ff-button>
            </template>
            <template v-else-if="isNew">
                <ff-button :to="{ name: 'Admin Templates' }" kind="secondary">Cancel</ff-button>
                <ff-button :disabled="hasErrors || !createValid" class="ml-4" @click="createTemplate">Create template</ff-button>
            </template>
        </div>
    </div>
    <div class="flex flex-col sm:flex-row">
        <SectionSideMenu :options="sideNavigation" />
        <div class="flex-grow">
            <router-view v-model="editable" :editTemplate="true"></router-view>
        </div>
    </div>
    <AdminTemplateSaveDialog @saveTemplate="saveTemplate" ref="adminTemplateSaveDialog"/>
</template>

<script>
import templateApi from '@/api/templates'
import Breadcrumbs from '@/mixins/Breadcrumbs'
import SectionSideMenu from '@/components/SectionSideMenu'
import AdminTemplateSaveDialog from './dialogs/AdminTemplateSaveDialog'
import {
    setTemplateValue,
    templateFields,
    prepareTemplateForEdit,
    templateValidators
} from './utils'

const sideNavigation = [
    { name: 'Settings', path: './settings' },
    { name: 'Environment', path: './environment' },
    { name: 'Palette', path: './palette' }
]

export default {
    name: 'AdminTemplate',
    mixins: [Breadcrumbs],
    setup () {
        return {
            sideNavigation
        }
    },
    data () {
        return {
            isNew: false,
            createValid: false,
            editable: {
                name: '',
                active: false,
                description: '',
                settings: {},
                policy: {},
                changed: {
                    name: false,
                    active: false,
                    description: false,
                    settings: {},
                    policy: {}
                },
                errors: {}
            },
            template: {},
            original: {
                name: '',
                active: false,
                description: '',
                settings: {},
                policy: {}
            },
            unsavedChanges: false,
            hasErrors: false
        }
    },
    watch: {
        editable: {
            deep: true,
            handler (v) {
                // Only check for changes in existing templates
                if (this.template.name) {
                    let changed = false
                    let errors = false
                    this.editable.changed.name = this.editable.name !== this.original.name
                    changed = changed || this.editable.changed.name

                    this.editable.changed.active = this.editable.active !== this.original.active
                    changed = changed || this.editable.changed.active

                    this.editable.changed.description = this.editable.description !== this.original.description
                    changed = changed || this.editable.changed.description

                    templateFields.forEach(field => {
                        this.editable.changed.settings[field] = this.editable.settings[field] !== this.original.settings[field]
                        this.editable.changed.policy[field] = this.editable.policy[field] !== this.original.policy[field]
                        changed = changed || this.editable.changed.settings[field] || this.editable.changed.policy[field]
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

                    let envChanged = false
                    let originalCount = 0
                    this.editable.settings.env.forEach(field => {
                        if (/^add/.test(field.index)) {
                            envChanged = true
                        } else {
                            originalCount++
                            if (this.original.settings.envMap[field.name]) {
                                const original = this.original.settings.envMap[field.name]
                                if (original.index !== field.index) {
                                    envChanged = true
                                } else if (original.name !== field.name) {
                                    envChanged = true
                                } else if (original.value !== field.value) {
                                    envChanged = true
                                } else if (original.policy !== field.policy) {
                                    envChanged = true
                                }
                            } else {
                                envChanged = true
                            }
                        }
                    })
                    if (originalCount !== this.original.settings.env.length) {
                        envChanged = true
                    }
                    this.editable.changed.env = envChanged
                    changed = changed || envChanged
                    this.unsavedChanges = changed
                    this.hasErrors = errors
                }
            }
        },
        'editable.name' (v) {
            if (v === '') {
                this.createValid = false
                this.editable.errors.name = 'Required'
            } else {
                this.createValid = true
                this.editable.errors.name = ''
            }
        }
    },
    async created () {
        this.setBreadcrumbs([
            { label: 'Admin', to: { name: 'Admin Settings' } },
            { label: 'Templates', to: { name: 'Admin Templates' } }
        ])
        await this.loadTemplate()
    },
    methods: {
        async loadTemplate () {
            try {
                if (this.$route.params.id === 'create') {
                    this.isNew = true
                    this.template = {
                        name: '',
                        active: false,
                        description: '',
                        settings: {
                            env: []
                        },
                        policy: {}
                    }
                } else {
                    this.template = await templateApi.getTemplate(this.$route.params.id)
                    this.isNew = false
                }

                const preparedTemplate = prepareTemplateForEdit(this.template)

                this.editable = preparedTemplate.editable
                this.original = preparedTemplate.original
            } catch (err) {
                console.log(err)
                this.$router.push({
                    name: 'PageNotFound',
                    params: { pathMatch: this.$router.currentRoute.value.path.substring(1).split('/') },
                    // preserve existing query and hash if any
                    query: this.$router.currentRoute.value.query,
                    hash: this.$router.currentRoute.value.hash
                })
                return
            }
            this.setBreadcrumbs([
                { label: 'Admin', to: { name: 'Admin Settings' } },
                { label: 'Templates', to: { name: 'Admin Templates' } },
                { label: this.isNew ? 'Create template' : this.template.name }
            ])
        },
        cancelEdit () {
            this.editable.name = this.original.name
            this.editable.changed.name = false
            this.editable.active = this.original.active
            this.editable.changed.active = false
            this.editable.description = this.original.description
            this.editable.changed.description = false
            templateFields.forEach(field => {
                this.editable.changed.settings[field] = false
                this.editable.settings[field] = this.original.settings[field]
                this.editable.changed.policy[field] = false
                this.editable.policy[field] = this.original.policy[field]
            })
            this.editable.settings.env = this.original.settings.env.map(f => Object.assign({}, f))
            this.editable.errors = {}
        },
        showSaveTemplateDialog () {
            this.$refs.adminTemplateSaveDialog.show()
        },
        async saveTemplate () {
            // Updating an existing template
            const template = {
                name: this.editable.name,
                active: this.editable.active,
                description: this.editable.description,
                settings: {},
                policy: {}
            }
            templateFields.forEach(field => {
                setTemplateValue(template.settings, field, this.editable.settings[field])
                setTemplateValue(template.policy, field, this.editable.policy[field])
            })

            template.settings.env = []
            this.editable.settings.env.forEach(envField => {
                if (envField.name.length > 0 && !/ /.test(envField.name)) {
                    template.settings.env.push({
                        name: envField.name.trim(),
                        value: envField.value,
                        policy: envField.policy
                    })
                }
            })

            try {
                await templateApi.updateTemplate(this.template.id, template)
                await this.loadTemplate()
            } catch (err) {
                console.log(err)
            }
        },
        async createTemplate () {
            const template = {
                name: this.editable.name,
                settings: {},
                policy: {}
            }
            templateFields.forEach(field => {
                setTemplateValue(template.settings, field, this.editable.settings[field])
                setTemplateValue(template.policy, field, this.editable.policy[field])
            })

            template.settings.env = []
            this.editable.settings.env.forEach(envField => {
                if (envField.name.length > 0 && !/ /.test(envField.name)) {
                    template.settings.env.push({
                        name: envField.name.trim(),
                        value: envField.value,
                        policy: envField.policy
                    })
                }
            })

            try {
                await templateApi.create(template)
                this.$router.push({
                    name: 'Admin Templates'
                })
            } catch (err) {
                console.log(err)
            }
        }
    },
    components: {
        SectionSideMenu,
        AdminTemplateSaveDialog
    }
}
</script>
