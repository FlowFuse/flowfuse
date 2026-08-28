<template>
    <div class="space-y-6">
        <ff-data-table
            v-model:search="userSearch"
            :columns="columns"
            :rows="users"
            :show-search="true"
            :search-placeholder="$t('ui.searchUsers')"
            :show-load-more="!!nextCursor"
            :loading="loading"
            :loading-message="$t('ui.loadingUsers')"
            :no-data-message="$t('ui.noUsersFound')"
            :rows-selectable="true"
            @load-more="loadItems" @row-selected="showUser"
        >
            <template #actions>
                <ff-button :to="{name: 'admin-users-create'}">
                    <template #icon-left>
                        <UserPlusIcon />
                    </template>
                    {{ $t('ui.createNewUser') }}
                </ff-button>
            </template>
            <template #context-menu="{row}">
                <ff-kebab-item :label="$t('ui.editUser')" @click.stop="showEditUserDialog(row)" />
            </template>
        </ff-data-table>
        <AdminUserEditDialog ref="adminUserEditDialog" @user-updated="userUpdated" @user-deleted="userDeleted" />
    </div>
</template>

<script>

import { UserPlusIcon } from '@heroicons/vue/24/outline'

import { mapState } from 'pinia'
import { markRaw } from 'vue'

import usersApi from '../../../api/users.js'
import UserCell from '../../../components/tables/cells/UserCell.vue'

import { t } from '../../../i18n.js'

import AdminUserEditDialog from './dialogs/AdminUserEditDialog.vue'

import { useAccountSettingsStore } from '@/stores/account-settings.js'

export default {
    name: 'AdminUsers',
    components: {
        UserPlusIcon,
        AdminUserEditDialog
    },
    data () {
        return {
            users: [],
            userSearch: '',
            loading: false,
            nextCursor: null,
            columns: [
                { label: t('ui.user2'), class: ['grow'], key: 'name', component: { is: markRaw(UserCell) }, sortable: true },
                { label: t('ui.passwordExpired'), class: ['w-32', 'text-center'], key: 'password_expired', sortable: true },
                { label: t('ui.emailVerified'), class: ['w-32', 'text-center'], key: 'email_verified', sortable: true },
                { label: t('ui.sso'), class: ['w-32', 'text-center'], key: 'sso_enabled', sortable: true },
                { label: t('ui.mfa'), class: ['w-32', 'text-center'], key: 'mfa_enabled', sortable: true },
                { label: t('ui.admin2'), class: ['w-32', 'text-center'], key: 'admin', sortable: true },
                { label: t('ui.suspended'), class: ['w-32', 'text-center'], key: 'suspended', sortable: true }
            ]
        }
    },
    computed: {
        ...mapState(useAccountSettingsStore, ['features'])
    },
    watch: {
        userSearch (v) {
            if (this.pendingSearch) {
                clearTimeout(this.pendingSearch)
            }
            if (!v) {
                this.loadItems(true)
            } else {
                this.loading = true
                this.pendingSearch = setTimeout(() => {
                    this.loadItems(true)
                }, 300)
            }
        }
    },
    async created () {
        await this.loadItems(true)
        if (this.features.sso) {
            this.columns.push({
                label: t('ui.ssoEnabled2'), class: ['w-32', 'text-center'], key: 'sso_enabled', sortable: true
            })
        }
    },
    methods: {
        showEditUserDialog (user) {
            this.$refs.adminUserEditDialog.show(user)
        },
        userUpdated (user) {
            user.onedit = (data) => { this.showEditUserDialog(user) }
            for (let i = 0; i < this.users.length; i++) {
                if (this.users[i].id === user.id) {
                    this.users[i] = user
                    break
                }
            }
        },
        userDeleted (userId) {
            const index = this.users.findIndex(u => u.id === userId)
            if (index > -1) {
                this.users.splice(index, 1)
            }
        },
        loadItems: async function (reload) {
            if (reload) {
                this.loading = true
                this.nextCursor = null
            }
            let result
            try {
                result = await usersApi.getUsers(this.nextCursor, 30, this.userSearch)
            } catch (err) {
                if (err.response?.status === 403) {
                    this.$router.push('/')
                    return
                }
            }
            if (reload) {
                this.users = []
            }
            this.nextCursor = result.meta.next_cursor
            result.users.forEach(v => {
                v.onedit = (data) => { this.showEditUserDialog(v) }
                this.users.push(v)
            })
            this.loading = false
        },
        showUser (user) {
            this.$router.push({
                name: 'admin-users-user',
                params: { id: user.id }
            })
        }
    }
}
</script>
