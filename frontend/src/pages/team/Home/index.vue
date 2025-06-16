<template>
    <ff-page>
        <template #header>
            <ff-page-header>
                <template #breadcrumbs>
                    <!-- <ff-nav-breadcrumb :has-chevron="true">{{ team.name }}</ff-nav-breadcrumb>-->
                    <ff-nav-breadcrumb>Home</ff-nav-breadcrumb>
                </template>
            </ff-page-header>
        </template>

        <div id="team-dashboard" class="page-wrapper overflow-auto">
            <transition name="fade" mode="out-in">
                <ff-loading v-if="loading" message="Loading Dashboard..." />

                <div v-else class="ff-team-dashboard">
                    <section class="flex gap-3 mb-3">
                        <DashboardSection title="Hosted Instances">
                            <template #icon>
                                <ProjectsIcon class="ff-icon-lg" />
                            </template>

                            <AtAGlanceInstanceStats
                                class="mb-5"
                                type-of-instances="hosted"
                                :stats="{}"
                                @clicked="onGlanceClick"
                            />

                            <RecentlyModified :instances="instances" />
                        </DashboardSection>

                        <DashboardSection title="Remote Instances">
                            <template #icon>
                                <ChipIcon class="ff-icon-lg" />
                            </template>

                            <AtAGlanceInstanceStats
                                class="mb-5"
                                type-of-instances="remote"
                                :stats="{}" @clicked="onGlanceClick"
                            />

                            <RecentlyModified :instances="devices" />
                        </DashboardSection>
                    </section>

                    <DashboardSection title="Recent Activity" class="overflow-auto">
                        <template #icon>
                            <DatabaseIcon class="ff-icon-lg" />
                        </template>

                        <AuditLog :entries="logEntries" />
                    </DashboardSection>
                </div>
            </transition>
        </div>
    </ff-page>
</template>

<script>
import { ChipIcon, DatabaseIcon } from '@heroicons/vue/outline'

import { mapGetters } from 'vuex'

import TeamAPI from '../../../api/team.js'
import AuditLog from '../../../components/audit-log/AuditLog.vue'

import ProjectsIcon from '../../../components/icons/Projects.js'

import AtAGlanceInstanceStats from './components/AtAGlanceInstanceStats.vue'
import DashboardSection from './components/DashboardSection.vue'
import RecentlyModified from './components/RecentlyModified.vue'

export default {
    name: 'TeamHome',
    components: { RecentlyModified, AtAGlanceInstanceStats, AuditLog, DashboardSection, ChipIcon, ProjectsIcon, DatabaseIcon },
    data () {
        return {
            loading: true,
            logEntries: [],
            instances: [
                { id: 1, name: 'something-foo', url: 'https://reddit.com', meta: { state: 'running' } },
                {
                    id: 2,
                    name: 'another-bar',
                    url: 'http:/google.com',
                    meta: { state: 'running' },
                    settings: {
                        dashboard2UI: '/dashboard'
                    }
                }
            ],
            devices: [
                { id: 1, name: 'foo-this', url: 'https://reddit.com', meta: { state: 'running' } },
                {
                    id: 2,
                    name: 'bar-that',
                    url: 'http:/google.com',
                    meta: { state: 'running' }
                }
            ]
        }
    },
    computed: {
        ...mapGetters('account', ['team'])
    },
    async mounted () {
        this.getRecentActivity()
            .finally(() => {
                this.loading = false
            })
            .catch(e => e)
    },
    methods: {
        getRecentActivity () {
            return TeamAPI.getTeamAuditLog(this.team.id, { }, null, 200)
                .then((response) => {
                    this.logEntries = response.log
                })
        },
        onGlanceClick (payload) {
            // console.log(payload)
        }
    }
}
</script>

<style scoped lang="scss">
.ff-team-dashboard {
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: auto;
}
</style>

<style lang="scss">
#team-dashboard {
    .ff-accordion {
        border: none;

        &--button {
            background: $ff-white;
            border: none;
            border-bottom: 1px solid $ff-color--border;
        }

        &--content {
            & > div {
                &:nth-child(odd) {
                    background: $ff-grey-50;
                }

                .ff-audit-entry {
                    border: none;
                }
            }
        }
    }
}
</style>
