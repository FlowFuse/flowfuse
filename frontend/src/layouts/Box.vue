<template>
    <div class="ff-layout--box">
        <div class="ff-layout--box--wrapper" :class="{'md:grid-cols-2 max-w-6xl': !!$slots['splash-content'], 'max-w-2xl': !$slots['splash-content']}">
            <div v-if="!!$slots['splash-content']" class="ff-layout--box--left hidden md:flex">
                <div class="ff-layout--box--content">
                    <div class="ff-logo">
                        <img class="ff-logo--light" src="/ff-logo--wordmark--light.png">
                        <img class="ff-logo--dark" src="/ff-logo--wordmark--dark.png">
                    </div>
                    <slot name="splash-content" />
                </div>
            </div>
            <div class="ff-layout--box--right">
                <div class="ff-layout--box--content">
                    <div v-if="!$slots['splash-content']" class="ff-logo">
                        <img class="ff-logo--light" src="/ff-logo--wordmark--light.png">
                        <img class="ff-logo--dark" src="/ff-logo--wordmark--dark.png">
                    </div>
                    <slot />
                </div>
            </div>
        </div>
        <PlatformAlerts />
    </div>
</template>

<script>
import PlatformAlerts from '../components/PlatformAlerts.vue'

export default {
    name: 'ff-layout-box',
    components: { PlatformAlerts }
}
</script>

<style lang="scss" scoped>

</style>
