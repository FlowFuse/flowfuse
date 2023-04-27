<template>
    <div class="ff-chart space-y-2">
        <div class="flex items-center justify-between">
            <h3>Last Seen</h3>
            <button class="ff-btn ff-btn--tertiary" @click="toggle()">
                <EyeIcon v-if="visible" class="ff-icon" />
                <EyeOffIcon v-else class="ff-icon" />
            </button>
        </div>
        <div v-if="visible" class="ff-chart-device-status">
            <div
                v-for="(bucket, b) in buckets" :key="b"
                :class="'ff-chart-bar ff-chart-bar--' + b + ' ' + ((activeFilter.bucket && activeFilter.bucket !== b) ? 'ghost' : '')"
                :style="{width: 100 * (bucket.devices.length/devices.length) + '%'}"
                @click="selected(b, bucket.devices)"
            >
                <div>{{ bucket.devices.length }}</div>
                <label>{{ bucket.label }}</label>
            </div>
        </div>
    </div>
</template>

<script>
import { EyeIcon, EyeOffIcon } from '@heroicons/vue/outline'

import DeviceStatus from '../../services/device-status.js'

export default {
    name: 'DeviceStatusBar',
    components: {
        EyeIcon,
        EyeOffIcon
    },
    props: {
        devices: {
            required: true,
            type: Array
        },
        property: {
            required: true,
            type: String
        }
    },
    emits: ['filter-selected'],
    data () {
        return {
            visible: true,
            activeFilter: {
                bucket: null
            }
        }
    },
    computed: {
        buckets () {
            const devices = this.devices.map((d) => {
                return {
                    id: d.id,
                    status: DeviceStatus.lastSeenStatus(d.lastSeenAt, d.lastSeenMs)
                }
            })
            const buckets = {}
            devices.forEach((d) => {
                if (!buckets[d.status.class]) {
                    buckets[d.status.class] = {
                        label: d.status.label,
                        devices: []
                    }
                }
                buckets[d.status.class].devices.push(d.id)
            })
            return buckets
        }
    },
    methods: {
        selected (bucket, devices) {
            if (this.activeFilter.bucket === bucket) {
                this.activeFilter.bucket = null
                this.$emit('filter-selected', null)
            } else {
                this.activeFilter.bucket = bucket
                this.$emit('filter-selected', {
                    bucket, devices
                })
            }
        },
        toggle () {
            this.visible = !this.visible
        }
    }
}
</script>
