<template>
    <div class="mb-3">
        <SectionTopMenu hero="Settings" info="">
            <template #tools>
                <ff-button
                    v-if="tools.saveButton.visible"
                    :disabled="tools.saveButton.disabled"
                    class="ff-btn ff-btn--primary"
                    size="small"
                    @click="onSaveButtonClick"
                >
                    {{ tools.saveButton.label }}
                </ff-button>
            </template>
        </SectionTopMenu>
    </div>
    <div class="flex flex-col sm:flex-row">
        <SectionSideMenu :options="navigation" />
        <div class="flex-grow">
            <router-view v-slot="{ Component }">
                <component
                    :is="Component"
                    ref="settingsPage"
                    :project="instance"
                    :instance="instance"
                    @instance-updated="$emit('instance-updated')"
                    @instance-confirm-suspend="$emit('instance-confirm-suspend')"
                    @instance-confirm-delete="$emit('instance-confirm-delete')"
                    @save-button-state="onSaveButtonStateChange"
                />
            </router-view>
        </div>
    </div>
</template>

<script>
import { mapState } from 'vuex'

import SectionSideMenu from '../../../components/SectionSideMenu.vue'
import SectionTopMenu from '../../../components/SectionTopMenu.vue'
import permissionsMixin from '../../../mixins/Permissions.js'

export default {
    name: 'InstanceSettings',
    components: {
        SectionTopMenu,
        SectionSideMenu
    },
    mixins: [permissionsMixin],
    inheritAttrs: false,
    props: {
        instance: {
            type: Object,
            required: true
        }
    },
    emits: ['instance-updated', 'instance-confirm-delete', 'instance-confirm-suspend'],
    data () {
        return {
            sideNavigation: [],
            tools: {
                saveButton: {
                    visible: false,
                    disabled: true,
                    label: 'Save Changes'
                }
            }
        }
    },
    computed: {
        ...mapState('account', ['team', 'teamMembership', 'features', 'settings']),
        navigation () {
            const canEditProject = this.hasPermission('project:edit')

            const routes = [
                { name: 'General', path: { name: 'instance-settings-general' } },
                { name: 'Environment', path: { name: 'instance-settings-environment' } },
                {
                    name: 'High Availability',
                    path: { name: 'instance-settings-ha' },
                    hidden: !canEditProject || !!this.features.ha === false
                },
                {
                    name: 'Protect Instance',
                    path: { name: 'instance-settings-protect' },
                    hidden: !canEditProject ||
                        !!this.features?.protectedInstance === false ||
                        !!this.team?.type?.properties?.features?.protectedInstance === false
                },
                { name: 'Editor', path: { name: 'instance-settings-editor' }, hidden: !canEditProject },
                { name: 'Security', path: { name: 'instance-settings-security' }, hidden: !canEditProject },
                { name: 'Palette', path: { name: 'instance-settings-palette' }, hidden: !canEditProject },
                { name: 'Launcher', path: { name: 'instance-settings-launcher' }, hidden: !canEditProject },
                {
                    name: 'Alerts',
                    path: { name: 'instance-settings-alerts' },
                    hidden: !canEditProject ||
                        !!this.features?.emailAlerts === false ||
                        !!this.team?.type?.properties?.features?.emailAlerts === false
                }
            ]
            return routes.map(route => {
                if (this.$route.name.includes('-editor-')) {
                    route.path.name = route.path.name.replace('instance-', 'instance-editor-')
                }
                return route
            })
        }
    },
    methods: {
        onSaveButtonStateChange (state) {
            this.tools.saveButton = {
                ...this.tools.saveButton,
                ...state
            }
        },
        onSaveButtonClick () {
            if (
                Object.prototype.hasOwnProperty.call(this.$refs.settingsPage, 'saveSettings') &&
                typeof this.$refs.settingsPage.saveSettings === 'function'
            ) {
                this.$refs.settingsPage.saveSettings()
            }
        }
    }
}
</script>
