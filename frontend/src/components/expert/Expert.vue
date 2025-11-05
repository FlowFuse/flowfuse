<template>
    <div class="ff-expert">
        <div class="ff-expert__placeholder">
            <!-- Expert content will go here -->
        </div>
    </div>
</template>

<script>
export default {
    name: 'ExpertPanel',
    data () {
        return {
        }
    }
}
</script>

<style lang="scss" scoped>
.ff-expert {
    padding: 1rem;
    height: 100%;

    &__placeholder {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        color: $ff-grey-500;
    }
}
</style>
