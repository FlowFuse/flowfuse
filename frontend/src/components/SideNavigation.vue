<template>
    <ul class="ff-side-navigation--options">
        <div class="ff-side-navigation--options-back">
            <slot name="back"></slot>
        </div>
        <slot name="options"></slot>
    </ul>
</template>

<script>

export default {
    name: 'FFSideNavigation',
    props: ['mobile-menu-open'],
    emits: ['option-selected']
}
</script>
