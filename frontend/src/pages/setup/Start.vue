<template>
    <form class="px-4 sm:px-6 lg:px-8 mt-8 space-y-4">
        <p class="text-gray-700 text-lg mt-10 text-center">Welcome to your shiny new FlowForge platform.</p>
        <p class="text-gray-700 text-center">Let's get it setup for you to start using.</p>
        <div class="flex justify-center">
            <ff-button @click="done()" class="mt-6">Start setup</ff-button>
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
