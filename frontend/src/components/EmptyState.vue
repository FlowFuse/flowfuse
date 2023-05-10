<template>
    <div class="ff-empty-state">
        <div>
            <slot name="img" />
            <h1>
                <slot name="header" />
            </h1>
            <div class="ff-empty-state--message">
                <slot name="message" />
            </div>
            <div class="ff-empty-state--actions">
                <slot name="actions" />
            </div>
            <div class="ff-empty-state--note">
                <slot name="note" />
            </div>
        </div>
    </div>
</template>

<script>
export default {
    name: 'EmptyState'
}
</script>

<style lang="scss">
@import "../stylesheets/components/empty-state.scss";
</style>
