<template>
    <div v-if="isOpen" class="ff-dialog-box education-modal">
        <div class="ff-dialog-header text-center" data-sentry-unmask>
            Welcome to FlowFuse!
        </div>
        <div class="ff-dialog-content">
            <template v-if="!isClosing">
                <p class="message mb-7">Where would you like to get started?</p>
                <ul class="options">
                    <li v-for="(option, $key) in helpOptions" :key="$key">
                        <a :href="option.href" class="ff-link" target="_blank" @click="capturePostHog(option)">
                            <span>{{ option.title }}</span>
                            <ExternalLinkIcon class="ff-icon" />
                        </a>
                    </li>
                </ul>
            </template>
            <template v-else>
                <p class="text-center">
                    You can access these resources at any time by clicking the drop-down arrow in the upper-right corner.
                </p>
            </template>
        </div>
        <div class="ff-dialog-actions">
            <ff-button type="secondary" @click="triggerClose">
                <template v-if="!isClosing">Close</template>
                <template v-else>Dismiss</template>
            </ff-button>
        </div>
        <div v-if="isClosing" class="loader-wrapper">
            <div class="loader">
                <div class="w-full bg-gray-200 full h-1 dark:bg-gray-700">
                    <div class="bg-blue-600 h-1 full csm-loader" :style="{width: closingTimer + '%'}" />
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import { ExternalLinkIcon } from '@heroicons/vue/solid'
import { mapActions, mapGetters } from 'vuex'

import product from '../../services/product.js'

export default {
    name: 'EducationModal',
    components: { ExternalLinkIcon },
    data () {
        return {
            isClosing: false,
            closingTimer: 0
        }
    },
    computed: {
        ...mapGetters({
            isOpen: 'ux/shouldShowEducationModal'
        }),
        helpOptions () {
            return [
                {
                    title: 'Create a DevOps Pipeline',
                    href: 'https://flowfuse.com/docs/user/devops-pipelines/'
                },
                {
                    title: 'Set up Project Nodes',
                    href: 'https://flowfuse.com/docs/user/projectnodes/#flowfuse-project-nodes/'
                },
                {
                    title: 'Build a Dashboard',
                    href: 'https://flowfuse.com/blog/2024/04/how-to-build-an-application-with-node-red-dashboard-2/'
                },
                {
                    title: 'Create a Node-RED flow',
                    href: 'https://www.youtube.com/watch?v=47EvfmJji-k/'
                }

            ]
        }
    },
    methods: {
        ...mapActions('ux', ['deactivateTour']),
        triggerClose () {
            if (this.isClosing) {
                this.closeModal()
            } else {
                this.isClosing = true

                const intervalId = setInterval(() => {
                    this.closingTimer += 0.225

                    if (this.closingTimer >= 100) {
                        clearInterval(intervalId)
                    }
                }, 10)

                setTimeout(() => this.closeModal(), 5000)
            }
        },
        closeModal () {
            this.deactivateTour('education')
            this.isClosing = false
            this.closingTimer = 0
        },
        capturePostHog (option) {
            product.capture('clicked-trial-education-link', option)
        }
    }
}
</script>

<style scoped lang="scss">
.education-modal {
  position: absolute;
  top: 65px;
  right: 5px;
  width: 350px;
  background: $ff-white;
  border: 1px solid $ff-grey-300;
  box-shadow: -6px 6px 10px rgba(0, 0, 0, .2);
  margin: 0;

  .ff-dialog-content {
    padding: 10px 10px 5px 10px;

    p {
      line-height: 1.5;
    }
  }

  .ff-dialog-actions {
    padding: 5px 10px 10px 10px;
  }

  .title {
    margin-bottom: 20px;
    text-align: center;
    border-bottom: 1px solid $ff-grey-200;
    padding-bottom: 15px;
  }

  .options {
    li {
      margin-bottom: 5px;

      a {
        transition: ease-in-out .3s;
        position: relative;
        line-height: 2;
        display: flex;
        justify-content: space-between;
        width: 100%;
        border: 1px solid $ff-grey-200;
        align-items: center;
        padding: 5px;
        color: $ff-black;

        &:hover {
          text-decoration: none;
          border: 1px solid $ff-blue-700;
          color: $ff-blue-700;
        }
      }
    }
  }

  .actions {
    display: flex;
    justify-content: flex-end;
  }

  .loader-wrapper {
    position: relative;

    .loader {
      position: absolute;
      z-index: 1000;
      right: 0;
      bottom: -7px;
      height: 10px;
      width: 100%;
    }

  }
}
</style>
