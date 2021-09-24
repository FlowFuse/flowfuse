<template>
<div class="flex align-center">
    <div class="flex flex-col justify-center"><img class="rounded-md mr-3 w-6 inline" :src="avatar"/></div>
    <div class="inline-flex flex-col">
        <div>{{ name }}</div>
        <div class="text-xs text-gray-500">{{username}}</div>
    </div>
</div>
</template>
<script>
export default {
    name: "UserCell",
    props: ['avatar','name','username']
}
</script>
