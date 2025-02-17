<template>
    <div class="ff-layout--docs">
        <div class="ff-layout--docs-contents">
            <div id="platform-banner" />
            <slot />
        </div>
    </div>
</template>

<script>
export default {
    name: 'ff-layout-docs',
    data () {
        return { }
    }
}
</script>

<style lang="scss">
.ff-layout--docs {
    background-color: white;
    &-contents {
        max-width: 1012px;
        margin: auto;
        padding: 16px;
    }
    h1 {
        margin: 16px 0;
    }
}
</style>
