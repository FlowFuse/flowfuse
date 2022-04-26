<template>
    <li class="ff-nav-item">
        <component v-if="icon" :is="icon" />
        <img v-if="avatar" :src="avatar" class="ff-avatar"/>
        <label>{{ label }}</label>
    </li>
</template>

<script>
export default {
    name: 'NavItem',
    props: {
        icon: {
            type: String
        },
        avatar: {
            type: String
        },
        label: {
            type: String
        }
    }
}
</script>
