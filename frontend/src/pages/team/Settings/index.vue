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
import permissionsMixin from '@/mixins/Permissions'

export default {
    name: 'TeamSettings',
    props: ['team', 'teamMembership'],
    mixins: [permissionsMixin],
    components: {
        SectionTopMenu
    },
    computed: {
        ...mapState('account', ['features'])
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
    },
    methods: {
        checkAccess: async function () {
            if (!this.hasPermission('team:edit')) {
                useRouter().push({ path: `/team/${this.team.slug}/overview` })
            }
        }
    }
}
</script>
