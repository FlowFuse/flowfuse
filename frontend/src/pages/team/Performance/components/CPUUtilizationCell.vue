<template>
    <div v-if="error">
        <div class="text-sm text-red-500">
            {{ error }}
        </div>
    </div>
    <div v-else-if="featureSupported" class="w-full h-full">
        <div v-if="connected && !cpuUtilization">
            <div class="text-sm text-gray-500">
                Connecting...
            </div>
        </div>
        <div v-else class="w-full h-full flex gap-2 items-center">
            <div class="ff-cpu-bar">
                <div class="ff-cpu-bar--fill" :style="{ width: cpuUtilization + '%' }" :class="fillClass" />
            </div>
            <label class="ff-cpu-bar--label">{{ formattedCPUUtilization }}%</label>
        </div>
    </div>
    <div v-else class="text-sm text-gray-500">
        Live data view not supported for this instance. Please upgrade the Instance's Node-RED version.
    </div>
</template>

<script>

export default {
    name: 'CPUUtilizationCell',
    props: {
        instanceId: {
            type: String,
            required: true
        },
        connected: {
            type: Boolean,
            required: true
        },
        error: {
            type: String,
            default: null
        },
        cpuUtilization: {
            type: Number,
            default: null
        },
        featureSupported: {
            type: Boolean,
            required: true
        }
    },
    computed: {
        fillClass () {
            if (this.cpuUtilization > 75) {
                return 'high'
            }
            if (this.cpuUtilization > 50) {
                return 'medium'
            }
            return 'low'
        },
        formattedCPUUtilization () {
            // 2 dp
            return this.cpuUtilization.toFixed(2)
        }

    }
}
</script>

<style scoped lang="scss">
.ff-cpu-bar {
    width: 100%;
    height: 100%;
    border-radius: 3px;
    padding: 3px;
    border: 1px solid;
    border-color: $ff-grey-300;
}

.ff-cpu-bar--fill {
    border-radius: 3px;
    height: 12px;
}

.ff-cpu-bar--fill.high {
    background-color: $ff-red-200;
}

.ff-cpu-bar--fill.medium {
    background-color: $ff-yellow-200;
}

.ff-cpu-bar--fill.low {
    background-color: $ff-green-200;
}

.ff-cpu-bar--label {
    width: 48px;
    text-align: right;
}
</style>
