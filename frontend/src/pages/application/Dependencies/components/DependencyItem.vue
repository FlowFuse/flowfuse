<template>
    <section class="dependency-item" data-el="dependency-item">
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
                    !Object.prototype.hasOwnProperty.call(this.externalDependency['dist-tags'], 'latest') &&
                    !Object.prototype.hasOwnProperty.call(this.externalDependency, 'versions') &&
                    !Object.prototype.hasOwnProperty.call(
                        this.externalDependency.versions,
                        this.externalDependency['dist-tags'].latest
                    )
                )
            ) {
                return 'N/A'
            }

            return this.externalDependency.versions[this.externalDependency['dist-tags'].latest].version
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

            return daysSince(this.externalDependency.time.modified, true)
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
  border: 1px solid $ff-grey-300;
  .dependency-header {
    background: $ff-grey-100;
    display: flex;
    border-bottom: 1px solid $ff-grey-300;
    padding: 6px 9px;
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
      text-align: right;
      font-size: 0.875rem;
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
