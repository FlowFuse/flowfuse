<template>
    <div class="flex flex-col sm:flex-row mb-8 max-w-4xl">
        <div class="flex-grow">
            <div class="text-gray-800 text-xl">
                <router-link class="ff-link font-bold" :to="{path: '/admin/templates'}">Templates</router-link>
                <!-- <nav-item :icon="icons.breadcrumbSeparator" label="sss"></nav-item> -->
                <ChevronRightIcon class="ff-icon" />
                <span v-if="!isNew">{{ template.name }}</span>
                <span v-if="isNew">Create a new template</span>
            </div>
        </div>
        <div class="text-right space-x-4 flex h-8">
            <template v-if="!isNew">
                <ff-button v-if="unsavedChanges" kind="secondary" class="ml-4" @click="cancelEdit">Discard changes</ff-button>
                <ff-button class="ml-4" :disabled="hasErrors || !unsavedChanges" @click="showSaveTemplateDialog">Save changes</ff-button>
            </template>
            <template v-else-if="isNew">
                <ff-button :to="{ name: 'admin-templates' }" kind="secondary">Cancel</ff-button>
                <ff-button :disabled="hasErrors || !createValid" class="ml-4" @click="createTemplate">Create template</ff-button>
            </template>
        </div>
    </div>
    <div class="flex flex-col sm:flex-row">
        <SectionSideMenu :options="sideNavigation" />
        <div class="flex-grow">
            <router-view v-model="editable" :editTemplate="true" />
        </div>
    </div>
</template>

<script>
import { ChevronRightIcon } from '@heroicons/vue/solid'

import { mapState } from 'vuex'

import templateApi from '../../../api/templates.js'
import SectionSideMenu from '../../../components/SectionSideMenu.vue'
import alerts from '../../../services/alerts.js'
import Dialog from '../../../services/dialog.js'

import {
    comparePaletteModules,
    prepareTemplateForEdit,
    setObjectValue,
    setTemplateValue,
    templateFields,
    templateValidators
} from './utils.js'

export default {
    name: 'AdminTemplate',
    components: {
        SectionSideMenu,
        ChevronRightIcon
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
            modulesChanged: false,
            needsRestart: false,
            hasErrors: false,
            icons: {
                breadcrumbSeparator: ChevronRightIcon
            }
        }
    },
    computed: {
        ...mapState('account', ['features', 'settings']),
        sideNavigation: function () {
            const nav = [
                { name: 'Settings', path: './settings' },
                { name: 'Security', path: './Security' },
                { name: 'Environment', path: './environment' },
                { name: 'Palette', path: './palette' }
            ]
            if (this.features?.emailAlerts) {
                nav.push({ name: 'Alerts', path: './alerts' })
            }
            return nav
        }
    },
    watch: {
        editable: {
            deep: true,
            handler (v) {
                // Only check for changes in existing templates
                if (this.template.name) {
                    let changed = false
                    let modulesChanged = false
                    let needsRestart = false
                    let errors = false
                    this.editable.changed.name = this.editable.name !== this.original.name
                    changed = changed || this.editable.changed.name

                    this.editable.changed.active = this.editable.active !== this.original.active
                    changed = changed || this.editable.changed.active

                    this.editable.changed.description = this.editable.description !== this.original.description
                    changed = changed || this.editable.changed.description
                    templateFields.forEach(field => {
                        if (field === 'palette_modules') {
                            const pmChanges = comparePaletteModules(this.editable.settings.palette_modules, this.original.settings.palette_modules)
                            this.editable.changed.palette_modules = this.editable.changed.palette_modules || pmChanges.changed
                            modulesChanged = modulesChanged || pmChanges.changed
                            changed = changed || pmChanges.changed
                            errors = errors || pmChanges.errors
                        } else if (field === 'palette_catalogue') {
                            let paletteCatalogueHasChanged = this.original.settings.palette_catalogue.length !== this.editable.settings.palette_catalogue.length
                            if (!paletteCatalogueHasChanged) {
                                for (const i in this.editable.settings.palette_catalogue) {
                                    if (this.editable.settings.palette_catalogue[i] !== this.original.settings.palette_catalogue[i]) {
                                        paletteCatalogueHasChanged = true
                                        break
                                    }
                                }
                            }
                            needsRestart = needsRestart || paletteCatalogueHasChanged
                            this.editable.changed.settings.palette_catalogue = paletteCatalogueHasChanged
                        } else {
                            this.editable.changed.settings[field] = this.editable.settings[field] !== this.original.settings[field]
                            needsRestart = needsRestart || this.editable.changed.settings[field]
                        }
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
                    this.modulesChanged = modulesChanged
                    this.needsRestart = needsRestart
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
                console.error(err)
                this.$router.push({
                    name: 'page-not-found',
                    params: { pathMatch: this.$router.currentRoute.value.path.substring(1).split('/') },
                    // preserve existing query and hash if any
                    query: this.$router.currentRoute.value.query,
                    hash: this.$router.currentRoute.value.hash
                })
            }
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
            const lines = ['Are you sure you want to save this template?']
            if (this.needsRestart) {
                lines.push('Application instances using this template will need to be manually restarted to pick up the changes.')
            }
            if (this.modulesChanged) {
                lines.push('NOTE: Existing instances will not inherit the modules in this list.  They must be added manually in the instance settings.')
            }
            Dialog.show({
                header: 'Update Template',
                text: lines.join('\n'),
                confirmLabel: 'Save Template'
            }, this.saveTemplate)
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

            if (this.editable.settings.httpNodeAuth_type !== 'basic') {
                this.editable.settings.httpNodeAuth_user = ''
                this.editable.settings.httpNodeAuth_pass = ''
            }

            templateFields.forEach(field => {
                setTemplateValue(template.settings, field, this.editable.settings[field])
                setObjectValue(template.policy, field, this.editable.policy[field])
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
                if (err.response?.data) {
                    alerts.emit(err.response.data.error, 'warning')
                } else {
                    alerts.emit('Unknown Error. Check logs.', 'warning')
                }
                console.error(err)
            }
        },
        async createTemplate () {
            const template = {
                name: this.editable.name,
                active: this.editable.active,
                description: this.editable.description,
                settings: {},
                policy: {}
            }
            templateFields.forEach(field => {
                setTemplateValue(template.settings, field, this.editable.settings[field])
                setObjectValue(template.policy, field, this.editable.policy[field])
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
                    name: 'admin-templates'
                })
            } catch (err) {
                if (err.response?.data) {
                    alerts.emit(err.response.data.error, 'warning')
                } else {
                    alerts.emit('Unknown Error. Check logs.', 'warning')
                }
                console.error(err)
            }
        }
    }
}
</script>
