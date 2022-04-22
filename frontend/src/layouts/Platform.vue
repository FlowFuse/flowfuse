<template>
    <div class="ff-layout--platform">
        <PageHeader />
        <div class="ff-layout--platform--wrapper">
            <SideNavigation />
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
    }
}
</script>
