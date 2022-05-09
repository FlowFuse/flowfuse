<template>
    <SectionTopMenu hero="Users" :options="sideNavigation" />
    <div class="flex-grow">
        <router-view ></router-view>
    </div>
</template>

<script>

import Breadcrumbs from '@/mixins/Breadcrumbs'
import SectionTopMenu from '@/components/SectionTopMenu'

const sideNavigation = [
    { name: 'Users', path: './general' },
    { name: 'Invitations', path: './invitations' }
]

export default {
    name: 'AdminUsers',
    mixins: [Breadcrumbs],
    setup () {
        return {
            sideNavigation
        }
    },
    created () {
        this.setBreadcrumbs([
            { label: 'Admin', to: { name: 'Admin Settings' } },
            { label: 'Users' }
        ])
    },
    components: {
        SectionTopMenu
    }
}
</script>
