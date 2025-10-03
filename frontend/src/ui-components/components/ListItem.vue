<template>
    <li class="ff-list-item" :class="[className, disabled ? 'disabled' : ''] " :data-el="'kebab-item-' + slugify(label)">
        <component :is="icon" />
        <label>{{ label }}</label>
    </li>
</template>

<script>
import { slugify } from '../../composables/String.js'
export default {
    name: 'ff-list-item',
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
