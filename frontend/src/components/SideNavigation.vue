<template>
    <ul class="ff-side-navigation--options">
        <slot name="options"></slot>
        <div class="ff-side-navigation--options-bottom">
            <slot name="bottom"></slot>
        </div>
    </ul>
</template>

<script>

export default {
    name: 'FFSideNavigation',
    props: ['mobile-menu-open'],
    emits: ['option-selected']
}
</script>
