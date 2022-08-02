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
    watch: {
        modelValue: function (value) {
            console.log(value)
            this.$nextTick(() => {
                for (let i = 0; i < this.children.length; i++) {
                    if (value !== this.children[i].value) {
                        this.children[i].selected = false
                    } else {
                        this.children[i].selected = true
                    }
                }
            })
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
        },
        setSelected (selected) {
            console.log(selected)
            if (selected?.value === this.modelValue) {
                this.$emit('update:modelValue', null)
            } else {
                this.$emit('update:modelValue', selected.value)
            }
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
    }
}
</script>
