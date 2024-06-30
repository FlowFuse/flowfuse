<template>
    <ff-page>
        <template #header>
            <ff-page-header title="Settings" :tabs="sideOptions">
                <template #context>
                    View and manage the settings of your team.
                </template>
            </ff-page-header>
        </template>
        <div class="flex flex-col sm:flex-row">
            <div class="flex-grow pt-4">
                <router-view />
            </div>
        </div>
    </ff-page>
</template>

<script>
import { useRouter } from 'vue-router'
import { mapState } from 'vuex'

import permissionsMixin from '../../../mixins/Permissions.js'

export default {
    name: 'TeamSettings',
    mixins: [permissionsMixin],
    data: function () {
        return {
            sideOptions: [
                { label: 'General', to: './general' },
                { label: 'Devices', to: './devices' },
                { label: 'Danger', to: './danger' }
            ]
        }
    },
    computed: {
        ...mapState('account', ['features'])
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
