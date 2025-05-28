<template>
    <div class="w-full h-full flex gap-2 items-center">
        <div class="ff-cpu-bar">
            <div class="ff-cpu-bar--fill" :style="{ width: cpuUtilization + '%' }" :class="fillClass" />
        </div>
        <label class="ff-cpu-bar--label">{{ formattedCPUUtilization }}%</label>
    </div>
</template>

<script>
export default {
    name: 'CPUUtilizationCell',
    props: {
        cpuUtilization: {
            type: Number,
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
