<template>
    <h1 class="text-lg font-medium mb-2 border-b border-gray-200 flex">
        <div class="flex-grow"><slot /></div>
        <div><slot name="tools" /></div>
    </h1>
</template>
<script>
export default {
    name: 'FormHeading'
}
</script>
