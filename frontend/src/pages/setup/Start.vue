<template>
    <form class="px-4 sm:px-6 lg:px-8 mt-8 space-y-4">
        <p class="text-gray-700 text-lg mt-10 text-center">Welcome to your shiny new FlowForge platform.</p>
        <p class="text-gray-700 text-center">Let's get it setup for you to start using.</p>
        <div class="space-x-2 text-center">
            <button type="button" @click="done" class="forge-button mt-6">Start setup</button>
        </div>
    </form>
</template>

<script>
export default {
    name: 'SetupFinal',
    methods: {
        done () {
            this.$emit('next')
        }
    }
}
</script>
