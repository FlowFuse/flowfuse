export default {
    props: {
        optionsOffsetTop: {
            type: Number,
            default: 0
        },
        openAbove: {
            type: Boolean,
            default: false
        },
        minOptionsWidth: {
            type: Number,
            default: 0
        },
        alignRight: {
            type: Boolean,
            default: false
        }
    },
    data () {
        return {
            open: false,
            position: { top: 0, left: 0, width: 0 },
            optionsHeight: 0
        }
    },
    mounted () {
        document.addEventListener('click', this.handleClickOutside)
        window.addEventListener('resize', this.updatePosition)
        window.addEventListener('scroll', this.updatePosition, true)
    },
    beforeUnmount () {
        document.removeEventListener('click', this.handleClickOutside)
        window.removeEventListener('resize', this.updatePosition)
        window.removeEventListener('scroll', this.updatePosition, true)
    },
    methods: {
        updatePosition () {
            if (!this.$refs.trigger || !this.$refs.trigger.$el) return
            const rect = this.$refs.trigger.$el.getBoundingClientRect()
            // Estimate options height (max-height from CSS is 14rem = 224px)
            const estimatedOptionsHeight = 224
            const width = Math.max(rect.width, this.minOptionsWidth)
            this.position = {
                top: this.openAbove
                    ? rect.top + window.scrollY - estimatedOptionsHeight + this.optionsOffsetTop
                    : rect.bottom + window.scrollY + this.optionsOffsetTop,
                left: this.alignRight
                    ? rect.right + window.scrollX - width
                    : rect.left + window.scrollX,
                width
            }
        },
        handleClickOutside (e) {
            if (
                this.$refs.trigger.value &&
                this.$refs.trigger.value.$el &&
                !this.$refs.trigger.value.$el.contains(e.target)
            ) {
                close()
            }
        },
        close () {
            this.open = false
        }
    }
}
