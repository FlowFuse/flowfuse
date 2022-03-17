<template>
    <div class="min-h-screen flex flex-col bg-gray-300 ">
        <div class="flex-grow mx-auto flex bg-gray-50 pt-4 pb-12">
            <div class="sm:max-w-xl w-screen space-y-2">
                <div class="max-w-xs mx-auto w-full mb-4">
                    <Logo/>
                    <h2 class="mt-2 text-center text-3xl font-bold text-gray-900">
                        <span>FLOW</span><span class="font-light">FORGE</span>
                    </h2>
                </div>
                <component :is="views[step]" :state="state" @next="next"></component>
            </div>
        </div>
        <div class="w-full bg-gray-800 flex-grow-0">
            <PageFooter />
        </div>
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

// To add more views in the setup dialogs, add them to this list.
// Just make sure 'Final' is the last one.
const views = [
    Start,
    CreateAdminUser,
    License,
    Options,
    Final
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
        }
    },
    components: {
        PageFooter,
        Logo,
        CreateAdminUser,
        License
    }
}
</script>
