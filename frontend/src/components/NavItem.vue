<template>
    <li class="ff-nav-item">
        <div class="flex">
            <component v-if="icon" :is="icon" />
            <img v-if="avatar" :src="avatar" class="ff-avatar"/>
            <label>{{ label }}</label>
        </div>
        <ff-notification-pill v-if="notifications > 0" :count="notifications" />
    </li>
</template>

<script>
export default {
    name: 'NavItem',
    props: {
        icon: {
            type: Function
        },
        avatar: {
            type: String
        },
        label: {
            type: String
        },
        notifications: {
            type: Number
        }
    }
}
</script>
