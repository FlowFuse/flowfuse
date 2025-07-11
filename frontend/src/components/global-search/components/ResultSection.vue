<template>
    <section class="section">
        <p class="title">
            <component :is="icon" v-if="icon" class="icon ff-icon-sm" />

            <router-link class="text iterable" :to="sectionRoute" @click="onResultClick">
                {{ title }}
            </router-link>

            <span class="counter">({{ resultCount }})</span>
        </p>

        <ul class="results">
            <li v-for="(result, index) in truncatedResults" :key="result.id" class="result-wrapper" data-el="result">
                <router-link :to="result.route" class="result iterable" tabindex="0" @click="onResultClick">
                    <div class="icon">
                        <slot name="result-icon" :item="result" :index="index" />
                    </div>

                    <div class="title truncate" :data-title="result.name">
                        <slot name="result-title" :item="result" :index="index">
                            {{ result.name }}
                        </slot>
                    </div>

                    <div class="details truncate">
                        <slot name="result-details" :item="result" :index="index" />
                    </div>

                    <div class="actions">
                        <slot name="result-actions" :item="result" :index="index" />
                    </div>
                </router-link>
            </li>
            <li v-if="hasMoreResults" class="result-wrapper show-more">
                <a href="#" class="iterable" @click="showMore">Show more...</a>
            </li>
        </ul>
    </section>
</template>

<script>

import { mapState } from 'vuex'

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
        ...mapState('account', ['team']),
        resultCount () {
            return this.results.length
        },
        hasMoreResults () {
            return this.resultCount > this.truncatedResults.length
        },
        decoratedResults () {
            return this.results.map(res => {
                let routeName
                const params = { id: res.id }

                switch (this.resultType) {
                case 'application':
                    params.team_slug = this.team.slug
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
                res.route = { name: routeName, params }

                return res
            })
        },
        truncatedResults () {
            return this.decoratedResults.slice(0, this.visibleResults)
        },
        sectionRoute () {
            switch (this.resultType) {
            case 'application':
                return { name: 'Applications', query: { searchQuery: this.query }, params: { team_slug: this.team.slug } }
            case 'instance':
                return { name: 'Instances', query: { searchQuery: this.query }, params: { team_slug: this.team.slug } }
            case 'device':
                return { name: 'TeamDevices', query: { searchQuery: this.query }, params: { team_slug: this.team.slug } }
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

        .text {
            &:focus {
                outline: 2px solid $ff-indigo-700;
                outline-offset: 2px;
            }
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

                &:focus {
                    background: $ff-indigo-50;
                    border: none;
                    outline: none;
                }
            }

            &:hover {
                background: $ff-indigo-50;
            }

            &.show-more {
                text-align: center;
                margin: 3px 0;

                a {
                    padding: 5px 0;
                    width: 100%;
                    display: block;
                    opacity: .6;

                    &:focus {
                        background: $ff-indigo-50;
                        border: none;
                        outline: none;
                    }
                }
            }
        }
    }

    &:last-of-type {
        margin-bottom: 0;
    }
}

@media screen and (max-width: 480px) {
    .section {
        .results {
            .result-wrapper {
                .result {
                    .actions {
                        display: none;
                        background: red;
                    }
                }
            }
        }
    }
}
</style>
