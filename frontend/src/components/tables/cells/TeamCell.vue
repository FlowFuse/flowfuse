<template>
    <div class="flex align-center cursor-pointer" @click='goToTeam'>
        <div class="flex flex-col justify-center"><img class="rounded-md mr-3 w-6 inline" :src="avatar"/></div>
        <div class="inline-flex flex-col">
            <div>{{ name }}</div>
            <div v-if="id" class="text-xs text-gray-400">{{ id }}</div>
        </div>
    </div>
</template>
<script>
export default {
    name: 'TeamCell',
    props: ['avatar', 'name', 'id', 'slug'],
    methods: {
        goToTeam () {
            if (this.slug) {
                this.$router.push({ name: 'Team', params: { team_slug: this.slug } })
            }
        }
    }
}
</script>
