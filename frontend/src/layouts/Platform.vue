<template>
    <div class="ff-layout--platform">
        <PageHeader :mobile-menu-open="mobileMenuOpen" @menu-toggle="toggleMenu"/>
        <div class="ff-layout--platform--wrapper">
            <div id="platform-sidenav" class="ff-navigation" :class="{'open': mobileMenuOpen}">
                <!-- Each view uses a <Teleport> to fill this -->
            </div>
            <div class="ff-view">
                <slot></slot>
            </div>
        </div>
    </div>
</template>

<script>
import PageHeader from '@/components/PageHeader.vue'

export default {
    name: 'ff-layout-platform',
    components: {
        PageHeader
    },
    data () {
        return {
            mobileMenuOpen: false
        }
    },
    watch: {
        $route: function () {
            this.checkRouteMeta()
            this.mobileMenuOpen = false
        }
    },
    mounted () {
        this.checkRouteMeta()
    },
    methods: {
        toggleMenu () {
            this.mobileMenuOpen = !this.mobileMenuOpen
        },
        checkRouteMeta () {
            for (let l = 0; l < this.$route.matched.length; l++) {
                const level = this.$route.matched[l]
                if (level.meta.hideSideMenu) {
                    this.hideTeamOptions = true
                    break
                }
            }
        }
    }
}
</script>
