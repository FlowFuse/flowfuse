<template>
    <div class="ff-icon-anim">
        <span class="ff-icon-starting" />
    </div>
</template>

<script>
export default {
    name: 'AnimIconStarting'
}
</script>

<style lang="scss" scoped>
.ff-icon-anim {
    display: flex;
    justify-content: center;
    align-items: center;
}

.ff-icon-starting {
    --cell-width: 2px;
    --cell-offset: calc(var(--cell-width) * 1.5);
    --anim-time: 0.5s;
    position: relative;
    width: var(--cell-width);
    height: var(--cell-width);
    border-radius: 5px;
    background-color: currentColor;
    color: currentColor;
    animation: ff-icon-starting var(--anim-time) infinite linear alternate;
    animation-delay: calc(var(--anim-time) / 2);
}

.ff-icon-starting::before, .ff-icon-starting::after {
    content: "";
    display: inline-block;
    position: absolute;
    top: 0;
}
.ff-icon-starting::before {
    left: calc(-1 * var(--cell-offset));
    width: var(--cell-width);
    height: var(--cell-width);
    border-radius: 5px;
    background-color: currentColor;
    color: currentColor;
    animation: ff-icon-starting var(--anim-time) infinite alternate;
    animation-delay: 0s;
}
.ff-icon-starting::after {
    left: var(--cell-offset);
    width: var(--cell-width);
    height: var(--cell-width);
    border-radius: 5px;
    background-color: currentColor;
    color: currentColor;
    animation: ff-icon-starting var(--anim-time) infinite alternate;
    animation-delay: var(--anim-time);
}

@keyframes ff-icon-starting {
  0% {
    background-color: currentColor;
  }
  50%, 100% {
    background-color: rgba($ff-grey-500, 0.2);
  }
}
</style>
