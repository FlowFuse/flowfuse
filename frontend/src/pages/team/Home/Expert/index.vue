<template>
    <ff-page>
        <template #header>
            <ff-page-header>
                <template #breadcrumbs>
                    <ff-nav-breadcrumb>Home</ff-nav-breadcrumb>
                </template>
            </ff-page-header>
        </template>

        <div class="ff-expert-home" data-el="expert-home" />
    </ff-page>
</template>

<script setup>
defineOptions({ name: 'TeamHomeExpert' })
</script>

<style scoped lang="scss">
.ff-expert-home {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
}
</style>
