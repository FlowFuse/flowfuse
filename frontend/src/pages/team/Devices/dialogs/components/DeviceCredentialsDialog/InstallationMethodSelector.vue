<template>
    <ul class="installation-method-selector">
        <li
            v-for="method in installationMethods"
            :key="method.slug"
            :class="{active: selectedMethod === method.slug}"
            class="ff-method-option"
            @click="$emit('select-method', method.slug)"
        >
            {{ method.label }}
        </li>
    </ul>
</template>

<script>
export default {
    name: 'InstallationMethodSelector',
    props: {
        installationMethods: {
            required: true,
            type: Array
        },
        selectedMethod: {
            required: true,
            type: String
        }
    },
    emits: ['select-method']
}
</script>

<style scoped lang="scss">
.installation-method-selector {
    display: flex;
    gap: 50px;
    margin-bottom: 15px;
    position: relative;

    .ff-method-option {
        flex: 1;
        text-align: center;
        border-bottom: 2px solid $ff-color--border;
        padding-bottom: 5px;
        cursor: pointer;
        transition: ease-in-out .3s;

        &.active {
            border-color: $ff-indigo-500;
        }

        &:first-of-type:after {
            content: 'or';
            position: absolute;
            top: 5%;
            left: 49%;
            font-style: italic;
            font-size: $ff-funit-sm;
            color: $ff-grey-500;
        }
    }
}
</style>
