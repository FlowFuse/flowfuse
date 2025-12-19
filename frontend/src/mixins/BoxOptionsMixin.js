export default {
    props: {
        optionsOffsetTop: {
            type: Number,
            default: 0
        },
        alignRight: {
            type: Boolean,
            default: false
        },
        optionsTriggerGap: {
            type: Number,
            default: 5
        }
    },
    data () {
        return {
            open: false,
            position: { top: 0, left: 0, width: 0, transform: '' }
        }
    },
    computed: {
        triggerBoundingClientRect () {
            return this.$refs.trigger.$el.getBoundingClientRect()
        },
        menuItemsBoundingClientRect () {
            return this.$refs['menu-items'].$el.getBoundingClientRect()
        },
        areMenuItemsOverflowingRight () {
            if (!this.$refs['menu-items'] || !this.$refs['menu-items'].$el) return false
            return this.menuItemsBoundingClientRect.right > window.innerWidth
        },
        areMenuItemsOverflowingTop () {
            if (!this.$refs['menu-items'] || !this.$refs['menu-items'].$el) return false
            return this.menuItemsBoundingClientRect.top < 0
        },
        areMenuItemsOverflowingBottom () {
            if (!this.$refs['menu-items'] || !this.$refs['menu-items'].$el) return false
            return this.menuItemsBoundingClientRect.bottom > window.innerHeight
        },
        areMenuItemsOverflowingLeft () {
            if (!this.$refs['menu-items'] || !this.$refs['menu-items'].$el) return false
            return this.menuItemsBoundingClientRect.left < 0
        },
        isOverflowing () {
            return (
                this.areMenuItemsOverflowingRight ||
                this.areMenuItemsOverflowingTop ||
                this.areMenuItemsOverflowingBottom ||
                this.areMenuItemsOverflowingLeft
            )
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

            const rect = this.triggerBoundingClientRect

            this.position = {
                top: rect.bottom + window.scrollY + this.optionsOffsetTop,
                left: rect.left + window.scrollX,
                width: rect.left + window.scrollX,
                transform: ''
            }
        },
        handleClickOutside (e) {
            if (
                this.$refs.trigger.value &&
                this.$refs.trigger.value.$el &&
                !this.$refs.trigger.value.$el.contains(e.target)
            ) {
                this.close()
            }
        },
        close () {
            this.open = false
        }
    }
}
