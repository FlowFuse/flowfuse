<template>
    <SectionTopMenu hero="Admin Settings" />
    <div class="ff-instance-info space-y-4">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-gray-700">
            <div class="border rounded px-4 py-2 text-center">
                <router-link to="/admin/users/general">
                    <div class="text-xl">{{ stats.userCount }}</div>
                    <div>Users</div>
                </router-link>
                <div class="w-full grid grid-cols-2 pt-1 mt-2 border-t">
                    <div>{{ stats.adminCount }} {{ $filters.pluralize(stats.adminCount,'admin') }}</div>
                    <div><router-link to="/admin/users/invitations">{{ stats.inviteCount }} {{ $filters.pluralize(stats.inviteCount,'invite') }}</router-link></div>
                </div>
            </div>
            <div class="border rounded p-4 text-center">
                <router-link to="/admin/teams">
                    <div class="text-xl">{{ stats.teamCount }}</div>
                    <div>{{ $filters.pluralize(stats.teamCount,'Team') }}</div>
                </router-link>
            </div>
            <div class="border rounded p-4 text-center">
                <div class="text-xl">{{ stats.instanceCount }}</div>
                <div>{{ $filters.pluralize(stats.instanceCount,'Instance') }}</div>
                <div v-if="stats.instancesByState && Object.keys(stats.instancesByState).length > 0" class="w-full grid grid-cols-1 pt-1 mt-2 border-t">
                    <div v-for="(count, state) in stats.instancesByState" :key="state">
                        {{ count }} {{ state }}
                    </div>
                </div>
            </div>

            <div class="border rounded p-4 text-center">
                <div class="text-xl">{{ stats.deviceCount }}</div>
                <div>{{ $filters.pluralize(stats.deviceCount,'Device') }}</div>
                <div v-if="stats.devicesByLastSeen && Object.keys(stats.devicesByLastSeen).length > 0" class="w-full grid grid-cols-1 pt-1 mt-2 border-t">
                    <div> {{ stats.devicesByLastSeen.day || 0 }} connected</div>
                </div>
            </div>
        </div>
        <div>
            <FormHeading>License</FormHeading>
            <table class="w-full">
                <tr>
                    <td class="w-40">Type</td>
                    <td>
                        <span v-if="!license">FlowFuse Community Edition</span>
                        <span v-else-if="!license.dev">FlowFuse Enterprise Edition</span>
                        <span v-else class="font-bold">FlowFuse Development Only</span>
                    </td>
                </tr>
                <template v-if="license">
                    <tr><td class="w-40 font-medium">Organisation</td><td>{{ license.organisation }}</td></tr>
                    <tr><td class="w-40 font-medium">Tier</td><td>{{ license.tier }}</td></tr>
                    <tr><td>Expires</td><td>{{ license.expires }}<br><span class="text-xs">{{ license.expiresAt }}</span></td></tr>
                </template>
                <tr>
                    <td class="w-40">Users</td>
                    <td>{{ stats.userCount }} / {{ stats.maxUsers }}</td>
                </tr>
                <tr>
                    <td class="w-40">Teams</td>
                    <td>{{ stats.teamCount }} / {{ stats.maxTeams }}</td>
                </tr>
                <template v-if="stats.maxDevices">
                    <tr>
                        <td class="w-40">Instances</td>
                        <td>{{ stats.instanceCount }} / {{ stats.maxInstances }}</td>
                    </tr>
                    <tr>
                        <td class="w-40">Devices</td>
                        <td>
                            <div>{{ stats.deviceCount }} / {{ stats.maxDevices }}</div>
                        </td>
                    </tr>
                </template>
                <template v-else>
                    <tr>
                        <td class="w-40">Instances + Devices</td>
                        <td>{{ stats.instanceCount + stats.deviceCount }} / {{ stats.maxInstances }}</td>
                    </tr>
                </template>
            </table>
        </div>
        <div>
            <FormHeading>Version</FormHeading>
            <table class="w-full">
                <tr><td class="w-40">Forge Application</td><td>{{ settings['version:forge'] }}</td></tr>
                <tr><td>NodeJS</td><td>{{ settings['version:node'] }}</td></tr>
            </table>
        </div>
    </div>
</template>

<script>
import adminApi from '../../api/admin.js'
import Settings from '../../api/settings.js'
import FormHeading from '../../components/FormHeading.vue'
import SectionTopMenu from '../../components/SectionTopMenu.vue'

export default {
    name: 'AdminSettingsGeneral',
    components: {
        FormHeading,
        SectionTopMenu
    },
    data: function () {
        return {
            license: {},
            stats: {},
            settings: {}
        }
    },
    async mounted () {
        try {
            this.stats = await adminApi.getStats()
            this.license = await adminApi.getLicenseDetails()
        } catch (err) {
            if (err.response?.status === 403 || !err.response) {
                this.$router.push('/')
            } else {
                throw err
            }
        }
        this.settings = await Settings.getSettings()
    }
}
</script>
