<template>
    <form class="">
        <p class="text-center">Welcome to your shiny new FlowForge platform.</p>
        <p class="text-center">Let's get it setup for you to start using.</p>
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
