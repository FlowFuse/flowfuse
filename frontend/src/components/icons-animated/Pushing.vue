<template>
    <div class="ff-icon-anim ff-icon-pushing">
        <ArrowUpIcon />
    </div>
</template>

<script>
import {
    ArrowUpIcon
} from '@heroicons/vue/outline'

export default {
    name: 'AnimIconPushing',
    components: {
        ArrowUpIcon
    }
}
</script>

<style lang="scss" scoped>

.ff-icon-anim {
    display: flex;
    justify-content: center;
    align-items: center;
}

.ff-icon-pushing {
    overflow: hidden;
}

.ff-icon-pushing svg {
    --anim-time: 0.75s;
    position: relative;
    color: currentColor;
    animation: ff-icon-pushing var(--anim-time) infinite linear;
    animation-delay: calc(var(--anim-time) / 2);
}

@keyframes ff-icon-pushing {
  0% {
    opacity: 0;
    transform: translate(0, 100%);
  }
  50% {
    opacity: 1;
    transform: translate(0, 0);
  }
  100% {
    opacity: 0;
    transform: translate(0, -100%);
  }
}
</style>
