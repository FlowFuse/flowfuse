<template>
    <div class="ff-side-navigation ff-side-navigation--primary">
        <ul class="ff-side-navigation--options">
            <div class="ff-side-navigation--options-back">
                <slot name="back" />
            </div>
            <slot name="options" />
        </ul>
    </div>
</template>

<script>

export default {
    name: 'FFSideNavigation',
    props: ['mobileMenuOpen'],
    emits: ['option-selected']
}
</script>
