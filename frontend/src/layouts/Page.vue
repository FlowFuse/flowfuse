<template>
    <slot name="header" />
    <main class="px-7 py-7 flex-1 overflow-auto h-full w-full flex flex-col">
        <slot name="default" />
    </main>
</template>

<script>
export default {
    name: 'PageLayout'
}
</script>
