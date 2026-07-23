<template>
    <div class="instance-dashboard" data-el="instance-dashboard">
        <EmptyState v-if="!isRunning">
            <template #img>
                <img src="@/images/empty-states/no-access_dashboard-only.png" alt="no-dashboard">
            </template>
            <template #header>Dashboard not available</template>
            <template #message>
                <p>The instance must be running to view the dashboard.</p>
            </template>
        </EmptyState>
        <iframe v-else :src="dashboardURL" />
    </div>
</template>

<script>
import EmptyState from '@/components/EmptyState.vue'
import { removeSlashes } from '@/composables/strings/String.js'

export default {
    name: 'DashboardView',
    components: {
        EmptyState
    },
    props: {
        instance: {
            required: true,
            type: Object
        }
    },
    computed: {
        isRunning () {
            return this.instance?.meta?.state === 'running'
        },
        hasDashboard () {
            return !!this.instance?.settings?.dashboard2UI
        },
        dashboardURL () {
            if (!this.isRunning || !this.hasDashboard) {
                return null
            }
            const baseURL = new URL(removeSlashes(this.instance.url, false, true))
            baseURL.pathname = removeSlashes(this.instance.settings.dashboard2UI, true, false)
            return baseURL.toString()
        }
    },
    watch: {
        hasDashboard: {
            handler (hasDashboard) {
                if (!hasDashboard) {
                    this.$router.push({ name: 'instance-overview', params: { id: this.instance.id } })
                }
            },
            immediate: true
        }
    }
}
</script>

<style scoped>
.instance-dashboard {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
}

.instance-dashboard iframe {
    flex: 1;
    width: 100%;
    border: none;
}
</style>
