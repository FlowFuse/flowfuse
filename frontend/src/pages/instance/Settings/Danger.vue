<template>
    <ff-loading v-if="loading.deleting" :message="$t('ui.deletingInstance')" />
    <ff-loading v-if="loading.duplicating" :message="$t('ui.copyingInstance')" />
    <ff-loading v-if="loading.changingStack" :message="$t('ui.changingNodeRedVersion')" />
    <ff-loading v-if="loading.settingType" :message="$t('ui.settingType')" />
    <ff-loading v-if="loading.suspend" :message="$t('ui.suspendingInstance')" />
    <ff-loading v-if="loading.importing" :message="$t('ui.importingInstance')" />
    <form v-if="!isLoading" class="space-y-6">
        <template v-if="hasPermission('project:edit', { application: instance.application })">
            <FormHeading>{{ $t('ui.changeInstanceNodeRedVersion') }}</FormHeading>
            <div ref="updateStack" class="flex flex-col space-y-4 max-w-2xl lg:flex-row lg:items-center lg:space-y-0">
                <div class="grow">
                    <p v-if="instance.stack && instance.stack.replacedBy" class="max-w-sm mb-5">
                        {{ $t('ui.thereIsANewVersionOfNodeRedAvailable') }}
                    </p>
                    <p class="max-w-sm">
                        {{ $t('ui.changingTheInstancesNodeRedVersionRequiresTheIns') }}
                    </p>
                </div>
                <div class="min-w-fit shrink-0 flex-col gap-5">
                    <ff-button
                        v-if="instance.stack && instance.stack.replacedBy"
                        ref="updateStackButton"
                        class="mb-5"
                        data-action="update-stack"
                        :disabled="!instance.projectType"
                        kind="primary"
                        @click="upgradeStack()"
                    >
                        {{ $t('ui.updateNodeRedVersion') }}
                    </ff-button>
                    <ff-button
                        data-action="change-stack"
                        :disabled="!instance.projectType"
                        kind="secondary"
                        @click="showChangeStackDialog()"
                    >
                        {{ $t('ui.changeNodeRedVersion') }}
                    </ff-button>
                    <ChangeStackDialog ref="changeStackDialog" @confirm="changeStack" />
                </div>
            </div>
        </template>

        <template v-if="hasPermission('project:create', { application: instance.application })">
            <FormHeading>{{ $t('ui.copyInstance') }}</FormHeading>

            <div class="flex flex-col space-y-4 max-w-2xl lg:flex-row lg:items-center lg:space-y-0">
                <div class="grow">
                    <div class="max-w-sm">
                        {{ $t('ui.addANewInstanceToYourApplicationThatIsACopyOfThi') }}
                    </div>
                </div>
                <div class="min-w-fit shrink-0">
                    <ff-button
                        kind="secondary"
                        data-nav="copy-project"
                        :to="{
                            name: 'instance-duplicate',
                            params: { id: instance.id, team_slug: team.slug },
                        }"
                    >
                        {{ $t('ui.duplicateInstance') }}
                    </ff-button>
                </div>
            </div>
        </template>

        <template v-if="hasPermission('project:edit', { application: instance.application })">
            <FormHeading>{{ $t('ui.importInstance') }}</FormHeading>
            <div class="flex flex-col space-y-4 max-w-2xl lg:flex-row lg:items-center lg:space-y-0">
                <div class="grow">
                    <div class="max-w-sm">
                        {{ $t('ui.importAnExistingNodeRedInstance') }}
                    </div>
                </div>
                <div class="min-w-fit shrink-0">
                    <ff-button data-action="import-instance" kind="secondary" @click="showImportInstanceDialog()">{{ $t('ui.importInstance') }}</ff-button>
                    <ImportInstanceDialog ref="importInstanceDialog" data-el="dialog-import-instance" @confirm="importInstance" />
                </div>
            </div>
        </template>

        <template v-if="hasPermission('project:edit', { application: instance.application })">
            <FormHeading>{{ $t('ui.changeInstanceType') }}</FormHeading>
            <div class="flex flex-col space-y-4 max-w-2xl lg:flex-row lg:items-center lg:space-y-0">
                <div class="grow">
                    <div class="max-w-sm">
                        {{ $t('ui.changingTheInstanceTypeWillRestartTheInstanceThe') }}
                    </div>
                </div>
                <div class="min-w-fit shrink-0">
                    <ff-button kind="secondary" data-nav="change-instance-settings" @click="showProjectChangeTypePage()">{{ $t('ui.changeInstanceType') }}</ff-button>
                </div>
            </div>
        </template>

        <template v-if="hasPermission('project:change-status', { application: instance.application })">
            <FormHeading class="text-red-700">{{ $t('ui.suspendInstance') }}</FormHeading>
            <div class="flex flex-col space-y-4 max-w-2xl lg:flex-row lg:items-center lg:space-y-0">
                <div class="grow">
                    <div v-if="instance?.meta?.state === 'suspended'" class="max-w-sm">
                        {{ $t('ui.yourInstanceIsAlreadySuspendedToRestartTheInstan') }}
                    </div>
                    <div v-else class="max-w-sm">
                        {{ $t('ui.onceSuspendedYourInstanceWillNotBeAvailableUntil') }} <span v-if="features.billing">{{ $t('ui.billable') }}</span> {{ $t('ui.resources2') }}
                    </div>
                </div>
                <div class="min-w-fit shrink-0">
                    <ff-button data-action="suspend-instance" kind="danger" :disabled="instance?.meta?.state === 'suspended'" @click="$emit('instance-confirm-suspend')">{{ $t('ui.suspendInstance') }}</ff-button>
                </div>
            </div>
        </template>

        <template v-if="hasPermission('project:delete', { application: instance.application })">
            <FormHeading class="text-red-700">{{ $t('ui.deleteInstance') }}</FormHeading>
            <div class="flex flex-col space-y-4 max-w-2xl lg:flex-row lg:items-center lg:space-y-0">
                <div class="grow">
                    <div class="max-w-sm">
                        {{ $t('ui.onceDeletedYourInstanceIsGoneThisCannotBeUndone') }}
                    </div>
                </div>
                <div class="min-w-fit shrink-0">
                    <ff-button data-action="delete-instance" kind="danger" @click="$emit('instance-confirm-delete')">{{ $t('ui.deleteInstance') }}</ff-button>
                </div>
            </div>
        </template>
    </form>
</template>

<script>

import { mapState } from 'pinia'
import { useRouter } from 'vue-router'

import InstanceApi from '../../../api/instances.js'

import FormHeading from '../../../components/FormHeading.vue'
import usePermissions from '../../../composables/Permissions.js'
import { scrollToAndJiggleHighlight } from '../../../composables/Ux.js'
import { t } from '../../../i18n.js'
import alerts from '../../../services/alerts.js'

import ChangeStackDialog from './dialogs/ChangeStackDialog.vue'
import ImportInstanceDialog from './dialogs/ImportInstanceDialog.vue'

import { useAccountSettingsStore } from '@/stores/account-settings.js'
import { useContextStore } from '@/stores/context.js'

export default {
    name: 'InstanceSettingsDanger',
    components: {
        FormHeading,
        ChangeStackDialog,
        ImportInstanceDialog
    },
    inheritAttrs: false,
    props: {
        instance: {
            type: Object,
            required: true
        }
    },
    emits: ['instance-updated', 'instance-confirm-delete', 'instance-confirm-suspend'],
    setup () {
        const { hasPermission } = usePermissions()

        return { hasPermission }
    },
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
        ...mapState(useContextStore, ['team', 'isImmersiveEditor']),
        ...mapState(useAccountSettingsStore, ['features']),
        isLoading () {
            return this.loading.deleting || this.loading.suspend || this.loading.changingStack || this.loading.duplicating || this.loading.settingType
        }
    },
    mounted () {
        this.checkAccess()
        this.highlightElements()
    },
    methods: {
        async checkAccess () {
            if (!this.hasPermission('project:edit', { application: this.instance.application })) {
                useRouter().push({ replace: true, path: 'general' })
            }
        },
        showProjectChangeTypePage () {
            this.$router.push({
                name: this.isImmersiveEditor ? 'instance-editor-settings-change-type' : 'instance-settings-change-type'
            })
        },
        showChangeStackDialog () {
            this.$refs.changeStackDialog.show(this.instance)
        },
        showImportInstanceDialog () {
            this.$refs.importInstanceDialog.show(this.instance)
        },
        upgradeStack () {
            this.changeStack(this.instance.stack.replacedBy)
        },
        duplicateProject (parts) {
            this.loading.duplicating = true
            InstanceApi.create(parts).then(result => {
                this.$router.push({ name: 'instance', params: { id: result.id } })
                alerts.emit(t('ui.instanceSuccessfullyDuplicated'), 'confirmation')
            }).catch(err => {
                console.error(err)
                alerts.emit(t('ui.instanceFailedToDuplicate'), 'warning')
            }).finally(() => {
                this.loading.duplicating = false
            })
        },
        importInstance (parts) {
            this.loading.importing = true
            InstanceApi.importInstance(this.instance.id, parts).then(result => {
                this.$router.push({ name: 'instance', params: { id: this.instance.id } })
                alerts.emit(t('ui.instanceFlowsImported'), 'confirmation')
            }).catch(err => {
                console.error(err)
                alerts.emit(`Failed to import flows - ${err.response?.data?.error}`, 'warning')
            }).finally(() => {
                this.loading.importing = false
            })
        },
        changeStack (selectedStack) {
            if (this.instance.stack?.id !== selectedStack) {
                this.loading.changingStack = true
                InstanceApi.changeStack(this.instance.id, selectedStack).then(() => {
                    this.$router.push({ name: 'instance', params: { id: this.instance.id } })
                    this.$emit('instance-updated')
                    alerts.emit(t('ui.instanceNodeRedVersionSuccessfullyUpdated'), 'confirmation')
                }).catch(err => {
                    console.warn(err)
                    alerts.emit(t('ui.instanceNodeRedVersionWasNotUpdatedDueToAnError'), 'warning')
                }).finally(() => {
                    this.loading.changingStack = false
                })
            }
        },
        highlightElements () {
            if (
                this.$route.query.highlight &&
                Object.keys(this.$refs).includes(this.$route.query.highlight) &&
                this.$route.query.highlight === 'updateStack'
            ) {
                scrollToAndJiggleHighlight(
                    this.$refs.updateStack,
                    this.$refs.updateStackButton.$el,
                    { count: 2 }
                )
            }
            this.$router.replace({ query: null })
        }
    }
}
</script>
