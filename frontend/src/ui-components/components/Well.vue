<template>
    <div class="ff-well">
        <slot></slot>
    </div>
</template>

<script>
// A box set a shade apart from the page, for text that is read and not edited, such as notes
export default {
    name: 'ff-well'
}
</script>

<style lang="scss" scoped>
// The raised surface is one step from the page's own in the light theme and in the dark one
.ff-well {
    padding: 12px 16px;
    border: 1px solid var(--ff-color-border);
    border-radius: 0.625rem;
    background-color: var(--ff-color-bg-surface-raised);
    font-size: 0.875rem;
    color: var(--ff-color-text);
}
</style>
