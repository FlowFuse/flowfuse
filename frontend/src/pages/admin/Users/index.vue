<template>
    <ff-page>
        <template #header>
            <ff-page-header title="Users" :tabs="sideNavigation" />
        </template>
        <router-view />
    </ff-page>
</template>

<script>

const sideNavigation = [
    { label: 'Users', to: { name: 'admin-users-general' } },
    { label: 'Invitations', to: { name: 'admin-users-invitations' } }
]

export default {
    name: 'AdminUsers',
    setup () {
        return {
            sideNavigation
        }
    }
}
</script>

<style lang="scss" scoped>
.clear-page-gutters {
    margin: -1.75rem
}
</style>
