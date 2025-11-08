<template>
    <slot name="header" />
    <main :class="mainClasses">
        <slot name="default" />
    </main>
</template>

<script>
export default {
    name: 'PageLayout',
    props: {
        noPadding: {
            type: Boolean,
            default: false
        }
    },
    computed: {
        mainClasses () {
            const classes = ['flex-1', 'overflow-auto', 'h-full', 'w-full', 'flex', 'flex-col']
            if (!this.noPadding) {
                classes.push('px-7', 'py-7')
            }
            return classes
        }
    }
}
</script>
