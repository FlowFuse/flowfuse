<template>
    <button ref="input" class="ff-btn transition-fade--color" :type="type" :class="'ff-btn--' + kind + (hasIcon ? ' ff-btn-icon' : '') + (size === 'small' ? ' ff-btn-small' : '') + (size === 'full-width' ? ' ff-btn-fwidth' : '')" @click="go()">
        <span v-if="hasIconLeft" class="ff-btn--icon ff-btn--icon-left">
            <slot name="icon-left"></slot>
        </span>
        <span v-if="isIconOnly" class="ff-btn--icon">
            <slot name="icon"></slot>
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
        type: {
            default: 'button', // "button" or "submit"
            type: String
        },
        kind: {
            default: 'primary',
            type: String // "primary", "secondary", "tertiary"
        },
        size: {
            default: 'normal',
            type: String // "small", "normal", "full-width"
        },
        to: {
            default: null,
            type: [String, Object]
        },
        hasRightIcon: {
            default: true,
            type: Boolean
        },
        hasLeftIcon: {
            default: true,
            type: Boolean
        }
    },
    computed: {
        hasIcon: function () {
            return this.$slots['icon-left'] || this.$slots['icon-right'] || this.$slots.icon
        },
        hasIconLeft: function () {
            return this.$slots['icon-left'] && this.hasLeftIcon
        },
        hasIconRight: function () {
            return this.$slots['icon-right'] && this.hasRightIcon
        },
        isIconOnly: function () {
            return this.$slots.icon
        }
    },
    methods: {
        go: function () {
            if (this.to) {
                this.$router.push(this.to)
            }
        },
        focus () {
            this.$refs.input?.focus()
        },
        blur () {
            this.$refs.input?.blur()
        }
    }
}
</script>
