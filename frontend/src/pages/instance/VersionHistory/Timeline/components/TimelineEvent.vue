<template>
    <div class="event flex justify-between gap-2 items-center">
        <div class="body flex flex-1 justify-between gap-2 items-center">
            <div class="graph">
                graph
            </div>
            <div class="content flex flex-1 flex-col justify-start">
                <div class="title">title</div>
                <div class="details">details</div>
            </div>
            <div class="username">username</div>
        </div>
        <div class="actions">
            ...
        </div>
    </div>
</template>

<script>
export default {
    name: 'TimelineEvent',
    props: {
        event: {
            type: Object,
            required: true
        }
    }
}
</script>

<style scoped lang="scss">
.event {
    padding: 15px 10px;
}
</style>
