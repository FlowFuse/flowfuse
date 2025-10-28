<template>
    <div class="notice flex gap-4 items-center">
        <div>
            <ExclamationIcon class="ff-icon ff-icon-lg text-yellow-500" />
        </div>
        <p>
            {{ text }}
        </p>
    </div>
</template>

<script>
import { ExclamationIcon } from '@heroicons/vue/outline'

export default {
    name: 'NoticeBanner',
    components: { ExclamationIcon },
    props: {
        text: {
            type: String,
            required: true
        }
    }
}
</script>

<style scoped lang="scss">

</style>
