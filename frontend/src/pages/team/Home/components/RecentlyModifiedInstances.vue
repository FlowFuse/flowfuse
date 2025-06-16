<template>
    <div class="recently-modified">
        <p class="text-gray-400 text-sm">Recently Modified</p>
        <ul class="flex flex-col gap-1">
            <li v-for="instance in instances" :key="instance.id" class="instance-wrapper flex flex-1">
                <InstanceTile :instance="instance" :minimal-view="true" />
            </li>
        </ul>
    </div>
</template>

<script>
import InstanceTile from '../../Applications/components/compact/InstanceTile.vue'

export default {
    name: 'RecentlyModified',
    components: { InstanceTile },
    props: {
        instances: {
            required: true,
            type: Array
        }
    }
}
</script>

<style lang="scss">
.recently-modified {
    & > p {
        border-bottom: 1px solid $ff-grey-100;
        margin-bottom: 10px;
        line-height: 2rem;
    }
    .instance-tile {
        border: 1px solid $ff-grey-100;
        padding: 2px 10px;
        border-radius: 5px;
        flex: 1;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 10px;

        .details {
            flex: 1;

            .detail-wrapper {
                &.detail {
                    font-size: $ff-funit-sm;
                    color: $ff-grey-400;
                }
            }
        }

        .actions {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
    }
}
</style>
