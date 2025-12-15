<template>
    <div class="ff-toggle-group" data-nav="ff-toggle">
        <div v-if="title" class="title" :class="{ 'sr-only': visuallyHideTitle }">
            <span>{{ title }}:</span>
        </div>
        <div class="toggle">
            <div class="inner-wrapper">
                <div class="indicator" :style="indicatorStyle" />
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
    computed: {
        selectedIndex () {
            if (this.usesLinks) {
                // For router-links, find index based on current route
                return this.buttons.findIndex(b => this.$route.path === b.to?.path || this.$route.name === b.to?.name)
            }
            return this.buttons.findIndex(b => b[this.valueKey] === this.modelValue)
        },
        indicatorStyle () {
            if (this.selectedIndex < 0) return { opacity: 0 }
            return {
                transform: `translateX(${this.selectedIndex * 100}%)`,
                width: `${100 / this.buttons.length}%`
            }
        }
    },
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
            gap: 0;
            border-radius: 4px;
            border: 1px solid transparent;
            position: relative;

            .indicator {
                position: absolute;
                top: 0;
                left: 0;
                height: 100%;
                background: $ff-indigo-700;
                border-radius: 4px;
                transition: transform 0.2s ease;
                z-index: 0;
            }

            a {
                padding: 5px 10px;
                border-radius: 4px;
                transition: color 0.2s ease;
                position: relative;
                z-index: 1;
                flex: 1;
                text-align: center;

                &.router-link-active {
                    color: $ff-white;
                }
            }

            .ff-btn {
                background: transparent;
                color: $ff-grey-500;
                border-color: transparent;
                position: relative;
                z-index: 1;
                flex: 1;

                &.active {
                    color: $ff-white;
                }
            }
        }
    }
}
</style>
