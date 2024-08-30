<template>
    <div class="status-wrapper">
        <transition name="fade" mode="out-in">
            <div v-if="hasAnimationData">
                <lottie-animation
                    :key="computedState"
                    :animationData="animationData"
                    :loop="shouldLoop"
                />
                <label class="status-text">{{ state }} Instance...</label>
            </div>
            <InstanceStatusBadge
                v-else
                :status="state"
                :optimisticStateChange="optimisticStateChange"
                :pendingStateChange="pendingStateChange"
            />
        </transition>
    </div>
</template>

<script>
import InstanceStatusBadge from '../../components/InstanceStatusBadge.vue'

export default {
    name: 'LoadingScreenWrapper',
    components: { InstanceStatusBadge },
    props: {
        state: {
            required: true,
            type: [String, null, undefined],
            default: null
        },
        pendingStateChange: {
            required: false,
            type: Boolean,
            default: false
        },
        optimisticStateChange: {
            required: false,
            type: Boolean,
            default: false
        }
    },
    data () {
        return {
            loopableAnimations: [
                'suspending',
                'starting',
                'loading'
            ],
            replacedAnimations: {
                starting: 'loading',
                restarting: 'loading'
            }
        }
    },
    computed: {
        computedState () {
            if (this.replacedAnimations[this.state]) {
                return this.replacedAnimations[this.state]
            } return this.state
        },
        shouldLoop () {
            return this.loopableAnimations.includes(this.computedState)
        },
        animationData () {
            try {
                return require(`../../../../images/lottie/immersive-editor-loading-states/${this.computedState}.json`)
            } catch (error) {
                return null
            }
        },
        hasAnimationData () {
            return !!this.animationData
        }
    }
}
</script>

<style scoped lang="scss">
.status-wrapper {
  display: flex;
  justify-content: center;
}
.status-wrapper .status-text {
    font-size: 1.5rem;
    font-weight: bold;
    display: block;
    text-align: center;
    padding: 24px;
    text-transform: capitalize;
}
</style>
