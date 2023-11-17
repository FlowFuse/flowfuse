<template>
    <div ref="options" class="ff-tile-selection">
        <slot name="default" />
    </div>
</template>

<script>

export default {
    name: 'ff-tile-selection',
    props: {
        modelValue: {
            default: null,
            type: [String, Number]
        },
        /**
         * Allow the selected option to be toggled
         */
        allowDeselect: {
            default: false,
            type: [Boolean, null]
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
                if (this.allowDeselection) {
                    this.$emit('update:modelValue', null)
                }
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
