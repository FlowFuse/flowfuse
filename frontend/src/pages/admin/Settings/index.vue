<template>
    <div class="flex flex-col sm:flex-row">
        <SectionSideMenu :options="sideNavigation" />
        <div class="flex-grow">
            <router-view ></router-view>
        </div>
    </div>
</template>

<script>
import Breadcrumbs from '@/mixins/Breadcrumbs';
import SectionSideMenu from '@/components/SectionSideMenu'

const sideNavigation = [
    { name: "General", path: "./general" },
    { name: "Permissions", path: "./permissions" },
    { name: "License", path: "./license" },
    { name: "Email", path: "./email" },
]

export default {
    name: 'AdminSettings',
    mixins: [ Breadcrumbs ],
    setup() {
        return {
            sideNavigation
        }
    },
    data() {
        return {
        }
    },
    created() {
        this.setBreadcrumbs([
            {label:"Admin", to:{name:"Admin"}},
            {label:"Settings"}
        ]);
    },
    components: {
        SectionSideMenu
    }
}
</script>
