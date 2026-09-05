<template>
    <form class="">
        <p class="text-center">{{ $t('ui.welcomeToYourShinyNewFlowfusePlatform') }}</p>
        <p class="text-center">{{ $t('ui.letSGetItSetupForYouToStartUsing') }}</p>
        <div class="flex justify-center">
            <ff-button class="mt-6" @click="done()">{{ $t('ui.startSetup') }}</ff-button>
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
