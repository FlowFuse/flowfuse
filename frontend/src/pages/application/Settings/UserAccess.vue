<template>
    <div id="user-access" data-el="application-user-access" class="w-full">
        <ff-data-table
            :columns="columns" :rows="members" :search="searchTerm" :show-search="true"
            data-el="user-access-table"
        >
            <template v-if="hasPermission('team:user:change-role')" #context-menu="{row}">
                <ff-list-item data-action="edit-token" label="Edit Permissions" @click="editUserPermissions(row)" />
            </template>
        </ff-data-table>

        <EditApplicationPermissionsDialog ref="editApplicationPermissionsDialog" @user-updated="onUserUpdated" />
    </div>
</template>

<script>
import { defineComponent, markRaw } from 'vue'
import { mapGetters } from 'vuex'

import teamClient from '../../../api/team.js'
import EditApplicationPermissionsDialog from '../../../components/dialogs/EditApplicationPermissionsDialog.vue'
import usePermissions from '../../../composables/Permissions.js'

import RoleRow from './components/RoleRow.vue'

export default defineComponent({
    name: 'UserAccess',
    components: { EditApplicationPermissionsDialog },
    props: {
        application: {
            type: Object,
            required: true
        }
    },
    emits: ['application-delete', 'application-updated'],
    setup () {
        const { hasPermission } = usePermissions()
        return { hasPermission }
    },
    data () {
        return {
            searchTerm: '',
            members: []
        }
    },
    computed: {
        ...mapGetters('account', ['team', 'featuresCheck']),
        columns () {
            return [
                {
                    key: 'name',
                    label: 'User',
                    sortable: true
                },
                {
                    key: 'role',
                    label: 'Role',
                    sortable: true,
                    component: {
                        is: markRaw(RoleRow),
                        extraProps: {
                            applicationId: this.application.id
                        }
                    }
                }
            ]
        }
    },
    mounted () {
        if (
            !this.featuresCheck.isRBACApplicationFeatureEnabled ||
            !this.hasPermission('application:access-control', { application: this.application })
        ) {
            return this.$router.push({ name: 'application-settings', params: { id: this.application.id } })
        }
        this.getUsers()
            .catch(error => error)
    },
    methods: {
        getUsers () {
            return teamClient.getTeamMembers(this.team.id)
                .then(response => {
                    this.members = response.members
                })
        },
        editUserPermissions (user) {
            this.$refs.editApplicationPermissionsDialog.show(user, this.application)
        },
        onUserUpdated (user) {
            this.members = this.members.map(member => {
                if (member.id === user.id) {
                    return user
                }
                return member
            })
        }
    }
})
</script>

<style scoped lang="scss">

</style>
