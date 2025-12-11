<template>
    <div class="ff-toggle-group" data-nav="ff-toggle">
        <div v-if="title" class="title" :class="{ 'sr-only': visuallyHideTitle }">
            <span>{{ title }}:</span>
        </div>
        <div class="toggle">
            <div class="inner-wrapper">
                <template v-if="usesLinks">
                    <router-link
                        v-for="(button, $key) in buttons"
                        :key="$key"
                        :to="button.to"
                    >
                        {{ button.title }}
                    </router-link>
                </template>
                <template v-else>
                    <ff-button
                        v-for="button in buttons" :key="button[valueKey]"
                        size="medium"
                        :class="{active: button[valueKey] === modelValue}"
                        @click="setValue(button.value)"
                    >
                        {{ button.title }}
                    </ff-button>
                </template>
            </div>
        </div>
    </div>
</template>

<script>
export default {
    name: 'ToggleButtonGroup',
    props: {
        title: {
            type: String,
            required: false,
            default: null
        },
        visuallyHideTitle: {
            type: Boolean,
            required: false,
            default: false
        },
        buttons: {
            type: Array, // [ { title: 'button title, ?to: {route..}, ?value: [string|object] } ]
            required: true
        },
        usesLinks: {
            type: Boolean,
            default: true
        },
        modelValue: {
            type: [String, Object],
            required: false,
            default: null
        },
        valueKey: {
            type: String,
            required: false,
            default: 'value'
        }
    },
    emits: ['update:modelValue'],
    methods: {
        setValue (value) {
            this.$emit('update:modelValue', value)
        }
    }
}
</script>

<style scoped lang="scss">
.ff-toggle-group {
    display: flex;
    gap: 15px;
    align-items: center;

    .title {
        color: $ff-black;
        font-weight: 400;
    }

    .toggle {
        border: 1px solid $ff-blue-800;
        display: flex;
        border-radius: 5px;

        .inner-wrapper {
            display: flex;
            gap: 10px;
            border-radius: 5px;
            border: 1px solid transparent;

            a {
                padding: 5px 10px;
                border-radius: 5px;
                transition: ease-in-out .2s;

                &.router-link-active {
                    background: $ff-blue-800;
                    color: $ff-white;
                }
            }

            .ff-btn {
                background: transparent;
                color: $ff-grey-500;
                border-color: transparent;

                &.active {
                    background: $ff-indigo-700;
                    color: $ff-white;
                }
            }
        }
    }
}
</style>
