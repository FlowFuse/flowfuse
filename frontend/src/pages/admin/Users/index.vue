<template>
    <SectionTopMenu hero="Users" :options="sideNavigation" />
    <div class="flex-grow">
        <router-view />
    </div>
</template>

<script>

import SectionTopMenu from '../../../components/SectionTopMenu.vue'

const sideNavigation = [
    { name: 'Users', path: './general' },
    { name: 'Invitations', path: './invitations' }
]

export default {
    name: 'AdminUsers',
    components: {
        SectionTopMenu
    },
    setup () {
        return {
            sideNavigation
        }
    }
}
</script>
