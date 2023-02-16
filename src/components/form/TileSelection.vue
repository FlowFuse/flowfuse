<template>
    <div ref="options" class="ff-tile-selection">
        <slot name="default"></slot>
    </div>
</template>

<script>

export default {
    name: 'ff-tile-selection',
    props: {
        modelValue: {
            default: null,
            type: [String, Number]
        }
    },
    emits: ['update:modelValue'],
    data () {
        return {
            selected: null,
            children: []
        }
    },
    watch: {
        modelValue: function (value) {
            this.$nextTick(() => {
                this.checkState(value)
            })
        }
    },
    mounted () {
        this.$nextTick(() => {
            for (let i = 0; i < this.children.length; i++) {
                if (this.modelValue !== this.children[i].value) {
                    this.children[i].selected = false
                } else {
                    this.children[i].selected = true
                }
            }
        })
    },
    methods: {
        registerOption: function (child) {
            this.children.push(child)
            this.checkState(this.modelValue)
        },
        setSelected (selected) {
            if (selected?.value === this.modelValue) {
                this.$emit('update:modelValue', null)
            } else {
                this.$emit('update:modelValue', selected.value)
            }
        },
        checkState (value) {
            for (let i = 0; i < this.children.length; i++) {
                this.children[i].selected = value === this.children[i].value
            }
        },
        focus () {
            this.children?.[0].focus()
        },
        blur () {
            for (const child of this.children) {
                child.blur()
            }
        }
    }
}
</script>
