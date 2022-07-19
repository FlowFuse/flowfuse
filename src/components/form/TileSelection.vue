<template>
    <div class="ff-tile-selection" ref="options">
        <slot name="default"></slot>
    </div>
</template>

<script>

export default {
    name: 'ff-tile-selection',
    emits: ['update:modelValue'],
    props: {
        modelValue: {
            default: null
        }
    },
    computed: {
        value: {
            get () {
                return this.selected
            },
            set (selected) {
                if (selected?.value === this.selected?.value) {
                    this.selected = null
                    this.$emit('update:modelValue', null)
                } else {
                    this.selected = selected
                    this.$emit('update:modelValue', selected.value)
                }
                for (let i = 0; i < this.children.length; i++) {
                    if (selected.value !== this.children[i].value) {
                        this.children[i].selected = false
                    }
                }
            }
        }
    },
    data () {
        return {
            selected: null,
            children: []
        }
    },
    methods: {
        registerOption: function (child) {
            this.children.push(child)
        }
    }
}
</script>
