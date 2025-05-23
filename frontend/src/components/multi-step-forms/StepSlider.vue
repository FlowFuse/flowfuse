<template>
    <div class="step-slider">
        <div class="wrapper">
            <ul class="progress" :class="{'multi-step': entries.length > 1, 'single-step': entries.length === 1}">
                <li
                    v-for="(entry, $key) in entries"
                    :key="$key"
                    class="st"
                    data-el="slider-step"
                    :class="{completed: $key <= currentEntry, disabled: entry.disabled}"
                >
                    <span />
                </li>
            </ul>
            <ul class="steps" :class="{'justify-center': entries.length === 1, 'justify-between': entries.length > 1}">
                <li
                    v-for="(entry, $key) in entries"
                    :key="$key"
                    class="step cursor-pointer"
                    data-el="slider-title"
                    :class="{active: $key === currentEntry, completed: $key <= currentEntry, disabled: entry.disabled}"
                    @click="select($key, entry.disabled)"
                >
                    <span class="label">
                        {{ entry.title }}
                    </span>
                </li>
            </ul>
        </div>
    </div>
</template>

<script>
export default {
    name: 'StepSlider',
    props: {
        entries: {
            type: Array,
            required: true
        },
        currentEntry: {
            type: Number,
            required: true
        },
        disableNextStep: {
            type: Boolean,
            required: false,
            default: false
        }
    },
    emits: ['step-selected'],
    methods: {
        select (key, disabled) {
            if (this.disableNextStep) {
                return
            }
            if (disabled !== true) {
                this.$emit('step-selected', key)
            }
        }
    }
}
</script>

<style scoped lang="scss">
.step-slider {
    width: 100%;

    .wrapper {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: space-between;
        position: relative;
        max-width: 600px;
        margin: auto;
        min-height: 50px;

        .progress {
            position: absolute;
            left: 0;
            top: 15px;
            height: 4px;
            background: $ff-grey-300;
            transform: translateY(-50%);
            z-index: 1;
            display: flex;
            justify-content: space-between;
            overflow: hidden;

            &.multi-step {
                width: 99%;
            }
            &.single-step {
                width: 0;
            }

            .st {
                position: relative;

                span {
                    width: 1000px;
                    height: 4px;
                    background: $ff-indigo-600;
                    z-index: 3;
                    display: block;
                    right: 0;
                    position: absolute;
                    transform: translateX(-1000%);
                    transition: transform .3s ease-in-out;
                }

                &.completed {
                    span {
                        transform: translateX(0);
                    }
                }
            }
        }

        .steps {
            width: 100%;
            position: absolute;
            left: 0;
            top: 5px;
            display: flex;

            .step {
                position: relative;
                width: 20px;
                height: 20px;
                background-color: $ff-grey-400;
                border-radius: 50%;
                z-index: 2;
                transition: ease-in-out .3s;

                &.completed {
                    background-color: $ff-indigo-600;
                }

                &.active {
                    transform: scale(1.1);
                    background-color: $ff-indigo-600;

                    .label {
                        color: $ff-indigo-700;
                    }
                }

                &.disabled {
                    cursor: default;
                }

                .label {
                    position: absolute;
                    left: 50%;
                    transform: translate(-50%, 150%);
                    font-weight: bold;
                    color: $ff-grey-300;
                    transition: ease-in-out .3s;
                }
            }
        }
    }
}
</style>
