<template>
    <slot name="header" />
    <main class="px-7 py-7">
        <slot name="default" />
    </main>
</template>

<script>
export default {
    name: 'PageLayout'
}
</script>
