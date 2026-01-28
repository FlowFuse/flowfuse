<template>
    <MenuItem v-slot="{ active }" as="template" :disabled="disabled">
        <li
            class="ff-kebab-item"
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

import { slugify } from '../../../composables/String.js'

export default {
    name: 'ff-kebab-item',
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
            return 'ff-kebab-item--' + this.kind
        }
    },
    methods: { slugify }
}
</script>
