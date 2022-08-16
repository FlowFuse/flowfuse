<template>
    <div class="flex align-center">
        <div class="inline-flex flex-col">
            <div>{{ type.name }}</div>
        </div>
    </div>
</template>
<script>
export default {
    name: 'TeamTypeCell',
    props: ['type']
}
</script>
