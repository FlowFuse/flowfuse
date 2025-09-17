<template>
    <ff-data-table :columns="columns" :rows="members" :search="searchTerm" :show-search="true">
        <template #context-menu="{row}">
            <ff-list-item data-action="edit-token" label="Edit Permissions" @click="editUserPermissions(row)" />
        </template>
    </ff-data-table>

    <EditApplicationPermissionsDialog ref="editApplicationPermissionsDialog" @user-updated="onUserUpdated" />
</template>

<script>
import { defineComponent, markRaw } from 'vue'
import { mapGetters } from 'vuex'

import teamClient from '../../../api/team.js'

import RoleRow from './components/RoleRow.vue'
import EditApplicationPermissionsDialog from './dialogs/EditApplicationPermissionsDialog.vue'

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
    data () {
        return {
            searchTerm: '',
            members: []
        }
    },
    computed: {
        ...mapGetters('account', ['team']),
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
