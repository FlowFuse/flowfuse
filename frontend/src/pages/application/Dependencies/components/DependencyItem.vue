<template>
    <section class="dependency-item">
        <div class="dependency-header">
            <div class="title">
                <h3>{{ title }}</h3>
            </div>
            <div class="details">
                <span>Latest: {{ externalLatest }}</span>
                <span>Released: {{ externalLastModified }}</span>
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

import ExternalClient from '../../../../api/external.js'
import daysSince from '../../../../utils/daysSince.js'

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
    },
    data () {
        return {
            externalDependency: null
        }
    },
    computed: {
        externalLatest () {
            if (
                !this.externalDependency ||
                (
                    !Object.prototype.hasOwnProperty.call(this.externalDependency, 'dist-tags') &&
                    !Object.prototype.hasOwnProperty.call(this.externalDependency['dist-tags'], 'latest')
                )
            ) {
                return 'N/A'
            }

            return this.externalDependency['dist-tags'].latest
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

            return daysSince(this.externalDependency.time.modified)
        }
    },
    mounted () {
        this.getExternalDependency()
    },
    methods: {
        async getExternalDependency () {
            this.externalDependency = await ExternalClient.getNpmDependency(this.title)
        }
    }
}
</script>

<style lang="scss">
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

  &:last-of-type {
    .ff-accordion {
      button {
        border-bottom: none;
      }
  }
  }
}
</style>
