<template>
    <div ref="trigger" class="ff-kebab-menu" :class="{'active': open}" data-el="kebab-menu">
        <DotsVerticalIcon v-if="!open" @click.stop="openOptions" />
        <DotsVerticalIcon v-if="open" @click.stop="closeOptions" />
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
            }
        }
    },
    mounted () {
        window.addEventListener('resize', this.updatePosition)
        window.addEventListener('scroll', this.updatePosition, true)
    },
    beforeUnmount () {
        window.removeEventListener('resize', this.updatePosition)
        window.removeEventListener('scroll', this.updatePosition, true)
    },
    methods: {
        openOptions () {
            this.open = true
            this.$nextTick(this.updatePosition)
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

            // Default positions
            let top = rect.bottom + window.scrollY
            let left = rect.left + window.scrollX

            // Try flipping vertically
            if (top + height > window.scrollY + vh && rect.top - height >= 0) {
                top = rect.top + window.scrollY - height
            }

            // Try flipping horizontally
            if (left + width > window.scrollX + vw && rect.right - width >= 0) {
                left = rect.right + window.scrollX - width
            }

            this.position = { top, left }

            // Determine visibility of trigger
            const triggerFullyVisible = (
                rect.top >= 0 &&
                rect.left >= 0 &&
                rect.bottom <= vh &&
                rect.right <= vw
            )
            this.visible = triggerFullyVisible
        }
    }
}
</script>
