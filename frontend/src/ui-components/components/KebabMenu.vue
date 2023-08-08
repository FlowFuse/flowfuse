<template>
    <div class="ff-kebab-menu" :class="{'active': open}">
        <!-- using this v-if hack in order to enable both
        the button and click-outside to work when closing the menu -->
        <DotsVerticalIcon v-if="!open" @click.stop="openOptions()" />
        <DotsVerticalIcon v-if="open" @click.stop="closeOptions()" />
        <template v-if="open">
            <ul v-click-outside="closeOptions" class="ff-kebab-options"
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
            open: false
        }
    },
    methods: {
        openOptions () {
            this.open = !this.open
        },
        closeOptions () {
            this.open = false
        }
    }
}
</script>
