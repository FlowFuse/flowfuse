<template>
    <div class="">
        <SectionTopMenu hero="Team Settings" :options="sideOptions" />
        <div class="flex-grow">
            <router-view :team="team" :teamMembership="teamMembership"></router-view>
        </div>
    </div>
</template>

<script>
import { mapState } from 'vuex'

import SectionTopMenu from '@/components/SectionTopMenu'
import { useRouter } from 'vue-router'
import { Roles } from '@core/lib/roles'

export default {
    name: 'TeamSettings',
    props: ['team', 'teamMembership'],
    components: {
        SectionTopMenu
    },
    computed: {
        ...mapState(['features'])
    },
    data: function () {
        return {
            sideOptions: [
                { name: 'General', path: './general' },
                { name: 'Danger', path: './danger' }
            ]
        }
    },
    watch: {
        teamMembership: 'checkAccess'
    },
    mounted () {
        this.checkAccess()
        this.checkFeatures()
    },
    methods: {
        checkAccess: async function () {
            if (this.teamMembership && this.teamMembership.role !== Roles.Owner) {
                useRouter().push({ path: `/team/${this.team.slug}/overview` })
            }
        },
        checkFeatures: function () {
            if (this.features.billing) {
                // running in EE
                this.sideOptions.splice(1, 0, { name: 'Billing', path: './billing' })
            }
        }
    }
}
</script>
