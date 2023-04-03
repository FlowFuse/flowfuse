<template>
    <ff-loading v-if="loading.deleting" message="Deleting Instance..." />
    <ff-loading v-if="loading.duplicating" message="Copying Instance..." />
    <ff-loading v-if="loading.changingStack" message="Changing Stack..." />
    <ff-loading v-if="loading.settingType" message="Setting Type..." />
    <ff-loading v-if="loading.suspend" message="Suspending Instance..." />
    <ff-loading v-if="loading.importing" message="Importing Instance..." />
    <form v-if="!isLoading" class="space-y-6">
        <FormHeading>Change Instance Stack</FormHeading>
        <div v-if="instance.stack && instance.stack.replacedBy" class="flex flex-col space-y-4 max-w-2xl lg:flex-row lg:items-center lg:space-y-0">
            <div class="flex-grow">
                <div class="max-w-sm">
                    There is a new version of the current stack available.
                    Updating the stack will restart the instance.
                </div>
            </div>
            <div class="min-w-fit flex-shrink-0">
                <ff-button :disabled="!instance.projectType" kind="secondary" @click="upgradeStack()">Update Stack</ff-button>
            </div>
        </div>
        <div class="flex flex-col space-y-4 max-w-2xl lg:flex-row lg:items-center lg:space-y-0">
            <div class="flex-grow">
                <div class="max-w-sm">
                    Changing the Instance Stack requires the instance to be restarted.
                    The flows will not be running while this happens.
                </div>
            </div>
            <div class="min-w-fit flex-shrink-0">
                <ff-button :disabled="!instance.projectType" kind="secondary" @click="showChangeStackDialog()">Change Stack</ff-button>
                <ChangeStackDialog ref="changeStackDialog" @confirm="changeStack" />
            </div>
        </div>

        <FormHeading>Copy Instance</FormHeading>

        <div class="flex flex-col space-y-4 max-w-2xl lg:flex-row lg:items-center lg:space-y-0">
            <div class="flex-grow">
                <div class="max-w-sm">
                    Add a new instance to your application, that is a copy of this instance.
                </div>
            </div>
            <div class="min-w-fit flex-shrink-0">
                <ff-button kind="secondary" data-nav="copy-project" @click="showDuplicateInstanceDialog()">Duplicate Instance</ff-button>
            </div>
        </div>

        <FormHeading>Import Instance</FormHeading>
        <div class="flex flex-col space-y-4 max-w-2xl lg:flex-row lg:items-center lg:space-y-0">
            <div class="flex-grow">
                <div class="max-w-sm">
                    Import an existing Node-RED instance.
                </div>
            </div>
            <div class="min-w-fit flex-shrink-0">
                <ff-button kind="secondary" @click="showImportInstanceDialog()">Import Instance</ff-button>
                <ImportInstanceDialog ref="importProjectDialog" @confirm="importProject" />
            </div>
        </div>

        <FormHeading>Change Instance Type</FormHeading>
        <div class="flex flex-col space-y-4 max-w-2xl lg:flex-row lg:items-center lg:space-y-0">
            <div class="flex-grow">
                <div class="max-w-sm">
                    Changing the Instance Type will restart the instance.
                    The flows will not be running while this happens.
                </div>
            </div>
            <div class="min-w-fit flex-shrink-0">
                <ff-button kind="secondary" data-nav="change-instance-settings" @click="showProjectChangeTypePage()">Change Instance Type</ff-button>
            </div>
        </div>

        <FormHeading class="text-red-700">Suspend Instance</FormHeading>
        <div class="flex flex-col space-y-4 max-w-2xl lg:flex-row lg:items-center lg:space-y-0">
            <div class="flex-grow">
                <div v-if="instance?.meta?.state === 'suspended'" class="max-w-sm">
                    Your instance is already suspended. To restart the instance, select "Start" from the Instance actions.
                </div>
                <div v-else class="max-w-sm">
                    Once suspended, your instance will not be available until restarted.
                    While suspended, the instance will consume no <span v-if="features.billing">billable</span> resources.
                </div>
            </div>
            <div class="min-w-fit flex-shrink-0">
                <ff-button kind="danger" :disabled="instance?.meta?.state === 'suspended'" @click="showConfirmSuspendDialog()">Suspend Instance</ff-button>
            </div>
        </div>

        <FormHeading class="text-red-700">Delete Instance</FormHeading>
        <div class="flex flex-col space-y-4 max-w-2xl lg:flex-row lg:items-center lg:space-y-0">
            <div class="flex-grow">
                <div class="max-w-sm">
                    Once deleted, your instance is gone. This cannot be undone.
                </div>
            </div>
            <div class="min-w-fit flex-shrink-0">
                <ff-button data-action="delete-instance" kind="danger" @click="$emit('instance-confirm-delete')">Delete Instance</ff-button>
            </div>
        </div>
    </form>
</template>

<script>
import { useRouter } from 'vue-router'

import { mapState } from 'vuex'

import ChangeStackDialog from './dialogs/ChangeStackDialog'

import ImportInstanceDialog from './dialogs/ImportInstanceDialog'

import InstanceApi from '../../../api/instances'

import FormHeading from '../../../components/FormHeading'
import permissionsMixin from '../../../mixins/Permissions'
import alerts from '../../../services/alerts'
import Dialog from '../../../services/dialog'

export default {
    name: 'InstanceSettingsDanger',
    components: {
        FormHeading,
        ChangeStackDialog,
        ImportInstanceDialog
    },
    mixins: [permissionsMixin],
    inheritAttrs: false,
    props: {
        instance: {
            type: Object,
            required: true
        }
    },
    emits: ['instance-updated', 'instance-confirm-delete'],
    data () {
        return {
            loading: {
                settingType: false,
                deleting: false,
                changingStack: false,
                duplicating: false,
                suspend: false,
                importing: false
            }
        }
    },
    computed: {
        ...mapState('account', ['team', 'features', 'teamMembership']),
        isLoading () {
            return this.loading.deleting || this.loading.suspend || this.loading.changingStack || this.loading.duplicating || this.loading.settingType
        }
    },
    mounted () {
        this.checkAccess()
    },
    methods: {
        async checkAccess () {
            if (!this.hasPermission('project:edit')) {
                useRouter().push({ replace: true, path: 'general' })
            }
        },
        showConfirmSuspendDialog () {
            Dialog.show({
                header: 'Suspend Instance',
                text: 'Are you sure you want to suspend this instance?',
                confirmLabel: 'Suspend',
                kind: 'danger'
            }, () => {
                this.loading.suspend = true
                InstanceApi.suspendInstance(this.instance.id).then(() => {
                    this.$router.push({ name: 'Home' })
                    alerts.emit('Instance successfully suspended.', 'confirmation')
                }).catch(err => {
                    console.warn(err)
                    alerts.emit('Instance failed to suspend.', 'warning')
                }).finally(() => {
                    this.loading.suspend = false
                })
            })
        },
        showProjectChangeTypePage () {
            this.$router.push({
                name: 'ChangeInstanceType'
            })
        },
        showChangeStackDialog () {
            this.$refs.changeStackDialog.show(this.instance)
        },
        showDuplicateInstanceDialog () {
            this.$router.push({
                name: 'ApplicationCreateInstance',
                params: { id: this.instance.application.id, team_slug: this.team.slug },
                query: { sourceInstanceId: this.instance.id }
            })
        },
        showImportInstanceDialog () {
            this.$refs.importProjectDialog.show(this.instance)
        },
        upgradeStack () {
            this.changeStack(this.instance.stack.replacedBy)
        },
        duplicateProject (parts) {
            this.loading.duplicating = true
            InstanceApi.create(parts).then(result => {
                this.$router.push({ name: 'Instance', params: { id: result.id } })
                alerts.emit('Instance successfully duplicated.', 'confirmation')
            }).catch(err => {
                console.error(err)
                alerts.emit('Instance failed to duplicate.', 'warning')
            }).finally(() => {
                this.loading.duplicating = false
            })
        },
        importProject (parts) {
            this.loading.importing = true
            InstanceApi.importProject(this.instance.id, parts).then(result => {
                this.$router.push({ name: 'Instance', params: { id: this.instance.id } })
                alerts.emit('Instance flows imported.', 'confirmation')
            }).catch(err => {
                console.error(err)
                alerts.emit('Failed to import flows.', 'warning')
            }).finally(() => {
                this.loading.importing = false
            })
        },
        changeStack (selectedStack) {
            if (this.instance.stack?.id !== selectedStack) {
                this.loading.changingStack = true
                InstanceApi.changeStack(this.instance.id, selectedStack).then(() => {
                    this.$router.push({ name: 'Instance', params: { id: this.instance.id } })
                    this.$emit('instance-updated')
                    alerts.emit('Instance stack successfully updated.', 'confirmation')
                }).catch(err => {
                    console.warn(err)
                    alerts.emit('Instance stack was not updated due to an error.', 'warning')
                }).finally(() => {
                    this.loading.changingStack = false
                })
            }
        }
    }
}
</script>
