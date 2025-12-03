<template>
    <section class="ff-select-team-step text-center flex flex-col gap-4 pt-6" data-step="team">
        <h2>Choose a Team</h2>

        <p>Select the team you want to deploy the blueprint in:</p>

        <ul class="max-w-2xl w-full m-auto text-left flex flex-col gap-4">
            <li
                v-for="(teamOption, $key) in teams"
                :key="$key"
                class="team-tile flex flex-col gap-2"
                :class="{selected: teamOption.id === team?.id}"
                data-el="team-item"
                @click="selectTeam(teamOption)"
            >
                <div class="header flex justify-between gap-2 items-center">
                    <h5 class="title truncate">
                        {{ teamOption.name }}
                    </h5>
                </div>
            </li>
        </ul>
    </section>
</template>

<script>
import { mapGetters } from 'vuex'

export default {
    name: 'TeamStep',
    props: {
        slug: {
            required: true,
            type: String
        }
    },
    emits: ['next-step', 'step-updated'],
    computed: {
        ...mapGetters('account', ['team', 'teams'])
    },
    mounted () {
        this.$emit('step-updated', {
            [this.slug]: {
                hasErrors: false,
                errors: {}
            }
        })
    },
    methods: {
        selectTeam (team) {
            return this.$store.dispatch('account/setTeam', team.slug)
                .then(() => this.$emit('next-step'))
        }
    }
}
</script>

<style scoped lang="scss">
.ff-select-team-step {
    .team-tile {
        padding: 12px;
        border: 2px solid var(--ff-grey-300);
        width: 100%;
        border-radius: 6px;
        cursor: pointer;
        transition: ease-in-out .3s;

        &:hover {
            border-color: var(--ff-indigo-400);
        }

        &.selected {
            border-color: var(--ff-indigo-600);
        }

        .header {
            .title {

            }

            .counters {
                color: var(--ff-grey-400);
                font-size: var(--ff-funit-xs);
            }
        }

        .description {
            color: var(--ff-grey-400);
            font-size: var(--ff-funit-sm);
        }
    }
}
</style>
