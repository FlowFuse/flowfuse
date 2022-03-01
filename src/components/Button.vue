<template>
    <button class="ff-btn" :class="'ff-btn--' + kind + (hasIcon ? ' ff-btn-icon' : '') + (size === 'small' ? ' ff-btn-small' : '')">
        <span v-if="hasIconLeft" class="ff-btn--icon ff-btn--icon-left">
            <slot name="icon-left"></slot>
        </span>
        <slot></slot>
        <span v-if="hasIconRight" class="ff-btn--icon ff-btn--icon-right">
            <slot name="icon-right"></slot>
        </span>
    </button>
</template>

<script>
export default {
    name: 'ff-button',
    props: {
        kind: {
            default: 'primary',
            type: String // "primary", "secondary", "tertiary"
        },
        size: {
            default: 'normal',
            type: String // "small", "normal"
        }
    },
    computed: {
        hasIcon: function () {
            return this.$slots['icon-left'] || this.$slots['icon-right']
        },
        hasIconLeft: function () {
            return this.$slots['icon-left']
        },
        hasIconRight: function () {
            return this.$slots['icon-right']
        }
    }
}
</script>
