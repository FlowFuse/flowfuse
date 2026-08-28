<template>
    <div class="ff-project-overview space-y-4" data-el="instance-overview">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
                <div class="ff-instance-info">
                    <FormHeading><RectangleGroupIcon />{{ $t('ui.info') }}</FormHeading>

                    <table class="table-fixed w-full border border-separate rounded-sm">
                        <tbody>
                            <tr class="border-b">
                                <td class="w-48 font-medium">{{ $t('ui.directUrl') }}</td>
                                <td>
                                    <div class="info-row">
                                        <div class="info-row__content">
                                            <TextCopier :text="instance.url" class="url-copier" />
                                        </div>
                                        <button
                                            class="info-row__action"
                                            :disabled="!editorAvailable"
                                            @click="openUrl"
                                        >
                                            <ArrowTopRightOnSquareIcon class="ff-icon" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                            <tr class="border-b">
                                <td class="font-medium">{{ $t('ui.status') }}</td>
                                <td class="py-2">
                                    <InstanceStatusBadge
                                        :status="instance.meta.state"
                                        :pendingStateChange="instance.pendingStateChange"
                                        :optimisticStateChange="instance.optimisticStateChange"
                                        :instanceId="instance.id"
                                        instanceType="instance"
                                    />
                                </td>
                            </tr>
                            <tr class="border-b">
                                <td class="font-medium">{{ $t('ui.lastUpdated') }}</td>
                                <td class="py-2">
                                    <template v-if="instance.flowLastUpdatedSince">
                                        {{ instance.flowLastUpdatedSince }}
                                    </template>
                                    <span v-else class="text-gray-400 italic">
                                        {{ $t('ui.flowsNeverDeployed') }}
                                    </span>
                                </td>
                            </tr>

                            <tr class="border-b">
                                <td class="font-medium">{{ $t('ui.security') }}</td>
                                <td>
                                    <div class="info-row">
                                        <span class="info-row__content">
                                            <template v-if="httpNodeAuthType == 'basic'">
                                                {{ $t('ui.httpBasicAuthentication') }}
                                            </template>
                                            <template v-else-if="httpNodeAuthType == 'flowforge-user'">
                                                {{ $t('ui.flowfuseUserAuthentication') }}
                                            </template>
                                            <template v-else>
                                                {{ $t('ui.none') }}
                                            </template>
                                        </span>
                                        <router-link v-if="canEditProject" class="info-row__action" :to="{ name: 'instance-settings-security' }">
                                            <ArrowRightIcon class="ff-icon ff-icon-sm" />
                                        </router-link>
                                    </div>
                                </td>
                            </tr>
                            <tr class="border-b">
                                <td class="font-medium">{{ $t('ui.scheduledMaintenance') }}</td>
                                <td>
                                    <div class="info-row">
                                        <span class="info-row__content">
                                            <StatusBadge
                                                v-if="autoStackUpgrade"
                                                class="forge-status-running"
                                                :status="$t('ui.enabled')"
                                            />
                                            <StatusBadge
                                                v-else
                                                class="text-gray-400"
                                                :status="$t('ui.disabled2')"
                                            />
                                        </span>
                                        <router-link v-if="canEditProject" class="info-row__action" :to="{ name: 'instance-settings-maintenance' }">
                                            <ArrowRightIcon class="ff-icon ff-icon-sm" />
                                        </router-link>
                                    </div>
                                </td>
                            </tr>
                            <tr class="border-b">
                                <td class="font-medium">{{ $t('ui.highAvailability') }}</td>
                                <td>
                                    <div class="info-row">
                                        <span class="info-row__content">
                                            <StatusBadge
                                                v-if="isHA"
                                                class="forge-status-running"
                                                :status="$t('ui.enabled')"
                                            />
                                            <StatusBadge
                                                v-else
                                                class="text-gray-400"
                                                :status="$t('ui.disabled2')"
                                                :text="!!features.ha ? 'Disabled' : 'Not Available'"
                                            />
                                        </span>
                                        <router-link v-if="canEditProject && !!features.ha" class="info-row__action" :to="{ name: 'instance-settings-ha' }">
                                            <ArrowRightIcon class="ff-icon ff-icon-sm" />
                                        </router-link>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div class="ff-instance-info">
                    <FormHeading><ServerIcon />{{ $t('ui.specs') }}</FormHeading>

                    <table class="table-fixed w-full">
                        <tbody>
                            <tr class="border-b">
                                <td class="w-48 font-medium">{{ $t('ui.type') }}</td>
                                <td class="flex items-center">
                                    <div class="py-2 grow">{{ instance.projectType?.name || 'none' }} / {{ instance.stack?.label || instance.stack?.name || 'none' }}</div>
                                    <div v-if="instance.stack?.replacedBy">
                                        <ff-button size="small" to="./settings/general?highlight=updateStack">{{ $t('ui.update') }}</ff-button>
                                    </div>
                                </td>
                            </tr>
                            <tr v-if="instance.template?.name" class="border-b">
                                <td class="font-medium">{{ $t('ui.template') }}</td>
                                <td><div class="py-2">{{ instance.template?.name }}</div></td>
                            </tr>
                            <template v-if="instance.meta?.versions">
                                <tr class="border-b">
                                    <td class="font-medium">{{ $t('ui.nodeRedVersion') }}</td>
                                    <td><div class="py-2">{{ instance.meta.versions['node-red'] }}</div></td>
                                </tr>
                                <tr class="border-b">
                                    <td class="font-medium">{{ $t('ui.launcherVersion') }}</td>
                                    <td><div class="py-2">{{ instance.meta.versions.launcher }}</div></td>
                                </tr>
                                <tr class="border-b">
                                    <td class="font-medium">{{ $t('ui.nodeJsVersion') }}</td>
                                    <td><div class="py-2">{{ instance.meta.versions.node }}</div></td>
                                </tr>
                            </template>
                        </tbody>
                    </table>
                </div>
            </div>
            <div class="ff-instance-info" data-el="recent-activity">
                <FormHeading><ArrowTrendingUpIcon />{{ $t('ui.recentActivity') }}</FormHeading>
                <AuditLog :entries="auditLog" :loading="loading" :showLoadMore="false" :disableAccordion="true" :disableAssociations="true" />
                <div v-if="!loading" class="pt-4 pb-4 text-center">
                    <router-link to="./audit-log" class="forge-button-secondary">{{ $t('ui.more') }}</router-link>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import { ArrowRightIcon, ArrowTopRightOnSquareIcon, ArrowTrendingUpIcon, RectangleGroupIcon, ServerIcon } from '@heroicons/vue/24/outline'
import { mapState } from 'pinia'

import InstanceApi from '../../api/instances.js'
import FormHeading from '../../components/FormHeading.vue'
import StatusBadge from '../../components/StatusBadge.vue'
import TextCopier from '../../components/TextCopier.vue'
import AuditLog from '../../components/audit-log/AuditLog.vue'
import { useNavigationHelper } from '../../composables/NavigationHelper.js'
import usePermissions from '../../composables/Permissions.js'

import InstanceStatusBadge from './components/InstanceStatusBadge.vue'

import { useAccountSettingsStore } from '@/stores/account-settings.js'

export default {
    name: 'InstanceOverview',
    components: {
        AuditLog,
        ArrowRightIcon,
        ArrowTopRightOnSquareIcon,
        FormHeading,
        InstanceStatusBadge,
        ServerIcon,
        StatusBadge,
        RectangleGroupIcon,
        TextCopier,
        ArrowTrendingUpIcon
    },
    inheritAttrs: false,
    props: {
        instance: {
            required: true,
            type: Object
        }
    },
    setup () {
        const { hasPermission, isVisitingAdmin } = usePermissions()
        const { openInANewTab } = useNavigationHelper()

        return {
            hasPermission,
            isVisitingAdmin,
            openInANewTab
        }
    },
    data () {
        return {
            auditLog: [],
            loading: true,
            autoStackUpgrade: false
        }
    },
    computed: {
        ...mapState(useAccountSettingsStore, ['features']),
        instanceRunning () {
            return this.instance?.meta?.state === 'running'
        },
        editorAvailable () {
            return !this.isHA && this.instanceRunning
        },
        isHA () {
            return this.instance?.ha?.replicas !== undefined
        },
        httpNodeAuthType () {
            if (this.instance.settings.httpNodeAuth) {
                return this.instance.settings.httpNodeAuth.type
            }
            return this.instance.template.settings.httpNodeAuth?.type
        },
        canEditProject () {
            return this.hasPermission('project:edit', { application: this.instance.application })
        }
    },
    watch: {
        instance: {
            handler: function (instance) {
                if (instance?.id) {
                    this.loadLogs()
                    if (this.features?.autoStackUpdate) {
                        this.getUpdateSchedule(instance.id)
                    }
                }
            },
            immediate: true
        }
    },
    methods: {
        openUrl () {
            this.openInANewTab(this.instance.url, `_${this.instance.id}`)
        },
        loadLogs () {
            this.loading = true
            this.loadItems(this.instance.id)
                .then((data) => {
                    this.auditLog = data.log
                })
                .catch((error) => {
                    console.error('Error loading logs:', error)
                    this.auditLog = []
                })
                .finally(() => {
                    this.loading = false
                })
        },
        loadItems: async function (instanceId, cursor) {
            return await InstanceApi.getInstanceAuditLog(instanceId, null, cursor, 4)
        },
        getUpdateSchedule: async function (instanceId) {
            try {
                const list = await InstanceApi.getUpdateSchedule(instanceId)
                this.autoStackUpgrade = list.length > 0
            } catch (error) {
                this.autoStackUpgrade = false
            }
        }
    }
}
</script>

<style lang="scss">
@use "../../stylesheets/pages/project.scss" as *;

// Container query for drawer context
// Breakpoint matches DRAWER_MOBILE_BREAKPOINT constant in Editor/index.vue
@container drawer (min-width: 640px) {
  .ff-project-overview .grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

// Ensure single column layout when container is smaller
@container drawer (max-width: 639px) {
  .ff-project-overview .grid {
    grid-template-columns: repeat(1, minmax(0, 1fr));
  }
}

// Info row: content left, action button(s) pushed right
.info-row {
  display: flex;
  align-items: center;

  &__content {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__action {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 4px;
    border: none;
    background: transparent;
    border-radius: 4px;
    cursor: pointer;
    color: var(--ff-color-accent-text);
    transition: color 0.15s ease, background-color 0.15s ease;

    .ff-icon {
      width: 20px;
      height: 20px;

      &.ff-icon-sm {
        width: 16px;
        height: 16px;
      }
    }

    &:hover {
      background-color: var(--ff-color-accent);
      color: var(--ff-color-text-on-brand);
    }

    &:disabled {
      cursor: not-allowed;
      color: var(--ff-color-text-disabled);

      &:hover {
        background-color: transparent;
        color: var(--ff-color-text-disabled);
      }
    }
  }

  .url-copier {
    min-width: 0;

    .text {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

  }
}

// Type field - ellipse from LEFT to show stack name
.ff-instance-info table tr td.flex .grow {
  direction: rtl;
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
