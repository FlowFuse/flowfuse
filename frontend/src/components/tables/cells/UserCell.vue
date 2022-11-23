<template>
    <div class="flex items-center">
        <div class="flex flex-col justify-center"><img class="rounded-md mr-2 w-6 inline" :src="avatar"/></div>
        <div class="inline-flex flex-col">
            <div v-if="name">{{ name }}</div>
            <div v-if="username" :class="[name ? 'text-xs text-gray-400' : '']">{{username}}</div>
        </div>
    </div>
</template>
<script>
export default {
    name: 'UserCell',
    props: ['avatar', 'name', 'username']
}
</script>
