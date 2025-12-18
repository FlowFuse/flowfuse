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
            position: { top: 0, left: 0, width: 0, transform: '' }
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
            const width = Math.max(rect.width, this.minOptionsWidth)
            const gap = 4 // small gap between dropdown and trigger
            this.position = {
                top: this.openAbove
                    ? rect.top + window.scrollY - gap + this.optionsOffsetTop
                    : rect.bottom + window.scrollY + this.optionsOffsetTop,
                left: this.alignRight
                    ? rect.right + window.scrollX - width
                    : rect.left + window.scrollX,
                width,
                transform: this.openAbove ? 'translateY(-100%)' : ''
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
