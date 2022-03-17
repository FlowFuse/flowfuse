<template>
    <div class="flex flex-col sm:flex-row">
        <SectionSideMenu :options="sideNavigation" />
        <div class="flex-grow">
            <router-view ></router-view>
        </div>
    </div>
</template>

<script>

import Breadcrumbs from '@/mixins/Breadcrumbs'
import SectionSideMenu from '@/components/SectionSideMenu'

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
        SectionSideMenu
    }
}
</script>
