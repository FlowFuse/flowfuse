<template>
    <div class="ff-icon-anim ff-icon-restarting">
        <ArrowPathIcon />
    </div>
</template>

<script>
import {
    ArrowPathIcon
} from '@heroicons/vue/24/outline'

export default {
    name: 'AnimIconStarting',
    components: {
        ArrowPathIcon
    }
}
</script>

<style lang="scss" scoped>

.ff-icon-restarting svg {
    --anim-time: 1s;
    position: relative;
    color: currentColor;
    animation: ff-icon-restarting var(--anim-time) infinite linear;
}

@keyframes ff-icon-restarting {
  0% {
    opacity: 0.2;
    transform: rotate(360deg);
  }
  33% {
    opacity: 1;
  }
  66% {
    opacity: 1;
  }
  100% {
    opacity: 0.2;
    transform: rotate(0deg);
  }
}
</style>
