<template>
    <div class="flex flex-col sm:flex-row">
        <SectionSideMenu :options="sideOptions" />
        <div class="flex-grow pt-4">
            <router-view :team="team" :teamMembership="teamMembership"></router-view>
        </div>
    </div>
</template>

<script>
import { mapState } from 'vuex'

import SectionSideMenu from '../../../components/SectionSideMenu.vue'
import { useRouter } from 'vue-router'
import permissionsMixin from '../../../mixins/Permissions.js'

export default {
    name: 'TeamSettings',
    props: ['team', 'teamMembership'],
    mixins: [permissionsMixin],
    components: {
        SectionSideMenu
    },
    computed: {
        ...mapState('account', ['features'])
    },
    data: function () {
        return {
            sideOptions: [
                { name: 'General', path: './general' },
                { name: 'Devices', path: './devices' },
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
