<template>
    <div class="flex flex-col sm:flex-row">
        <SectionSideMenu :options="sideNavigation" />
        <div class="flex-grow">
            <router-view :project="project"></router-view>
        </div>
    </div>
</template>

<script>
import SectionSideMenu from '@/components/SectionSideMenu'
import { useRoute, useRouter } from 'vue-router';
import { mapState } from 'vuex'

const sideNavigation = [
    { name: "General", path: "./general" },
    { name: "Danger", path: "./danger" }
]

export default {
    name: 'ProjectSettings',
    props:[ "project" ],
    computed: {
        ...mapState('account',['teamMembership']),
    },
    setup() {
        return {
            sideNavigation
        }
    },
    components: {
        SectionSideMenu,
    },
    watch: {
         teamMembership: 'checkAccess'
    },
    mounted() {
        this.checkAccess()
    },
    methods: {
        checkAccess: async function() {
            if (this.teamMembership && this.teamMembership.role !== "owner") {
                useRouter().push({ path: `/project/${useRoute().params.id}/overview` })
            }
        }
    }
}
</script>
