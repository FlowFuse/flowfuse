<template>
    <div class="ff-kebab-menu" :class="{'active': open}">
        <!-- using this v-if hack in order to enable both
        the button and click-outside to work when closing the menu -->
        <DotsVerticalIcon v-if="!open" @click="openOptions()"/>
        <DotsVerticalIcon v-if="open" @click="closeOptions()"/>
        <template v-if="open">
            <ul class="ff-kebab-options" :class="'ff-kebab-options--' + menuAlign"
                v-click-outside="closeOptions">
                <slot></slot>
            </ul>
        </template>
    </div>
</template>

<script>

import { DotsVerticalIcon } from '@heroicons/vue/solid'

export default {
    name: 'ff-kebab-menu',
    props: {
        'menu-align': {
            type: String,
            default: 'right'
        }
    },
    components: {
        DotsVerticalIcon
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
