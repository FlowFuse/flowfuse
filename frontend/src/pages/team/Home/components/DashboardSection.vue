<template>
    <div class="ff-box" :data-el="`dashboard-section-${type}`">
        <div class="ff-box-header">
            <span v-if="$slots.icon" class="icon">
                <slot name="icon" />
            </span>
            <h3 v-if="title" class="ff-box-title">
                <span>
                    {{ title }}
                </span>
            </h3>
        </div>
        <div class="ff-box-content flex flex-col flex-1 overflow-auto">
            <slot />
        </div>
    </div>
</template>

<script>
export default {
    name: 'DashboardSection',
    props: {
        title: {
            type: String,
            required: false,
            default: null
        },
        type: {
            type: String,
            required: true
        }
    }
}
</script>

<style scoped lang="scss">
.ff-box {
    border: 1px solid $ff-color--border;
    background: $ff-white;
    padding: 10px;
    display: flex;
    flex-direction: column;
    flex: 1;

    .ff-box-header {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 10px;

        .ff-box-title {
            margin: 0;
            padding: 0;
            font-size: 1.3rem;
        }
    }
}
</style>
