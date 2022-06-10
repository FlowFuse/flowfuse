<template>
    <div class="flex-grow flex flex-col items-center justify-center mx-auto h-92 text-gray-400">
        <div class="text-center text-white">
            <div class="text-6xl mb-3">Oh Dear</div>
            <div class="text-2xl">We tried phoning the server, but no-one answered.</div>
            <div class="text-2xl mt-4">
                <ff-button class="m-auto" kind="primary" @click="reload">Try again</ff-button>
            </div>
        </div>
    </div>
</template>
<script>
export default {
    name: 'OfflineMessage',
    methods: {
        reload () {
            this.$store.dispatch('account/checkState')
        }
    }
}
</script>
