<template>
    <div class="segment-wrapper" :class="{open: visibleChildren}" data-el="segment-wrapper" :data-value="segment">
        <div class="segment flex" @click="toggleChildren">
            <div class="diagram">
                <span v-if="!isRoot" class="connector-elbow" />
                <span v-if="shouldShowTrunk" class="connector-trunk" />
            </div>
            <div class="content flex gap-1.5 items-center font-bold" :class="{'cursor-pointer': hasChildren, 'cursor-default': !hasChildren, 'pl-10': !isRoot}">
                <ChevronRightIcon v-if="hasChildren" class="chevron ff-icon-sm" />
                <p class="flex gap-2.5 items-end" :class="{'ml-2': !hasChildren}">
                    <span class="title">{{ segmentText }}</span>
                    <span v-if="hasChildren" class="font-normal opacity-50 text-xs">{{ topicsCounterLabel }}</span>
                </p>
            </div>
        </div>
        <div v-if="hasChildren && visibleChildren" class="children" data-el="segment-children" :class="{ 'pl-10': isRoot}">
            <topic-segment
                v-for="(child, key) in Object.keys(children)"
                :key="child"
                :segment="child"
                :children="children[child]"
                :has-siblings="Object.keys(children).length > 1"
                :is-last-sibling="key === Object.keys(children).length-1"
                :class="{'pl-10': !isRoot}"
            />
        </div>
    </div>
</template>

<script>
import { ChevronRightIcon } from '@heroicons/vue/solid'
export default {
    name: 'TopicSegment',
    components: { ChevronRightIcon },
    props: {
        segment: {
            required: true,
            type: String
        },
        children: {
            required: true,
            type: Object
        },
        isRoot: {
            required: false,
            type: Boolean,
            default: false
        },
        hasSiblings: {
            required: true,
            type: Boolean
        },
        isLastSibling: {
            required: true,
            type: Boolean
        }
    },
    data () {
        return {
            visibleChildren: false
        }
    },
    computed: {
        childrenCount () {
            return Object.keys(this.children).length
        },
        hasChildren () {
            return this.childrenCount > 0
        },
        topicsCounterLabel () {
            const label = 'topic' + (this.childrenCount <= 1 ? '' : 's')
            return `(${this.childrenCount} ${label})`
        },
        segmentText () {
            return this.hasChildren ? `${this.segment}/` : this.segment
        },
        shouldShowTrunk () {
            return !this.isRoot && this.hasSiblings && this.isLastSibling
        }
    },
    methods: {
        toggleChildren () {
            if (this.hasChildren) {
                this.visibleChildren = !this.visibleChildren
            }
        }
    }
}
</script>

<style scoped lang="scss">
.segment-wrapper {
    .segment {
        position: relative;
        margin: 5px 0 0;
        transition: ease .3s;

        .diagram {
            .connector-elbow {
                border-left: 2px solid  $ff-indigo-300;
                border-bottom: 2px solid  $ff-indigo-300;
                border-bottom-left-radius: 7px;
                display: inline-block;
                position: absolute;
                height: 50px;
                width: 25px;
                left: -23px;
                top: -35px;
            }
            .connector-trunk {
                width: 1px;
                border-left: 2px solid $ff-indigo-300;
                display: inline-block;
                position: absolute;
                height: 5000px;
                left: -23px;
                top: -5000px;
            }
        }

        .content {
            padding: 5px;

            .chevron {
                transition: ease .3s;
            }
        }
    }

    .children {
        overflow: hidden;
    }

    &.open > {
        .segment {
            background: $ff-indigo-50;

            .content {
                .title {
                    color: $ff-indigo-700;
                }

                .chevron {
                    transform: rotate(90deg)
                }
            }
        }
    }
}
</style>
