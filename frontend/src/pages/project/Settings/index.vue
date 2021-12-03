<template>
    <div class="flex flex-col sm:flex-row">
        <SectionSideMenu :options="sideNavigation" />
        <div class="flex-grow">
            <router-view :project="project" @projectUpdated="this.$emit('projectUpdated')"></router-view>
        </div>
    </div>
</template>

<script>
import SectionSideMenu from '@/components/SectionSideMenu'
import { useRoute, useRouter } from 'vue-router';
import { mapState } from 'vuex'
import { Roles } from '@/utils/roles'

const sideNavigation = [
    { name: "General", path: "./general" },
    // { name: "Environment", path: "./environment" },
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
            if (this.teamMembership && this.teamMembership.role !== Roles.Owner) {
                useRouter().push({ path: `/project/${useRoute().params.id}/overview` })
            }
        }
    }
}
</script>
