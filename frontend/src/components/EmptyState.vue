<template>
    <div class="ff-empty-state">
        <h1>
            <slot name="header"></slot>
        </h1>
        <div class="ff-empty-state--message">
            <slot name="message"></slot>
        </div>
        <div class="ff-empty-state--actions">
            <slot name="actions"></slot>
        </div>
    </div>
</template>

<script>
export default {
    name: "EmptyState"
}
</script>

<style lang="scss">
@import "../stylesheets/components/empty-state.scss";
</style>