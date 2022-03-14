<template>
    <div class="flex flex-col sm:flex-row mb-8 max-w-4xl">
        <div class="flex-grow">
            <div v-if="!isNew" class="text-gray-800 text-xl"><span class=" font-bold">Template:</span> {{ template.name }}</div>
            <div v-else class="text-gray-800 text-xl"><span class=" font-bold">Create a new template</span></div>
            
        </div>
        <div class="text-right space-x-4" v-if="unsavedChanges">
            <button type="button" class="forge-button-secondary ml-4" @click="cancelEdit">Cancel</button>
            <button type="button" class="forge-button ml-4" :disabled="hasErrors" @click="showSaveTemplateDialog">Save changes</button>
        </div>
        <div class="text-right space-x-4" v-if="isNew">
            <router-link :to="{ name: 'Admin Templates' }" class="forge-button-secondary ml-4">Cancel</router-link>
            <button type="button" :disabled="hasErrors || !createValid" class="forge-button ml-4" @click="createTemplate">Create template</button>
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
    getTemplateValue,
    setTemplateValue,
    defaultTemplateValues,
    templateFields,
    prepareTemplateForEdit,
    templateValidators
} from './utils'

const sideNavigation = [
    { name: "Settings", path: "./settings" },
    { name: "Palette", path: "./palette" }
]


export default {
    name: 'AdminTemplate',
    mixins: [ Breadcrumbs ],
    setup() {
        return {
            sideNavigation
        }
    },
    data() {
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
            handler(v) {
                if (this.template.name) {
                    let changed = false
                    let errors = false
                    this.editable.changed.name = this.editable.name != this.original.name
                    changed = changed || this.editable.changed.name

                    this.editable.changed.active = this.editable.active != this.original.active
                    changed = changed || this.editable.changed.active

                    this.editable.changed.description = this.editable.description != this.original.description
                    changed = changed || this.editable.changed.description

                    templateFields.forEach(field => {
                        this.editable.changed.settings[field] = this.editable.settings[field] != this.original.settings[field]
                        this.editable.changed.policy[field] = this.editable.policy[field] != this.original.policy[field]
                        changed = changed || this.editable.changed.settings[field] || this.editable.changed.policy[field]
                        if (templateValidators[field]) {
                            let validationResult = templateValidators[field](this.editable.settings[field])
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
        },
        'editable.name'(v) {
            if (v === "") {
                this.createValid = false
                this.editable.errors.name = "Required"
            } else {
                this.createValid = true
                this.editable.errors.name = ""
            }
        }
    },
    async created() {
        this.setBreadcrumbs([
            {label:"Admin", to:{name:"Admin Settings"}},
            {label:"Templates", to:{name:"Admin Templates"}}
        ]);
        await this.loadTemplate()
    },
    methods: {
        async loadTemplate() {
            try {
                if (this.$route.params.id === 'create') {
                    this.isNew = true
                    this.template = {
                        name: '',
                        active: false,
                        description: '',
                        settings: {},
                        policy: {}
                    }
                } else {
                    this.template = await templateApi.getTemplate(this.$route.params.id)
                    this.isNew = false
                }

                const preparedTemplate = prepareTemplateForEdit(this.template)

                this.editable = preparedTemplate.editable
                this.original = preparedTemplate.original
                

            } catch(err) {
                console.log(err)
                this.$router.push({
                    name: "PageNotFound",
                    params: { pathMatch: this.$router.currentRoute.value.path.substring(1).split('/') },
                    // preserve existing query and hash if any
                    query: this.$router.currentRoute.value.query,
                    hash: this.$router.currentRoute.value.hash,
                })
                return;
            }
            this.setBreadcrumbs([
                {label:"Admin", to:{name:"Admin Settings"}},
                {label:"Templates", to:{name:"Admin Templates"}},
                {label: this.isNew?"Create template":this.template.name }
            ])
        },
        cancelEdit() {
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
            this.editable.errors = {}
        },
        showSaveTemplateDialog() {
            this.$refs.adminTemplateSaveDialog.show();
        },
        async saveTemplate() {
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
            try {
                await templateApi.updateTemplate(this.template.id, template)
                await this.loadTemplate()
            } catch(err) {
                console.log(err)
            }


        },
        async createTemplate() {
            const template = {
                name: this.editable.name,
                settings: {},
                policy: {}
            }
            templateFields.forEach(field => {
                setTemplateValue(template.settings, field, this.editable.settings[field])
                setTemplateValue(template.policy, field, this.editable.policy[field])
            })
            try {
                const result = await templateApi.create(template)
                 this.$router.push({
                    name: "Admin Templates",
                })

            } catch(err) {
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
