<template>
    <div class="ff-icon-anim ff-icon-installing">
        <ArrowDownIcon />
    </div>
</template>

<script>
import {
    ArrowDownIcon
} from '@heroicons/vue/outline'

export default {
    name: 'AnimIconStarting',
    components: {
        ArrowDownIcon
    }
}
</script>

<style lang="scss" scoped>

.ff-icon-anim {
    display: flex;
    justify-content: center;
    align-items: center;
}

.ff-icon-installing {
    overflow: hidden;
}

.ff-icon-installing svg {
    --anim-time: 0.75s;
    position: relative;
    color: currentColor;
    animation: ff-icon-installing var(--anim-time) infinite linear;
    animation-delay: calc(var(--anim-time) / 2);
}

@keyframes ff-icon-installing {
  0% {
    opacity: 0;
    transform: translate(0, -100%);
  }
  50% {
    opacity: 1;
    transform: translate(0, 0);
  }
  100% {
    opacity: 0;
    transform: translate(0, 100%);
  }
}
</style>
