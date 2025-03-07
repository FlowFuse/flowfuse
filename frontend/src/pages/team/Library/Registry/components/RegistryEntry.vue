<template>
    <li class="ff-registry-entry">
        <div class="space-y-1">
            <label class="font-medium text-lg">{{ name }}<span class="text-gray-400 ml-4 text-base font-normal">{{ pkg.name }}</span></label>
            <p class="text-gray-500">{{ description }}</p>
        </div>
        <div class="font-mono flex flex-col items-end">
            v{{ version }}
            <span class="text-xs text-gray-400">{{ lastUpdated }} ago</span>
        </div>
    </li>
</template>

<script>
import elapsedTime from '../../../../../utils/elapsedTime.js'
export default {
    name: 'RegistryEntry',
    props: {
        pkg: {
            type: Object,
            required: true
        }
    },
    computed: {
        name () {
            // strip the @flowfuse and team ID from the name
            const name = this.pkg.name.split('/').pop()
            return name
        },
        description () {
            return this.pkg.description
        },
        version () {
            return this.pkg['dist-tags'].latest
        },
        lastUpdated () {
            return elapsedTime(this.pkg.time.modified, new Date())
        }
    }
}
</script>

<style scoped lang="scss">
.ff-registry-entry {
    background-color: $ff-white;
    padding: 12px;
    border: 1px solid $ff-grey-200;
    display: flex;
    justify-content: space-between;
    align-items: center;
}
</style>
