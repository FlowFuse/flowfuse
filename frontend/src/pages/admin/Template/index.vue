<template>
    <div class="flex flex-col sm:flex-row mb-8 max-w-4xl">
        <div class="flex-grow">
            <div v-if="!isNew" class="text-gray-800 text-xl"><span class=" font-bold">Template:</span> {{ template.name }}</div>
            <div v-else class="text-gray-800 text-xl"><span class=" font-bold">Create a new template</span></div>
            
        </div>
        <div class="text-right space-x-4" v-if="unsavedChanges">
            <button type="button" class="forge-button-secondary ml-4" @click="cancelEdit">Cancel</button>
            <button type="button" class="forge-button ml-4" @click="showSaveTemplateDialog">Save changes</button>
        </div>
        <div class="text-right space-x-4" v-if="isNew">
            <router-link :to="{ name: 'Admin Templates' }" class="forge-button-secondary ml-4">Cancel</router-link>
            <button type="button" :disabled="!createValid" class="forge-button ml-4" @click="createTemplate">Create template</button>
        </div>
    </div>
    <div class="flex flex-col sm:flex-row">
        <SectionSideMenu :options="sideNavigation" />
        <div class="flex-grow">
            <router-view :template="template" :foo="true" v-model="editableTemplate"></router-view>
        </div>
    </div>
    <AdminTemplateSaveDialog @saveTemplate="saveTemplate" ref="adminTemplateSaveDialog"/>
</template>

<script>
import templateApi from '@/api/templates'
import Breadcrumbs from '@/mixins/Breadcrumbs'
import SectionSideMenu from '@/components/SectionSideMenu'
import AdminTemplateSaveDialog from './dialogs/AdminTemplateSaveDialog'

const sideNavigation = [
    { name: "Settings", path: "./settings" },
    { name: "Palette", path: "./palette" }
]

const templateFields = [
    'disableEditor',
    'httpAdminRoot',
    'editorTheme',
    'codeEditor',
    'palette_allowInstall',
    'palette_allowList',
    'palette_denyList',
    'palette_nodeExcludes',
    'modules_allowInstall',
    'modules_allowList',
    'modules_denyList'
]
const defaultTemplateValues = {
    disableEditor: false,
    httpAdminRoot: '/editor',
    editorTheme: 'node-red',
    codeEditor: 'monaco',
    palette_allowInstall: true,
    palette_allowList: '',
    palette_denyList: '',
    palette_nodeExcludes: '',
    modules_allowInstall: true,
    modules_allowList: '',
    modules_denyList: ''
}

function getTemplateValue(template, path) {
    const parts = path.split("_")
    let p = template
    while (parts.length > 0) {
        const part = parts.shift()
        if (p[part] === undefined) {
            return
        } else {
            p = p[part]
        }
    }
    return p
}

function setTemplateValue(template,path,value) {
    const parts = path.split("_")
    let p = template
    while (parts.length > 1) {
        const part = parts.shift()
        if (p[part] === undefined) {
            p[part] = {}
        }
        p = p[part]
    }
    const lastPart = parts.shift()
    p[lastPart] = value
}

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
            editableTemplate: {
                name: '',
                settings: {},
                policy: {},
                changedName: false,
                changedSettings: {},
                changedPolicy: {},
                errors: {}
            },
            template: {},
            originalValues: {
                name: '',
                settings: {},
                policy: {},
            },
            unsavedChanges: false
        }
    },
    watch: {
        editableTemplate: {
            deep: true,
            handler(v) {
                if (this.template.name) {
                    let changed = false
                    this.editableTemplate.changedName = this.editableTemplate.name != this.originalValues.name
                    changed = changed || this.editableTemplate.changedName

                    templateFields.forEach(field => {
                        this.editableTemplate.changedSettings[field] = this.editableTemplate.settings[field] != this.originalValues.settings[field]
                        this.editableTemplate.changedPolicy[field] = this.editableTemplate.policy[field] != this.originalValues.policy[field]
                        changed = changed || this.editableTemplate.changedSettings[field] || this.editableTemplate.changedPolicy[field]
                    })
                    this.unsavedChanges = changed
                }
                
            }
        },
        'editableTemplate.name'(v) {
            if (v === "") {
                this.createValid = false
                this.editableTemplate.errors.name = "Required"
            } else {
                this.createValid = true
                this.editableTemplate.errors.name = ""
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
                        settings: {},
                        policy: {}
                    }
                } else {
                    this.template = await templateApi.getTemplate(this.$route.params.id)
                    this.isNew = false
                }
                this.editableTemplate.name = this.template.name
                this.originalValues.name = this.template.name
                this.editableTemplate.changedName = false
                this.editableTemplate.errors = {}

                templateFields.forEach(field => {
                    const templateValue = getTemplateValue(this.template.settings, field)
                    if (templateValue !== undefined) {
                        this.editableTemplate.settings[field] = templateValue
                        this.originalValues.settings[field] = templateValue
                    } else {
                        this.editableTemplate.settings[field] = defaultTemplateValues[field]
                        this.originalValues.settings[field] = defaultTemplateValues[field]
                    }
                    this.editableTemplate.changedSettings[field] = false

                    const policyValue = getTemplateValue(this.template.policy, field)
                    if (policyValue !== undefined) {
                        this.editableTemplate.policy[field] = policyValue
                        this.originalValues.policy[field] = policyValue
                    } else {
                        // By default, policy should be to lock values
                        this.editableTemplate.policy[field] = false
                        this.originalValues.policy[field] = false
                    }
                    this.editableTemplate.changedPolicy[field] = false
                })

            } catch(err) {
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
            this.changedName = false
            this.editableTemplate.name = this.originalValues.name
            templateFields.forEach(field => {
                this.editableTemplate.changedSettings[field] = false
                this.editableTemplate.settings[field] = this.originalValues.settings[field]
                this.editableTemplate.changedPolicy[field] = false
                this.editableTemplate.policy[field] = this.originalValues.policy[field]
            })
        },
        showSaveTemplateDialog() {
            this.$refs.adminTemplateSaveDialog.show();
        },
        async saveTemplate() {
            // Updating an existing template
            const template = {
                name: this.editableTemplate.name,
                settings: {},
                policy: {}
            }
            templateFields.forEach(field => {
                setTemplateValue(template.settings, field, this.editableTemplate.settings[field])
                setTemplateValue(template.policy, field, this.editableTemplate.policy[field])
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
                name: this.editableTemplate.name,
                settings: {},
                policy: {}
            }
            templateFields.forEach(field => {
                setTemplateValue(template.settings, field, this.editableTemplate.settings[field])
                setTemplateValue(template.policy, field, this.editableTemplate.policy[field])
            })
            try {
                await templateApi.create(template)
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
