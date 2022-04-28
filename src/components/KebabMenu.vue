<template>
    <div class="ff-kebab-menu" :class="{'active': open}">
        <DotsVerticalIcon @click="open = !open"/>
        <ul v-if="open" class="ff-kebab-options" :class="'ff-kebab-options--' + menuAlign">
            <slot></slot>
        </ul>
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
    }
}
</script>
