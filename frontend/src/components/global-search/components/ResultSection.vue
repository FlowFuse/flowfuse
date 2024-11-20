<template>
    <section class="section">
        <p class="title">
            <component :is="icon" v-if="icon" class="icon ff-icon-sm" />

            <router-link class="text" :to="sectionRoute" @click="onResultClick">
                {{ title }}
            </router-link>

            <span class="counter">({{ resultCount }})</span>
        </p>

        <ul class="results">
            <li v-for="(result, index) in truncatedResults" :key="result.id" class="result-wrapper">
                <router-link :to="result.route" class="result" @click="onResultClick">
                    <div class="icon">
                        <slot name="result-icon" :item="result" :index="index" />
                    </div>

                    <div class="title">
                        <slot name="result-title" :item="result" :index="index">
                            {{ result.name }}
                        </slot>
                    </div>

                    <div class="details">
                        <slot name="result-details" :item="result" :index="index" />
                    </div>

                    <div class="actions">
                        <slot name="result-actions" :item="result" :index="index" />
                    </div>
                </router-link>
            </li>
            <li v-if="hasMoreResults" class="result-wrapper show-more">
                <a href="#" @click="showMore">Show more...</a>
            </li>
        </ul>
    </section>
</template>

<script>

export default {
    name: 'ResultSection',
    props: {
        title: {
            required: true,
            type: String
        },
        results: {
            required: true,
            type: Array
        },
        icon: {
            required: true,
            type: Object
        },
        resultType: {
            required: true,
            type: String
        },
        query: {
            required: true,
            type: String
        }
    },
    emits: ['result-selected'],
    data () {
        return {
            visibleResults: 10
        }
    },
    computed: {
        resultCount () {
            return this.results.length
        },
        hasMoreResults () {
            return this.resultCount > this.truncatedResults.length
        },
        decoratedResults () {
            return this.results.map(res => {
                // append route
                let routeName

                switch (this.resultType) {
                case 'application':
                    routeName = 'Application'
                    break
                case 'instance':
                    routeName = 'instance-overview'
                    break
                case 'device':
                    routeName = 'DeviceOverview'
                    break
                default:
                    routeName = ''
                }
                res.route = { name: routeName, params: { id: res.id } }

                return res
            })
        },
        truncatedResults () {
            return this.decoratedResults.slice(0, this.visibleResults)
        },
        sectionRoute () {
            switch (this.resultType) {
            case 'application':
                return { name: 'Applications', query: { search: this.query } }
            case 'instance':
                return { name: 'Instances', query: { search: this.query } }
            case 'device':
                return { name: 'TeamDevices', query: { search: this.query } }
            default:
                return ''
            }
        }
    },
    watch: {
        results () {
            this.visibleResults = 10
        }
    },
    methods: {
        onResultClick () {
            this.$emit('result-selected')
        },
        showMore () {
            this.visibleResults += 5
        }
    }
}
</script>

<style lang="scss">
.section {
    margin-bottom: 15px;

    & > .title {
        position: relative;
        margin-bottom: 5px;
        display: flex;
        align-items: self-end;
        gap: 5px;

        .icon {
            color: $ff-indigo-700;
        }

        .counter {
            opacity: .6;
            font-size: 90%;
        }

        &:after {
            height: 2px;
            background: $ff-grey-200;
            content: '';
            flex: 1;
            align-self: center;
        }
    }

    .results {
        .result-wrapper {
            transition: ease-in-out .3s;
            padding: 2px 10px;
            border-radius: 5px;
            max-height: 90vh;
            overflow: auto;

            .result {
                display: flex;
                gap: 10px;
                align-items: center;
                line-height: 25px;

                .icon {}
                .title {}
                .details {
                    flex: 1;
                    opacity: .4;
                    font-size: 90%;
                }
                .actions {
                    display: flex;
                    gap: 5px;
                }
            }

            &:hover {
                background: $ff-indigo-50;
            }

            &.show-more {
                text-align: center;
                margin: 3px 0;
                padding: 2px 0;

                a {
                    width: 100%;
                    display: block;
                    opacity: .6;
                }
            }
        }
    }

    &:last-of-type {
        margin-bottom: 0;
    }
}
</style>
