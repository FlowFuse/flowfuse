<template>
    <ff-page>
        <template #header>
            <ff-page-header :title="$t('ui.adminSettings')" />
        </template>
        <div class="ff-instance-info space-y-4">
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-gray-700">
                <div class="border rounded-sm px-4 py-2 text-center">
                    <router-link to="/admin/users/general">
                        <div class="text-xl">{{ stats.userCount }}</div>
                        <div>{{ $t('ui.users') }}</div>
                    </router-link>
                    <div class="w-full grid grid-cols-2 pt-1 mt-2 border-t">
                        <div>{{ stats.adminCount }} {{ $t('ui.plAdmin', stats.adminCount) }}</div>
                        <div><router-link to="/admin/users/invitations">{{ stats.inviteCount }} {{ $t('ui.plInvite', stats.inviteCount) }}</router-link></div>
                    </div>
                </div>
                <div class="border rounded-sm p-4 text-center">
                    <router-link to="/admin/teams">
                        <div class="text-xl">{{ stats.teamCount }}</div>
                        <div>{{ $t('ui.plTeam', stats.teamCount) }}</div>
                    </router-link>
                </div>
                <div class="border rounded-sm p-4 text-center">
                    <div class="text-xl">{{ stats.instanceCount }}</div>
                    <div>{{ $t('ui.plInstance', stats.instanceCount) }}</div>
                    <div v-if="stats.instancesByState && Object.keys(stats.instancesByState).length > 0" class="w-full grid grid-cols-1 pt-1 mt-2 border-t">
                        <div v-for="(count, state) in stats.instancesByState" :key="state">
                            {{ count }} {{ state }}
                        </div>
                    </div>
                </div>

                <div class="border rounded-sm p-4 text-center">
                    <div class="text-xl">{{ stats.deviceCount }}</div>
                    <div>{{ $t('ui.plDevice', stats.deviceCount) }}</div>
                    <div v-if="stats.devicesByLastSeen && Object.keys(stats.devicesByLastSeen).length > 0" class="w-full grid grid-cols-1 pt-1 mt-2 border-t">
                        <div> {{ stats.devicesByLastSeen.day || 0 }} {{ $t('ui.connectedCount') }}</div>
                    </div>
                </div>
            </div>
            <div>
                <FormHeading>{{ $t('ui.license') }}</FormHeading>
                <table class="w-full">
                    <tbody>
                        <tr>
                            <td class="w-40">{{ $t('ui.type') }}</td>
                            <td>
                                <span v-if="!license">{{ $t('ui.flowfuseCommunityEdition') }}</span>
                                <span v-else-if="!license.dev">{{ $t('ui.flowfuseEnterpriseEdition') }}</span>
                                <span v-else class="font-bold">{{ $t('ui.flowfuseDevelopmentOnly') }}</span>
                            </td>
                        </tr>
                        <template v-if="license">
                            <tr><td class="w-40 font-medium">{{ $t('ui.organisation') }}</td><td>{{ license.organisation }}</td></tr>
                            <tr v-if="license.tier"><td class="w-40 font-medium">{{ $t('ui.tier') }}</td><td>{{ license.tier }}</td></tr>
                            <tr v-if="license.tiers"><td class="w-40 font-medium">{{ $t('ui.tierEntitlements') }}</td><td>{{ license.tiers }}</td></tr>
                            <tr><td>{{ expired ? 'Expired' : 'Expires' }}</td><td>{{ license.expires }}<br><span class="text-xs">{{ license.expiresAt }}</span></td></tr>
                        </template>
                        <tr>
                            <td class="w-40">{{ $t('ui.users') }}</td>
                            <td>{{ stats.userCount }} / {{ stats.maxUsers }}</td>
                        </tr>
                        <tr>
                            <td class="w-40">{{ $t('ui.teams') }}</td>
                            <td>{{ stats.teamCount }} / {{ stats.maxTeams }}</td>
                        </tr>
                        <template v-if="!isNaN(stats.maxDevices)">
                            <tr>
                                <td class="w-40">{{ $t('ui.instances') }}</td>
                                <td>{{ stats.instanceCount }} / {{ stats.maxInstances }}</td>
                            </tr>
                            <tr>
                                <td class="w-40">{{ $t('ui.devices') }}</td>
                                <td>
                                    <div>{{ stats.deviceCount }} / {{ stats.maxDevices }}</div>
                                </td>
                            </tr>
                        </template>
                        <template v-else>
                            <tr>
                                <td class="w-40">{{ $t('ui.instancesDevices') }}</td>
                                <td>{{ stats.instanceCount + stats.deviceCount }} / {{ stats.maxInstances }}</td>
                            </tr>
                        </template>
                        <template v-if="stats.maxMqttClients">
                            <tr>
                                <td class="w-40">{{ $t('ui.teamMqttClients') }}</td>
                                <td>{{ stats.mqttClientCount }} / {{ stats.maxMqttClients }}</td>
                            </tr>
                        </template>
                    </tbody>
                </table>
            </div>
            <div>
                <FormHeading>{{ $t('ui.version') }}</FormHeading>
                <table class="w-full">
                    <tbody>
                        <tr><td class="w-40">{{ $t('ui.forgeApplication') }}</td><td>{{ settings['version:forge'] }}</td></tr>
                        <tr><td>{{ $t('ui.nodejs') }}</td><td>{{ settings['version:node'] }}</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    </ff-page>
</template>

<script>
import adminApi from '../../api/admin.js'
import Settings from '../../api/settings.js'
import FormHeading from '../../components/FormHeading.vue'

export default {
    name: 'AdminSettingsGeneral',
    components: {
        FormHeading
    },
    data: function () {
        return {
            license: {},
            stats: {},
            settings: {},
            expired: false
        }
    },
    async mounted () {
        try {
            this.stats = await adminApi.getStats()
            this.license = await adminApi.getLicenseDetails()
            this.expired = this.license?.expiresAt && (Date.parse(this.license.expiresAt) - Date.now()) < 0
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
