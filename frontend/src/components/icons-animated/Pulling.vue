<template>
    <div class="ff-icon-anim ff-icon-pulling">
        <ArrowDownIcon />
    </div>
</template>

<script>
import {
    ArrowDownIcon
} from '@heroicons/vue/outline'

export default {
    name: 'AnimIconPulling',
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

.ff-icon-pulling {
    overflow: hidden;
}

.ff-icon-pulling svg {
    --anim-time: 0.75s;
    position: relative;
    color: currentColor;
    animation: ff-icon-pulling var(--anim-time) infinite linear;
    animation-delay: calc(var(--anim-time) / 2);
}

@keyframes ff-icon-pulling {
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
