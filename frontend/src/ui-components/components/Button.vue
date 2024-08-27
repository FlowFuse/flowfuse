<template>
    <a v-if="type==='anchor'" ref="input" class="ff-btn transition-fade--color" :target="target" :class="'ff-btn--' + kind + (hasIcon ? ' ff-btn-icon' : '') + (size === 'small' ? ' ff-btn-small' : '') + (size === 'full-width' ? ' ff-btn-fwidth' : '')" :href="(!to || disabled) ? null : to" :aria-disabled="disabled===true?'true':null" :disabled="disabled===true?'true':null">
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
    </a>
    <button v-else ref="input" class="ff-btn transition-fade--color" :type="type" :class="'ff-btn--' + kind + (hasIcon ? ' ff-btn-icon' : '') + (size === 'small' ? ' ff-btn-small' : '') + (size === 'full-width' ? ' ff-btn-fwidth' : '')" :disabled="disabled===true?'true':null" @click="go()">
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
            default: 'button', // "button", "submit" or "anchor"
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
        /** Only applicable to type="anchor" */
        target: {
            default: '_self',
            type: [String]
        },
        hasRightIcon: {
            default: true,
            type: Boolean
        },
        hasLeftIcon: {
            default: true,
            type: Boolean
        },
        disabled: {
            default: null,
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
            if (!this.disabled && this.to) {
                this.$router.push(this.to)
            }
        },
        focus () {
            if (!this.disabled) {
                this.$refs.input?.focus()
            }
        },
        blur () {
            this.$refs.input?.blur()
        }
    }
}
</script>
