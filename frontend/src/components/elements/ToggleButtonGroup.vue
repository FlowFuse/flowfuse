<template>
    <div class="ff-toggle-group" data-nav="ff-toggle">
        <div v-if="title" class="title" :class="{ 'sr-only': visuallyHideTitle }">
            <span>{{ title }}:</span>
        </div>
        <div class="toggle">
            <div class="inner-wrapper">
                <router-link
                    v-for="(button, $key) in buttons"
                    :key="$key"
                    :to="button.to"
                >
                    {{ button.title }}
                </router-link>
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
            type: Array, // [ { title: 'button title, to: {route..} } ]
            required: true
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
        color: var(--ff-black);
        font-weight: 400;
    }

    .toggle {
        border: 1px solid var(--ff-blue-800);
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
                    background: var(--ff-blue-800);
                    color: var(--ff-white);
                }
            }
        }
    }
}
</style>
