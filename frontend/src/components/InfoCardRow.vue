<template>
    <div class="ff-info-card-row flex items-center">
        <div class="ff-info-card-row-property w-48 font-medium">
            <slot name="property">{{ property }}</slot>
        </div>
        <div class="ff-info-card-row-value">
            <slot name="value">{{ value }}</slot>
        </div>
    </div>
</template>
<script>
export default {
    name: 'InfoCardRow',
    props: {
        property: {
            type: String,
            default: ''
        },
        value: {
            type: String,
            default: ''
        }
    }
}
</script>
