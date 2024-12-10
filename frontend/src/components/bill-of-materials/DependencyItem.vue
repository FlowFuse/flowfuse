<template>
    <section class="dependency-item" data-el="dependency-item" :data-item="title">
        <div class="dependency-header" :class="{open: isOpen}" @click="toggleOpenState">
            <ChevronRightIcon class="ff-icon-sm ff-toggle" />
            <div class="title truncate">
                <h3 class="truncate">{{ title }}</h3>
                <p class="truncate">({{ versionsCount }} {{ pluralize('Version', versionsCount) }})</p>
            </div>
            <div class="details truncate">
                <span class="truncate">Latest: {{ externalLatest }}</span>
                <span class="truncate">Released: {{ externalLastModified }}</span>
            </div>
        </div>
        <template v-if="isOpen">
            <versions-list
                v-for="(entry, key) in Object.entries(versions)" :key="key"
                :instances="entry[1]"
                :version="entry[0]"
            />
        </template>
    </section>
</template>

<script>
import { ChevronRightIcon } from '@heroicons/vue/outline'

import ExternalClient from '../../api/external.js'
import { pluralize } from '../../composables/String.js'
import daysSince from '../../utils/daysSince.js'

import VersionsList from './VersionsList.vue'

export default {
    name: 'DependencyItem',
    components: {
        VersionsList,
        ChevronRightIcon
    },
    props: {
        title: {
            required: true,
            type: String
        },
        versions: {
            required: true,
            type: Object
        },
        startClosed: {
            required: false,
            type: Boolean,
            default: false
        }
    },
    data () {
        return {
            externalDependency: null,
            isOpen: true
        }
    },
    computed: {
        externalLatest () {
            if (
                !this.externalDependency ||
                (
                    !Object.prototype.hasOwnProperty.call(this.externalDependency, 'dist-tags') &&
                    !Object.prototype.hasOwnProperty.call(this.externalDependency['dist-tags'], 'latest') &&
                    !Object.prototype.hasOwnProperty.call(this.externalDependency, 'versions') &&
                    !Object.prototype.hasOwnProperty.call(
                        this.externalDependency.versions,
                        this.externalDependency['dist-tags'].latest
                    )
                )
            ) {
                return 'N/A'
            }

            return this.externalDependency.versions[this.externalDependency['dist-tags'].latest].version
        },
        externalLastModified () {
            if (
                !this.externalDependency ||
                (
                    !Object.prototype.hasOwnProperty.call(this.externalDependency, 'time') &&
                    !Object.prototype.hasOwnProperty.call(this.externalDependency.time, 'modified')
                )
            ) {
                return 'N/A'
            }

            return daysSince(this.externalDependency.time.modified, true)
        },
        versionsCount () {
            return Object.keys(this.versions).length
        }
    },
    created () {
        this.isOpen = !this.startClosed
    },
    mounted () {
        this.getExternalDependency()
    },
    methods: {
        pluralize,
        async getExternalDependency () {
            this.externalDependency = await ExternalClient.getNpmDependency(this.title)
        },
        toggleOpenState () {
            this.isOpen = !this.isOpen
        }
    }
}
</script>

<style lang="scss">
.dependency-item {
    border: 1px solid $ff-grey-300;
    margin-bottom: 12px;

    .dependency-header {
        cursor: pointer;
        background: $ff-grey-100;
        display: flex;
        padding: 6px 9px;
        align-items: center;
        gap: 15px;

        .title {
            flex: 1;
            display: flex;
            align-items: center;
            gap: 15px;

            h3, p {
                margin: 0;
                line-height: 1;
            }

            p {
                color: $ff-grey-500;
                font-weight: 400;
                font-size: 80%;
            }
        }

        .details {
            display: flex;
            flex-direction: column;
            text-align: right;
            font-size: 0.875rem;
            font-weight: 500;
        }

        .ff-toggle {
            transition: ease-in-out .3s;
        }

        &.open {
            border-bottom: 1px solid $ff-grey-300;

            .ff-toggle {
                transform: rotate(90deg);
            }
        }
    }

    &:last-of-type {
        .ff-accordion {
            button {
                border-bottom: none;
            }
        }
    }
}
</style>
