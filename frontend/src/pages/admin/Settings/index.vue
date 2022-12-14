<template>
    <SectionTopMenu hero="Settings" :options="sideNavigation" />
    <div class="flex-grow">
        <router-view ></router-view>
    </div>
</template>

<script>
import SectionTopMenu from '@/components/SectionTopMenu'
import { mapState } from 'vuex'

export default {
    name: 'AdminSettings',
    data () {
        return {
            sideNavigation: [
                { name: 'General', path: './general' },
                // { name: "Permissions", path: "./permissions" },
                { name: 'License', path: './license' },
                { name: 'Email', path: './email' }
            ]
        }
    },
    mounted () {
        if (this.features.sso) {
            this.sideNavigation.push({ name: 'SSO', path: './sso' })
        }
    },
    computed: {
        ...mapState('account', ['features'])
    },
    components: {
        SectionTopMenu
    }
}
</script>
