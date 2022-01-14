<template>
    <div class="flex-grow flex flex-col items-center justify-center mx-auto h-92 text-gray-400">
        <div class="text-center">
            <div class="text-9xl">Oh Dear</div>
            <div class="text-2xl">We tried phoning the server, but no-one answered.</div>
            <div class="text-2xl mt-4"><button class="forge-button" @click="reload">Try again</button></div>
        </div>
    </div>
</template>
<script>
export default {
    name: "Offline",
    methods: {
        reload() {
            this.$store.dispatch('account/checkState');
        }
    }
}
</script>
