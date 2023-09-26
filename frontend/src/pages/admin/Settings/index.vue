<template>
    <SectionTopMenu hero="Settings" :options="sideNavigation" />
    <div class="flex-grow">
        <router-view />
    </div>
</template>

<script>
import { mapState } from 'vuex'

import SectionTopMenu from '../../../components/SectionTopMenu.vue'

export default {
    name: 'AdminSettings',
    components: {
        SectionTopMenu
    },
    data () {
        return {
            sideNavigation: [
                { name: 'General', path: './general' },
                { name: 'License', path: './license' },
                { name: 'Email', path: './email' }
            ]
        }
    },
    computed: {
        ...mapState('account', ['features'])
    },
    mounted () {
        if (this.features.sso) {
            this.sideNavigation.push({ name: 'SSO', path: './sso' })
        }
    }
}
</script>
