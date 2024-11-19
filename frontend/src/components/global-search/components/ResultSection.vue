<template>
    <section v-if="hasResults > 0" class="section">
        <p class="title">
            <component :is="icon" class="icon ff-icon-sm" />
            <span class="text">{{ title }}</span>
            <span class="counter">({{ resultCount }})</span>
        </p>
        <ul class="results">
            <li v-for="result in results" :key="result.id">
                {{ result.name }}
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

<style scoped lang="scss">
.section {
    margin-bottom: 15px;

    .title {
        position: relative;
        margin-bottom: 5px;
        display: flex;
        align-items: self-end;
        gap: 5px;

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

    &:last-of-type {
        margin-bottom: 0;
    }
}

</style>
