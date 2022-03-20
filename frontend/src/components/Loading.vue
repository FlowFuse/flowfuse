<template>
    <div class="flex-grow flex flex-col items-center justify-center mx-auto text-gray-600 opacity-50 " :class="{'h-92 text-9xl': size === 'normal', 'h-32 text-3xl': size === 'small'}">
        <div class="text-center">
            <div>Loading</div>
        </div>
    </div>
</template>
<script>
export default {
    name: 'LoadingMessage',
    props: {
        size: {
            default: 'normal',
            type: String
        }
    }
}
</script>
