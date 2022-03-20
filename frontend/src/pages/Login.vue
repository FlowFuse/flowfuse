<template>
    <div class="mx-auto flex-grow flex items-center justify-center bg-gray-50 py-12">
        <div class="sm:w-72 w-screen space-y-2">
            <template v-if="!pending">
                <div class="max-w-xs mx-auto w-full mb-4">
                    <Logo/>
                    <h2 class="mt-2 text-center text-3xl font-bold text-gray-900">
                        <span>FLOW</span><span class="font-light">FORGE</span>
                    </h2>
                </div>
                <form class="px-4 sm:px-6 lg:px-8 mt-8 space-y-6">
                    <template v-if="authMode === 'select'">
                        <div class="h-48 pt-12">
                            <ff-button class="m-auto" @click="selectCredentials">
                                <template v-slot:icon-left><LockClosedIcon aria-hidden="true" /></template>
                                Login with username
                            </ff-button>
                            <ff-button v-if="settings['user:signup']" class="m-auto mt-4" size="small" kind="secondary" to="/account/create">Sign up</ff-button>
                        </div>
                    </template>
                    <template v-if="authMode === 'credentials'">
                        <AuthCredentials />
                    </template>
                </form>
            </template>
            <template v-else>
                <div class="flex justify-center">
                    <div class="w-1/2"><Logo /></div>
                </div>
            </template>
        </div>
    </div>
</template>

<script>
import { mapState } from 'vuex'
import Logo from '@/components/Logo'
import AuthCredentials from '@/components/auth/Credentials'
import { LockClosedIcon } from '@heroicons/vue/outline'

export default {
    name: 'LoginPage',
    data () {
        return {
            authMode: 'select'
        }
    },
    methods: {
        selectCredentials () {
            this.authMode = 'credentials'
        }
    },
    computed: mapState('account', ['settings', 'pending']),
    components: {
        Logo,
        LockClosedIcon,
        AuthCredentials
    }
}
</script>
