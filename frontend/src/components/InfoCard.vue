<template>
    <div class="ff-info-card">
        <h3 class="text-gray-800 text-xl font-medium whitespace-nowrap">
            <slot name="icon" />
            {{ header }}
        </h3>
        <div class="ff-info-card-content">
            <slot name="content" />
        </div>
    </div>
</template>

<script>
export default {
    name: 'InfoCard',
    props: {
        header: {
            type: String,
            required: true
        }
    }
}
</script>

<style lang="scss">
@import "../stylesheets/components/info-card.scss";
</style>
