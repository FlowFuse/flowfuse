<template>
    <div id="add-database">
        <div class="create-database flex flex-col gap-9" data-el="choose-database">
            <section class="flex gap-6 justify-center relative z-10 flex-wrap">
                <h2>Choose which Database you'd like to get started with:</h2>
            </section>

            <section class="flex gap-6 justify-center relative z-10 flex-wrap">
                <MediumTile
                    v-for="(option, $key) in options"
                    :key="$key"
                    :ribbon="option.ribbon"
                    :title="option.title"
                    :image-path="option.image"
                    :data-value="option.title"
                >
                    <template #image>
                        <img alt="tile-image" class="w-36 m-auto" src="../../../../images/empty-states/team-tables.png">
                    </template>
                    <template #content>
                        <ul>
                            <li v-for="(line, $lKey) in option.content" :key="$lKey" class="flex items-top gap-2">
                                <CheckIcon v-if="option.contentType === 'check'" class="ff-icon-sm" />
                                <MinusIcon v-else class="ff-icon-sm" />
                                {{ line }}
                            </li>
                        </ul>
                    </template>
                    <template #call-to-action>
                        <ff-button
                            v-if="option.to"
                            class="w-full" data-el="select"
                            :kind="option.ribbon || options.length === 1 ? 'primary' : 'secondary'"
                            :to="option.to"
                        >
                            Select
                        </ff-button>

                        <ff-button
                            v-else-if="option.handler"
                            class="w-full" data-el="select"
                            :kind="option.ribbon || options.length === 1 ? 'primary' : 'secondary'"
                            @click="option.handler"
                        >
                            Select
                        </ff-button>
                    </template>
                </MediumTile>
            </section>

            <section class="actions flex items-center justify-center">
                <ff-button v-if="shouldDisplayBackButton" kind="tertiary" data-el="page-back" @click="$router.back()">
                    Back
                </ff-button>
            </section>
        </div>
    </div>
</template>

<script>
import { CheckIcon, MinusIcon } from '@heroicons/vue/outline'
import { defineComponent } from 'vue'
import { mapActions, mapState } from 'vuex'

import MediumTile from '../../../../components/tiles/MediumTile.vue'
import NameGenerator from '../../../../utils/name-generator/index.js'

export default defineComponent({
    name: 'NewDatabase',
    components: {
        MinusIcon,
        CheckIcon,
        MediumTile
    },
    computed: {
        ...mapState('account', ['team']),
        options () {
            return [
                {
                    ribbon: 'Recommended',
                    title: 'Managed PostgreSQL',
                    content: [
                        'Production-ready PostgreSQL included in your plan'
                    ],
                    contentType: 'check',
                    handler: this.onPgTableCreate
                }
            ].filter(op => !op.hidden)
        },
        shouldDisplayBackButton () {
            return true
        }
    },
    methods: {
        ...mapActions('product/tables', ['createDatabase']),
        onPgTableCreate () {
            const databaseName = NameGenerator()

            return this.createDatabase({ teamId: this.team.id, databaseName })
                .then(() => this.$router.push({
                    name: 'team-tables',
                    params: { team_slug: this.team.slug }
                }))
        }
    }
})
</script>

<style scoped lang="scss">
#add-database {
    height: 100%;
}
</style>
