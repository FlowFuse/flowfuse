<template>
    <div class="mx-auto min-h-screen flex items-center justify-center bg-gray-50 py-12">
        <div class="sm:w-72 w-xs w-screen space-y-2">
            <div class="max-w-xs mx-auto w-full mb-4">
                <FlowForgeLogo/>
                <h2 class="mt-2 text-center text-3xl font-bold text-gray-900">
                    <span>FLOW</span><span class="font-light">FORGE</span>
                </h2>
            </div>
            <form class="px-4 sm:px-6 lg:px-8 mt-8 space-y-6">
                <UpdateExpiredPassword />
            </form>
        </div>
    </div>
</template>

<script>
import { mapState } from 'vuex'
import FlowForgeLogo from '@/components/Logo'
import UpdateExpiredPassword from '@/components/auth/UpdateExpiredPassword'

export default {
    name: 'PasswordExpired',
    methods: {
    },
    computed: mapState('account', ['user']),
    components: {
        FlowForgeLogo,
        UpdateExpiredPassword
    }
}
</script>
