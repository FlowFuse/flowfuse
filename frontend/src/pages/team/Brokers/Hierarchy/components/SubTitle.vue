<template>
    <div class="flex gap-2 items-center justify-between mb-2">
        <div class="flex gap-2 items-center ">
            <component :is="icon" v-if="icon" class="ff-icon-sm" />
            <span class="text-gray-800 block text-sm font-medium">{{ title }}</span>
        </div>
        <div class="actions leading-none">
            <slot name="actions" />
        </div>
    </div>
</template>

<script>
import CodeBracketSquareIcon from '../../../../../components/icons/CodeBracketSquare.js'

export default {
    name: 'SubTitle',
    components: { CodeBracketSquareIcon },
    props: {
        title: {
            type: String,
            required: true
        },
        icon: {
            type: Function,
            default: null,
            required: false
        }
    }
}
</script>

<style scoped lang="scss">

</style>
