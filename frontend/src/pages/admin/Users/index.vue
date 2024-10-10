<template>
    <div class="clear-page-gutters">
        <div class="ff-instance-header">
            <ff-page-header title="Users" :tabs="sideNavigation" />
        </div>
        <div class="px-3 py-3 md:px-6 md:py-6">
            <div class="flex-grow">
                <router-view />
            </div>
        </div>
    </div>
</template>

<script>

const sideNavigation = [
    { label: 'Users', to: './general' },
    { label: 'Invitations', to: './invitations' }
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
