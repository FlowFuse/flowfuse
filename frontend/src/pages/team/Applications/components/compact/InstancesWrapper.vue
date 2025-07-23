<template>
    <section v-if="hasNoInstances" class="ff-no-data--boxed" data-el="application-instances-none">
        <label class="delimiter">
            <IconNodeRedSolid class="ff-icon ff-icon-sm text-red-800" /> Hosted Instances
        </label>
        <span v-if="!isSearching" class="message">
            This Application currently has no
            <router-link :to="{name: 'ApplicationInstances', params: {team_slug: team.slug, id: application.id}}" class="ff-link">
                attached Hosted Instances
            </router-link>.
        </span>
        <span v-else class="message">
            No instance matches your criteria.
        </span>
    </section>
    <section v-else class="ff-applications-list-instances--compact" data-el="application-instances">
        <label class="delimiter">
            <IconNodeRedSolid class="ff-icon ff-icon-sm text-red-800" /> Hosted Instances
        </label>
        <div class="items-wrapper">
            <instance-counter :counter="0" state="running" type="hosted" />
            <instance-counter :counter="0" state="error" type="hosted" />
            <instance-counter :counter="0" state="stopped" type="hosted" />
        </div>
    </section>
</template>

<script>
import { mapState } from 'vuex'

import IconNodeRedSolid from '../../../../../components/icons/NodeRedSolid.js'
import InstanceCounter from '../../../../../components/tiles/InstanceCounter.vue'

export default {
    name: 'InstancesWrapper',
    components: { InstanceCounter, IconNodeRedSolid },
    props: {
        application: {
            type: Object,
            required: true,
            default: null
        },
        searchQuery: {
            type: String,
            required: false,
            default: ''
        }
    },
    computed: {
        ...mapState('account', ['team']),
        instances () {
            return this.application.instances.slice(0, 3)
        },
        hasNoInstances () {
            return this.instances.length === 0
        },
        isSearching () {
            return this.searchQuery.length > 0
        }
    }
}
</script>
