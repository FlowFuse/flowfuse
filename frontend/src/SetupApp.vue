<template>
    <div class="min-h-screen flex flex-col">
        <ff-layout-box class="ff-setup">
            <component :is="views[step]" :state="state" @next="next" @error="error"></component>
        </ff-layout-box>
    </div>
</template>

<script>
import httpClient from '@/api/client'
import { markRaw } from 'vue'
import PageFooter from '@/components/PageFooter'
import Logo from '@/components/Logo'
import Start from '@/pages/setup/Start'
import Options from '@/pages/setup/Options'
import CreateAdminUser from '@/pages/setup/CreateAdminUser'
import License from '@/pages/setup/License'
import Final from '@/pages/setup/Final'
import ErrorPage from '@/pages/setup/ErrorPage'
import FFLayoutBox from '@/layouts/Box'

// To add more views in the setup dialogs, add them to this list.
// Just make sure 'Final' and 'ErrorPage' are the last two
const views = [
    Start,
    CreateAdminUser,
    License,
    Options,
    Final,
    ErrorPage
]
export default {
    name: 'SetupApp',
    data () {
        return {
            step: 0,
            views: markRaw(views),
            state: {}
        }
    },
    async mounted () {
        this.state = (await httpClient.get('/setup/status')).data
    },
    methods: {
        next () {
            this.step++
        },
        error () {
            this.step = views.length - 1
        }
    },
    components: {
        PageFooter,
        Logo,
        CreateAdminUser,
        License,
        'ff-layout-box': FFLayoutBox
    }
}
</script>

<style lang="scss">
@import "./stylesheets/common.scss";
</style>
