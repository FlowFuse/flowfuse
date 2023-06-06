<template>
    <li class="ff-nav-item">
        <div class="flex items-center">
            <component v-if="icon" :is="icon" class="transition-fade--color"/>
            <img v-if="avatar" :src="avatar" class="ff-avatar"/>
            <label class="transition-fade--color">{{ label }}</label>
        </div>
        <ff-notification-pill v-if="notifications > 0" :count="notifications" />
    </li>
</template>

<script>
export default {
    name: 'NavItem',
    props: {
        icon: {
            type: Function,
            default: () => null
        },
        avatar: {
            type: String,
            default: () => null
        },
        label: {
            type: String,
            required: true
        },
        notifications: {
            type: Number,
            required: true
        }
    }
}
</script>
