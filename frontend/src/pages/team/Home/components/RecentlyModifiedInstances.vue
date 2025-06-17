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
import { mapGetters } from 'vuex'

import teamAPI from '../../../../api/team.js'
import InstanceTile from '../../Applications/components/compact/InstanceTile.vue'

export default {
    name: 'RecentlyModifiedInstances',
    components: { InstanceTile },
    data () {
        return {
            instances: []
        }
    },
    computed: {
        ...mapGetters('account', ['team'])
    },
    mounted () {
        this.getInstances()
    },
    methods: {
        getInstances () {
            return teamAPI.getInstances(this.team.id, {
                limit: 4,
                includeMeta: true,
                orderByMostRecentFlows: true
            })
                .then(res => {
                    this.instances = res.projects
                })
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
