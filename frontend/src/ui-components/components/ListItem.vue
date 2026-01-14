<template>
    <MenuItem v-slot="{ active }" as="template" :disabled="disabled">
        <li
            class="ff-list-item"
            :class="{[className]: kind.length, active, disabled: disabled}"
            :data-el="'kebab-item-' + slugify(label)"
        >
            <component :is="icon" />
            <label>{{ label }}</label>
        </li>
    </MenuItem>
</template>

<script>
import { MenuItem } from '@headlessui/vue'

import { slugify } from '../../composables/String.js'

export default {
    name: 'ff-list-item',
    components: {
        MenuItem
    },
    props: {
        icon: {
            type: Function,
            default: null
        },
        label: {
            type: String,
            default: ''
        },
        kind: {
            type: String,
            default: ''
        },
        disabled: {
            type: Boolean,
            default: false
        }
    },
    computed: {
        className () {
            return 'ff-list-item--' + this.kind
        }
    },
    methods: { slugify }
}
</script>
