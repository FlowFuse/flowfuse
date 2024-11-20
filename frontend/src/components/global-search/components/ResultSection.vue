<template>
    <section class="section-wrapper">
        <div v-if="hasResults" class="section">
            <p class="title">
                <component :is="icon" v-if="icon" class="icon ff-icon-sm" />

                <span class="text">{{ title }}</span>

                <span class="counter">({{ resultCount }})</span>
            </p>

            <ul class="results">
                <li v-for="(result, index) in decoratedResults" :key="result.id" class="result-wrapper">
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
            </ul>
        </div>
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
        }
    },
    emits: ['result-selected'],
    computed: {
        resultCount () {
            return this.results.length
        },
        hasResults () {
            return this.resultCount > 0
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
        }
    },
    methods: {
        onResultClick () {
            this.$emit('result-selected')
        }
    }
}
</script>

<style lang="scss">
.section-wrapper {
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
                padding: 5px 10px;
                border-radius: 5px;

                .result {
                    display: flex;
                    gap: 10px;
                    align-items: center;
                    vertical-align: center;

                    .icon {}
                    .title {}
                    .details {
                        flex: 1;
                        opacity: .4;
                        font-size: 90%;
                    }
                    .actions {}
                }

                &:hover {
                    background: $ff-indigo-50;
                }
            }
        }

        &:last-of-type {
            margin-bottom: 0;
        }
    }
}
</style>
