<template>
    <div class="ff-layout--platform">
        <PageHeader :mobile-menu-open="mobileMenuOpen" @menu-toggle="toggleMenu"/>
        <div class="ff-layout--platform--wrapper">
            <SideNavigation :mobile-menu-open="mobileMenuOpen" @option-selected="mobileMenuOpen = false"/>
            <main>
                <slot></slot>
            </main>
        </div>
    </div>
</template>

<script>
import PageHeader from '@/components/PageHeader.vue'
import SideNavigation from '@/components/SideNavigation.vue'

export default {
    name: 'ff-layout-platform',
    components: {
        PageHeader,
        SideNavigation
    },
    data () {
        return {
            mobileMenuOpen: false
        }
    },
    methods: {
        toggleMenu () {
            this.mobileMenuOpen = !this.mobileMenuOpen
        }
    }
}
</script>
