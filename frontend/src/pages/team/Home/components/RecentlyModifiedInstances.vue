<template>
    <div class="recently-modified">
        <p class="text-gray-400 text-sm">Recently Modified</p>
        <ul v-if="instances.length" class="flex flex-1 flex-col gap-1">
            <li v-for="instance in instances" :key="instance.id" class="instance-wrapper flex flex-1">
                <InstanceTile :instance="instance" :minimal-view="true" />
            </li>
            <li v-if="hasMore" class="instance-wrapper flex flex-1">
                <team-link :to="{name: 'Instances'}" class="instance-tile has-more">
                    <span>{{ instancesLeft }} More</span>
                    <span>
                        <ChevronRightIcon class="ff-icon ff-icon-sm" />
                    </span>
                </team-link>
            </li>
        </ul>
        <div v-else class="no-instances flex flex-col flex-1 justify-center text-gray-500 italic">
            <p class="text-center self-center">
                This section’s a ghost town.
                <team-link :to="{name: 'CreateInstance'}" class="text-indigo-500">Create a Hosted Instance</team-link>
                and break the silence.
            </p>
        </div>
    </div>
</template>

<script>
import { ChevronRightIcon } from '@heroicons/vue/outline'
import { mapGetters } from 'vuex'

import teamAPI from '../../../../api/team.js'
import TeamLink from '../../../../components/router-links/TeamLink.vue'
import InstanceTile from '../../Applications/components/compact/InstanceTile.vue'

export default {
    name: 'RecentlyModifiedInstances',
    components: { TeamLink, InstanceTile, ChevronRightIcon },
    data () {
        return {
            hasMore: false,
            instances: [],
            totalInstances: 0
        }
    },
    computed: {
        ...mapGetters('account', ['team']),
        instancesLeft () {
            return this.totalInstances - this.instances.length
        }
    },
    mounted () {
        this.getInstanceCount()
            .then(() => this.getInstances())
            .catch(e => e)
    },
    methods: {
        getInstances () {
            let limit

            if (this.totalInstances <= 4) {
                limit = 3
                this.hasMore = this.totalInstances === 4
            } else {
                limit = 3
                this.hasMore = true
            }
            return teamAPI.getInstances(this.team.id, {
                limit,
                includeMeta: true,
                orderByMostRecentFlows: true
            })
                .then(res => {
                    this.instances = res.projects
                })
        },
        getInstanceCount () {
            return teamAPI.getTeamInstanceCounts(this.team.id, [], 'hosted')
                .then(res => {
                    this.totalInstances = res.counter
                })
                .catch(e => e)
        }
    }
}
</script>

<style lang="scss">
.recently-modified {
    display: flex;
    flex: 1;
    flex-direction: column;

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

        &.has-more {
            padding: 10px;
        }

        .details {
            flex: 1;

            .detail-wrapper {
                &.detail {
                    font-size: $ff-funit-sm;
                    color: $ff-grey-400;
                }
                .name, .editor-link:not(.inactive) {
                    &:hover {
                        color: $ff-indigo-700;
                    }
                }
            }
        }

        .actions {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
    }

    .no-instances {
        min-height: 130px;
    }
}
</style>
