<template>
    <div class="popover-item" @click="onClick">
        <div v-if="hasIcon" class="icon">
            <slot name="icon" />
        </div>
        <div class="content w-full">
            <div class="title">
                <h5>{{ title }}</h5>
            </div>
            <div v-if="description" class="description">
                {{ description }}
            </div>
            <slot name="content" />
        </div>
    </div>
</template>

<script>
import { defineComponent } from 'vue'

export default defineComponent({
    name: 'popover-item',
    props: {
        title: {
            type: String,
            required: true
        },
        description: {
            type: String,
            required: false,
            default: null
        },
        onClick: {
            required: false,
            type: Function,
            default: () => {}
        }
    },
    computed: {
        hasIcon: function () {
            return this.$slots.icon
        }
    }
})
</script>

<style scoped lang="scss">
.popover-item {
    display: flex;
    align-items: center;
    gap: 15px;
    padding: 10px 20px;
    cursor: pointer;

    .icon {
        padding: 5px;
    }

    .content {
        display: flex;
        flex-direction: column;

        .description {
            color: var(--ff-grey-400);
        }
    }

    &:hover {
        background: var(--ff-grey-100);
    }
}
</style>
