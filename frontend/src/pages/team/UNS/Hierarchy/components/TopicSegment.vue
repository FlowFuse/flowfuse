<template>
    <div class="segment-wrapper" :class="{open: isSegmentOpen, empty: isEmpty}" data-el="segment-wrapper" :data-value="segment.name">
        <div class="segment flex" @click="toggleChildren">
            <div class="diagram">
                <span v-if="!isRoot" class="connector-elbow" />
                <span v-if="shouldShowTrunk" class="connector-trunk" />
            </div>
            <div class="content flex gap-1.5 items-center font-bold" :class="{'cursor-pointer': hasChildren, 'cursor-default': !hasChildren, 'pl-10': !isRoot}">
                <ChevronRightIcon v-if="hasChildren" class="chevron ff-icon-sm" />
                <p class="flex gap-2.5 items-end" :class="{'ml-2': !hasChildren}">
                    <span class="title">
                        {{ segmentText }}
                        <span
                            v-if="segment.isEndOfTopic && segment.childrenCount"
                            class="separator cursor-help"
                            title="This topic is also able to receive events"
                        >
                            <ArchiveIcon class="ff-icon-sm" />
                        </span>
                    </span>
                    <span v-if="hasChildren" class="font-normal opacity-50 text-xs">{{ topicsCounterLabel }}</span>
                    <text-copier :text="segment.path" :show-text="false" class="ff-text-copier" />
                </p>
            </div>
        </div>
        <div v-if="hasChildren && isSegmentOpen" class="children" data-el="segment-children" :class="{ 'pl-10': isRoot}">
            <topic-segment
                v-for="(child, key) in childrenSegments"
                :key="'-'+child.path"
                :segment="children[child]"
                :children="children[child].children"
                :has-siblings="Object.keys(children).length > 1"
                :is-last-sibling="key === Object.keys(children).length - 1"
                :class="{'pl-10': !isRoot}"
                @segment-state-changed="$emit('segment-state-changed', $event)"
            />
        </div>
    </div>
</template>

<script>
import { ArchiveIcon } from '@heroicons/vue/outline'
import { ChevronRightIcon } from '@heroicons/vue/solid'

import TextCopier from '../../../../../components/TextCopier.vue'
export default {
    name: 'TopicSegment',
    components: { TextCopier, ChevronRightIcon, ArchiveIcon },
    props: {
        segment: {
            required: true,
            type: Object
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
    emits: ['segment-state-changed'],
    data () {
        return {
            isSegmentOpen: false
        }
    },
    computed: {
        childrenCount () {
            return Object.keys(this.children).length
        },
        hasChildren () {
            return this.childrenCount > 0
        },
        childrenSegments () {
            return Object.keys(this.children).sort()
        },
        topicsCounterLabel () {
            const label = 'topic' + (this.segment.childrenCount <= 1 ? '' : 's')
            return `(${this.segment.childrenCount} ${label})`
        },
        isEmpty () {
            return this.segment.name.length === 0
        },
        segmentText () {
            if (this.segment.hasEmptyRoot) {
                return `/${this.segment.name}`
            }

            return !this.isEmpty ? this.segment.name : '(empty)'
        },
        shouldShowTrunk () {
            return !this.isRoot && this.hasSiblings && this.isLastSibling
        }
    },
    watch: {
        isSegmentOpen: {
            handler () {
                this.$emit('segment-state-changed', {
                    state: this.isSegmentOpen,
                    path: this.segment.path
                })
            },
            immediate: false
        }
    },
    mounted () {
        this.isSegmentOpen = this.segment.open
    },
    methods: {
        toggleChildren () {
            if (this.hasChildren) {
                this.isSegmentOpen = !this.isSegmentOpen
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
            position: relative;

            .chevron {
                transition: ease .3s;
            }

            .title {
                align-items: center;
                display: flex;
                gap: 3px;
            }

            .ff-text-copier {
                display: none;
                height: 17px;
            }

            &:hover {
                .ff-text-copier {
                    display: inline-block;
                    color: $ff-grey-400;
                }
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

    &.empty > {
        .segment {
            .content {
                .title {
                    color: $ff-grey-600;
                    font-size: 90%;
                    font-weight: 300;

                    .separator {
                        color: $ff-black;
                        font-weight: bold;
                    }
                }
            }
        }
    }
}
</style>
