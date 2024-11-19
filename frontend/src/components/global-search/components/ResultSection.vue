<template>
    <section class="section">
        <p class="title">
            <component :is="icon" v-if="icon" class="icon ff-icon-sm" />

            <span class="text">{{ title }}</span>

            <span class="counter">({{ resultCount }})</span>
        </p>

        <ul class="results">
            <li v-for="(result, index) in results" :key="result.id" class="result-wrapper">
                <div class="result">
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
                </div>
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
        }
    },
    computed: {
        resultCount () {
            return this.results.length
        },
        hasResults () {
            return this.resultCount > 0
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

</style>
