<template>
    <div ref="trigger" class="ff-kebab-menu" :class="{'active': open}" data-el="kebab-menu">
        <DotsVerticalIcon @click.stop="toggleOptions" />
        <teleport to="body">
            <ul v-if="open && visible"
                ref="menu"
                v-click-outside="closeOptions"
                class="ff-kebab-options"
                :style="{
                    position: 'fixed',
                    top: position.top + 'px',
                    left: position.left + 'px'
                }"
            >
                <slot></slot>
            </ul>
        </teleport>
    </div>
</template>

<script>
import { DotsVerticalIcon } from '@heroicons/vue/solid'

export default {
    name: 'ff-kebab-menu',
    components: {
        DotsVerticalIcon
    },
    data () {
        return {
            open: false,
            visible: true,
            position: {
                top: 0,
                left: 0
            },
            observer: null
        }
    },
    mounted () {
        window.addEventListener('resize', this.updatePosition)
        window.addEventListener('scroll', this.updatePosition, true)
        this.initVisibilityObserver()
    },
    beforeUnmount () {
        window.removeEventListener('resize', this.updatePosition)
        window.removeEventListener('scroll', this.updatePosition, true)
        if (this.observer) {
            this.observer.disconnect()
        }
    },
    methods: {
        toggleOptions () {
            this.open = !this.open
            if (this.open) {
                this.$nextTick(this.updatePosition)
            }
        },
        closeOptions () {
            this.open = false
        },
        updatePosition () {
            if (!this.$refs.trigger || !this.$refs.menu) return

            const rect = this.$refs.trigger.getBoundingClientRect()
            const menu = this.$refs.menu
            const { width, height } = menu.getBoundingClientRect()

            const vw = window.innerWidth
            const vh = window.innerHeight

            let top = rect.bottom + window.scrollY
            let left = rect.left + window.scrollX

            if (top + height > window.scrollY + vh && rect.top - height >= 0) {
                top = rect.top + window.scrollY - height
            }

            if (left + width > window.scrollX + vw && rect.right - width >= 0) {
                left = rect.right + window.scrollX - width
            }

            this.position = { top, left }
        },
        initVisibilityObserver () {
            if (!window.IntersectionObserver || !this.$refs.trigger) return

            this.observer = new IntersectionObserver((entries) => {
                const entry = entries[0]
                if (!entry.isIntersecting && this.open) {
                    this.closeOptions()
                }
            }, {
                root: null,
                threshold: 0.01
            })

            this.observer.observe(this.$refs.trigger)
        }
    }
}
</script>
