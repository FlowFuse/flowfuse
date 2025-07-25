<template>
    <form class="space-y-6">
        <TemplateSettingsEnvironment
            v-model="editable"
            :readOnly="!hasPermission('device:edit-env')"
            :editTemplate="false"
            :original-env-vars="original?.settings?.env ?? []"
            @validated="onFormValidated"
        />
    </form>
</template>

<script>
import { mapState } from 'vuex'

import InstanceApi from '../../../api/instances.js'
import permissionsMixin from '../../../mixins/Permissions.js'
import Dialog from '../../../services/dialog.js'
import TemplateSettingsEnvironment from '../../admin/Template/sections/Environment.vue'
import {
    prepareTemplateForEdit
} from '../../admin/Template/utils.js'

export default {
    name: 'InstanceSettingsEnvironment',
    components: {
        TemplateSettingsEnvironment
    },
    mixins: [permissionsMixin],
    beforeRouteLeave: async function (_to, _from, next) {
        if (this.unsavedChanges) {
            const dialogOpts = {
                header: 'Unsaved changes',
                kind: 'danger',
                text: 'You have unsaved changes. Are you sure you want to leave?',
                confirmLabel: 'Yes, lose changes'
            }
            const answer = await Dialog.showAsync(dialogOpts)
            if (answer === 'confirm') {
                next()
            } else {
                next(false)
            }
        } else {
            next()
        }
    },
    inheritAttrs: false,
    props: {
        project: {
            type: Object,
            required: true
        }
    },
    emits: ['instance-updated', 'save-button-state', 'restart-instance'],
    data () {
        return {
            unsavedChanges: false,
            hasErrors: false,
            editable: {
                name: '',
                settings: { env: [] },
                policy: {},
                changed: {
                    name: false,
                    description: false,
                    settings: {},
                    policy: {}
                }
            },
            original: {},
            templateEnvValues: {}
        }
    },
    computed: {
        ...mapState('account', ['teamMembership']),
        saveButton () {
            return {
                visible: this.hasPermission('device:edit-env'),
                disabled: !this.unsavedChanges || this.hasErrors
            }
        }
    },
    watch: {
        project: 'getSettings',
        'editable.settings.env': {
            deep: true,
            handler (v) {
                if (this.project.template) {
                    let changed = false

                    let originalCount = 0
                    this.editable.settings.env.forEach(field => {
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
                                } else if (original.hidden !== field.hidden) {
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
                }
            }
        },
        saveButton: {
            immediate: true,
            handler: function (state) {
                this.$emit('save-button-state', state)
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
                this.editable.settings.env.forEach((envVar, index) => {
                    envVar.index = index // ensure all env vars have an index
                    templateEnvMap[envVar.name] = envVar
                    this.templateEnvValues[envVar.name] = envVar.value
                })
                if (this.project.settings.env) {
                    this.project.settings.env.forEach((envVar) => {
                        // hidden key backwards compatability
                        envVar = {
                            hidden: false,
                            ...envVar
                        }
                        envVar.index = this.editable.settings.env.length // ensure all env vars have an index
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
                    // This is a template value that can be overwritten.
                    // If not hidden and the value matches the template, skip adding it.
                    // Otherise, if hidden, send the value back and let the runtime work
                    // out whether to add/update it to the instance level settings
                    if (!field.hidden) {
                        return
                    }
                }
                settings.env.push({
                    name: field.name,
                    value: field.value,
                    hidden: field.hidden
                })
            })
            InstanceApi.updateInstance(this.project.id, { settings })
                .then(() => {
                    // wait before we reload the instance so we don't get a blip by returning the old values
                    setTimeout(() => this.$emit('instance-updated'), 1000)
                })
                .then(() => {
                    // is instance running
                    if (this.project.meta.state === 'running') {
                        Dialog.show({
                            header: 'Restart Required',
                            html: '<p>Instance settings have been successfully updated, but the Instance must be restarted for these settings to take effect.</p><p>Would you like to restart the Instance now?</p>',
                            confirmLabel: 'Restart Now',
                            cancelLabel: 'Restart Later'
                        }, () => {
                            // restart the instance
                            this.$emit('restart-instance')
                        })
                    }
                })
                .catch(e => e)
        },
        onFormValidated (hasErrors) {
            this.hasErrors = hasErrors
        }
    }
}
</script>
