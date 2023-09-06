<template>
    <form class="">
        <p class="text-center">Welcome to your shiny new FlowFuse platform.</p>
        <p class="text-center">Let's get it setup for you to start using.</p>
        <div class="flex justify-center">
            <ff-button class="mt-6" @click="done()">Start setup</ff-button>
        </div>
    </form>
</template>

<script>
export default {
    name: 'SetupFinal',
    emits: ['next'],
    methods: {
        done () {
            this.$emit('next')
        }
    }
}
</script>
