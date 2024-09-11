<template>
    <section class="dependency-item">
        <div class="dependency-header">
            <div class="title">
                <h3>{{ title }}</h3>
            </div>
            <div class="details">
                <span>Latest: 1.12.0-tbd</span>
                <span>Released: 3 Days Ago -tbd</span>
            </div>
        </div>
        <versions-list
            v-for="(entry, key) in Object.entries(versions)" :key="key"
            :instances="entry[1]"
            :version="entry[0]"
        />
    </section>
</template>

<script>

import VersionsList from './VersionsList.vue'

export default {
    name: 'DependencyItem',
    components: { VersionsList },
    props: {
        title: {
            required: true,
            type: String
        },
        versions: {
            required: true,
            type: Object
        }
    }
}
</script>

<style scoped lang="scss">
.dependency-item {
  .dependency-header {
    background: $ff-grey-100;
    display: flex;
    border-bottom: 1px solid $ff-grey-300;
    padding: 15px 5px;
    align-items: center;

    .title {
      flex: 1;

      h3 {
        margin: 0;
      }
    }

    .details {
      display: flex;
      flex-direction: column;
      font-size: 12px;
      font-weight: 500;
    }
  }
}
</style>
