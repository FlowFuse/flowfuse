<template>
    <div class="ff-kebab-menu" :class="{'active': open}" data-el="kebab-menu">
        <!-- using this v-if hack in order to enable both
        the button and click-outside to work when closing the menu -->
        <DotsVerticalIcon v-if="!open" @click.stop="openOptions" />
        <DotsVerticalIcon v-if="open" @click.stop="closeOptions" />
        <template v-if="open">
            <ul :ref="menuOpening" v-click-outside="closeOptions" class="ff-kebab-options"
                :class="'ff-kebab-options--' + menuAlign"
            >
                <slot></slot>
            </ul>
        </template>
    </div>
</template>

<script>

import { DotsVerticalIcon } from '@heroicons/vue/solid'

export default {
    name: 'ff-kebab-menu',
    components: {
        DotsVerticalIcon
    },
    props: {
        // eslint-disable-next-line vue/prop-name-casing
        'menu-align': {
            type: String,
            default: 'right'
        }
    },
    data () {
        return {
            open: false,
            openEvent: null,
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight
            },
            mouse: {
                x: 0,
                y: 0
            }
        }
    },
    methods: {
        openOptions (event) {
            // update the viewport variable - BEFORE opening the menu
            this.viewport.width = window.innerWidth
            this.viewport.height = window.innerHeight

            // update the mouse position - BEFORE opening the menu
            this.mouse.x = event.clientX
            this.mouse.y = event.clientY

            // open the menu - this will cause the menu to render and the ref to be come available
            // which will in-turn trigger the menuOpening method
            this.open = !this.open
        },
        closeOptions () {
            this.openEvent = null
            this.open = false
        },
        menuOpening (el) {
            // get the height of the menu el
            const menu = {
                width: el.offsetWidth,
                height: el.offsetHeight
            }

            // check if the menu would be out of the viewport
            const left = this.mouse.x + menu.width + 20 > this.viewport.width // + 20 for padding
            const top = this.mouse.y + menu.height + 20 > this.viewport.height // + 20 for padding

            // if the menu would be out of the viewport, nudge it in a negative direction
            // (menu is positioned absolute, so we only need to change the top/left values as a negative offset)
            if (left && this.menuAlign !== 'right') {
                el.style.left = '-' + menu.width + 'px'
            }

            if (top) {
                el.style.top = '-' + menu.height + 'px'
            }
        }
    }
}
</script>
