<template>
    <li class="ff-nav-item">
        <component v-if="icon" :is="icon" />
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
        label: {
            type: String
        }
    }
}
</script>
