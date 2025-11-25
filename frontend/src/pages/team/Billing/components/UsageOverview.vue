<template>
    <section class="flex gap-5 flex-col md:flex-row mb-5 md:mb-0">
        <div class="ff-instance-info">
            <FormHeading>Instances</FormHeading>
            <table class="table-fixed w-full border border-separate rounded">
                <tbody>
                    <tr>
                        <td class="align-top pt-3"><FormHeading><ProjectsIcon />Hosted Instances</FormHeading></td>
                        <td>
                            <table class="border-none w-full hosted-instances-usage !p-0">
                                <tbody>
                                    <tr v-for="instance in usedInstancesByType" :key="instance.type.id">
                                        <td class="font-medium">{{ instance.type.name }}</td>
                                        <td class="py-2 text-right">
                                            <usage-value :used="instance.count" :limit="instance.limit" />
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td><FormHeading><ChipIcon />Remote Instances</FormHeading></td>
                        <td class="text-right">
                            <usage-value :used="team.deviceCount" :limit="team?.type?.properties?.devices?.limit ?? null" />
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div class="ff-instance-info w-full md:w-auto">
            <FormHeading>Team</FormHeading>
            <table class="table-fixed w-full border border-separate rounded">
                <tbody v-if="team.deviceCount > 0">
                    <tr class="border-b">
                        <td class="font-medium flex items-center gap-2"><UsersIcon class="ff-icon ff-icon-md" /> Users</td>
                        <td class="py-2 text-right">
                            <usage-value :used="team.memberCount" :limit="team?.type?.properties?.users?.limit ?? null" />
                        </td>
                    </tr>
                    <tr class="border-b">
                        <td class="font-medium flex items-center gap-2"><RssIcon class="ff-icon ff-icon-md" /> Brokers</td>
                        <td class="py-2 text-right">
                            <usage-value :used="team.brokerCount" />
                        </td>
                    </tr>
                    <tr class="border-b">
                        <td class="font-medium flex items-center gap-2"><IdentificationIcon class="ff-icon ff-icon-md" /> Broker Clients</td>
                        <td class="py-2 text-right">
                            <usage-value :used="team.teamBrokerClientsCount" :limit="team?.type?.properties?.teamBroker?.clients?.limit ?? null" />
                        </td>
                    </tr>
                </tbody>
                <tbody v-else>
                    <tr><td class="text-center text-gray-400">None</td></tr>
                </tbody>
            </table>
        </div>
    </section>
</template>

<script>
import { ChipIcon, IdentificationIcon, RssIcon, UsersIcon } from '@heroicons/vue/outline'
import { mapState } from 'vuex'

import instanceTypesApi from '../../../../api/instanceTypes.js'

import FormHeading from '../../../../components/FormHeading.vue'
import ProjectsIcon from '../../../../components/icons/Projects.js'

import UsageValue from './UsageValue.vue'

export default {
    name: 'UsageOverview',
    components: {
        FormHeading,
        UsageValue,
        ChipIcon,
        UsersIcon,
        ProjectsIcon,
        RssIcon,
        IdentificationIcon
    },
    data () {
        return {
            instanceTypes: []
        }
    },
    computed: {
        ...mapState('account', ['team']),
        usedInstancesByType () {
            return Object.keys(this.team.instanceCountByType).map(key => {
                return {
                    type: this.instanceTypes[key],
                    count: this.team.instanceCountByType[key],
                    limit: this.team?.type?.properties?.instances[key]?.limit ?? null
                }
            })
        }
    },
    async mounted () {
        const instanceTypes = await instanceTypesApi.getInstanceTypes()
        this.instanceTypes = Object.fromEntries(instanceTypes.types.map(type => [type.id, type]))
    }
}
</script>

<style scoped lang="scss">
.hosted-instances-usage {
    tr:last-of-type {
        td {
            border-bottom: none;
        }
    }
}
</style>
