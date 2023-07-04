<template>
    <div data-el="empty-state">
        <FeatureUnavailable v-if="featureUnavailable" />
        <div
            class="ff-empty-state" :class="{'ff-empty-state-feature-unavailable': featureUnavailable}"
        >
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
    </div>
</template>

<script>
import FeatureUnavailable from './banners/FeatureUnavailable.vue'

export default {
    name: 'EmptyState',
    components: {
        FeatureUnavailable
    },
    props: {
        featureUnavailable: {
            type: Boolean,
            default: false
        }
    }
}
</script>

<style lang="scss">
@import "../stylesheets/components/empty-state.scss";
</style>
