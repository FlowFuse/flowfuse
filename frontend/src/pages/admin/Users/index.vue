<template>
    <SectionTopMenu hero="Users" :options="sideNavigation" />
    <div class="flex-grow">
        <router-view ></router-view>
    </div>
</template>

<script>

import SectionTopMenu from '@/components/SectionTopMenu'

const sideNavigation = [
    { name: 'Users', path: './general' },
    { name: 'Invitations', path: './invitations' }
]

export default {
    name: 'AdminUsers',
    setup () {
        return {
            sideNavigation
        }
    },
    components: {
        SectionTopMenu
    }
}
</script>
