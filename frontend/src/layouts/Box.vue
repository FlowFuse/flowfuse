<template>
    <div class="ff-layout--box">
        <div class="ff-layout--box--wrapper">
            <div class="ff-layout--box--content">
                <div class="ff-logo">
                    <img src="@/images/ff-logo--wordmark-caps--dark.png" />
                </div>
                <slot></slot>
            </div>
        </div>
    </div>
</template>

<script>
export default {
    name: 'ff-layout-box'
}
</script>

<style lang="scss" scoped>

</style>
