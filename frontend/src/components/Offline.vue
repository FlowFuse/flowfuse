<template>
    <div class="grow flex flex-col items-center justify-center mx-auto h-92 text-gray-400">
        <div class="text-center text-white">
            <div class="text-6xl mb-3">{{ $t('ui.ohDear') }}</div>
            <div class="text-2xl">{{ $t('ui.weTriedPhoningTheServerButNoOneAnswered') }}</div>
            <div class="text-2xl mt-4">
                <ff-button class="m-auto" kind="primary" @click="reload">{{ $t('ui.tryAgain') }}</ff-button>
            </div>
        </div>
    </div>
</template>
<script>
import { useAccountAuthStore } from '@/stores/account-auth.js'

export default {
    name: 'OfflineMessage',
    methods: {
        reload () {
            useAccountAuthStore().checkState()
        }
    }
}
</script>
