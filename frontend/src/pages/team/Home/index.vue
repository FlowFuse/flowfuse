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

        <div id="team-dashboard" class="page-wrapper overflow-auto" :data-team="team.slug">
            <transition name="fade" mode="out-in">
                <ff-loading v-if="loading" message="Loading Dashboard..." />

                <div v-else class="ff-team-dashboard">
                    <section class="flex gap-3 mb-3">
                        <DashboardSection title="Hosted Instances" type="hosted">
                            <template #icon>
                                <ProjectsIcon class="ff-icon-lg" />
                            </template>

                            <div class="flex gap-2 mb-5">
                                <InstanceStat state="running" type="hosted" @clicked="onGlanceClick" />
                                <InstanceStat state="error" type="hosted" @clicked="onGlanceClick" />
                                <InstanceStat state="not-running" type="hosted" @clicked="onGlanceClick" />
                            </div>

                            <RecentlyModifiedInstances />
                        </DashboardSection>

                        <DashboardSection title="Remote Instances" type="remote">
                            <template #icon>
                                <ChipIcon class="ff-icon-lg" />
                            </template>

                            <div class="flex gap-2 mb-5">
                                <InstanceStat state="running" type="remote" @clicked="onGlanceClick" />
                                <InstanceStat state="error" type="remote" @clicked="onGlanceClick" />
                                <InstanceStat state="not-running" type="remote" @clicked="onGlanceClick" />
                            </div>

                            <RecentlyModifiedDevices />
                        </DashboardSection>
                    </section>

                    <DashboardSection title="Recent Activity" class="overflow-auto" type="audit">
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

import DashboardSection from './components/DashboardSection.vue'
import InstanceStat from './components/InstanceStat.vue'
import RecentlyModifiedDevices from './components/RecentlyModifiedDevices.vue'
import RecentlyModifiedInstances from './components/RecentlyModifiedInstances.vue'

export default {
    name: 'TeamHome',
    components: {
        InstanceStat,
        RecentlyModifiedInstances,
        AuditLog,
        DashboardSection,
        ChipIcon,
        ProjectsIcon,
        DatabaseIcon,
        RecentlyModifiedDevices
    },
    data () {
        return {
            loading: true,
            logEntries: []
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
            return TeamAPI.getTeamAuditLog(this.team.id, { }, null, 50)
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
