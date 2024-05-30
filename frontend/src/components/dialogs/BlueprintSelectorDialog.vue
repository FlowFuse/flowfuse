<template>
    <ff-dialog ref="dialog" data-el="blueprint-selector-dialog" class="blueprints-selector-dialog">
        <template #default>
            <section class="blueprints-container">
                <div class="header">
                    <h3>Select Your Blueprint</h3>
                    <p>To get started, we have a collection of pre-built flow templates that you can use as a starting point for your Node-RED Instance.</p>
                </div>
                <div class="blueprint-selection-wrapper">
                    <BlueprintSelection
                        :blueprints="blueprints"
                        :with-header="false"
                        :preview-tiles="false"
                        :active-blueprint="currentBlueprint"
                        @selected="onBlueprintSelected"
                    />
                </div>
            </section>
            <section class="flow-viewer-container">
                <div ref="viewer" class="viewer" @click.stop.prevent />
            </section>
        </template>
        <template #actions>
            <div class="flex justify-end">
                <ff-button kind="secondary" data-action="dialog-cancel" @click="closeDialog">Cancel</ff-button>
                <ff-button data-action="dialog-confirm" @click="confirmSelection">Confirm Changes</ff-button>
            </div>
        </template>
    </ff-dialog>
</template>
<script>
import FlowRenderer from '@flowfuse/flow-renderer'

import BlueprintSelection from '../../pages/instance/Blueprints/BlueprintSelection.vue'

export default {
    name: 'BlueprintSelectorDialog',
    components: { BlueprintSelection },
    props: {
        blueprints: {
            required: true,
            type: Array
        },
        activeBlueprint: {
            type: Object,
            required: true
        }
    },
    emits: ['blueprint-updated'],
    setup () {
        return {
            show () {
                this.renderFlows()
                this.$refs.dialog.show()
            }
        }
    },
    data () {
        return {
            currentBlueprint: null,
            renderer: null
        }
    },
    watch: {
        currentBlueprint (val) {
            if (val) {
                this.renderFlows()
            }
        }
    },
    mounted () {
        this.mountRenderer()
            .then(() => this.setCurrentBlueprint())
            .catch((error) => {
                console.error('Error mounting renderer', error)
            })
    },
    methods: {
        closeDialog () {
            this.$refs.dialog.close()
        },
        onBlueprintSelected (blueprint) {
            this.currentBlueprint = blueprint
        },
        renderFlows () {
            const flows = this.currentBlueprint.flows.flows
            setTimeout(() => {
                this.renderer.renderFlows(flows, {
                    container: this.$refs.viewer
                })
            }, 20)
        },
        mountRenderer () {
            return new Promise((resolve) => {
                this.renderer = new FlowRenderer()
                resolve()
            })
        },
        setCurrentBlueprint () {
            this.currentBlueprint = this.activeBlueprint
        },
        confirmSelection () {
            this.$emit('blueprint-updated', this.currentBlueprint)
            this.closeDialog()
        }
    }
}
</script>

<style lang="scss">
.blueprints-selector-dialog {
    margin: 0 !important;

    .ff-dialog-box {
      max-width: 90vw;
      max-height: 80vh;
      overflow: auto;

      .ff-dialog-content {
        display: flex;
        padding: 0;
        overflow: auto;

        .blueprints-container {
          padding: 10px;
          overflow: auto;
          max-width: 40%;
          min-width: 450px;
          flex: 1;
          display: flex;
          flex-direction: column;

          .header {
            padding: 0 0 10px;

            h3 {
              font-size: 30px;
            }

            p {
              line-height: 20px;
              padding-top: 10px;
              color : $ff-grey-500;
            }
          }

          .blueprint-selection-wrapper {
            overflow: auto;
            padding: 10px 0;
          }

          .ff-blueprint-groups {
            h4 {
              font-size: 25px;
              line-height: 1.5;
              margin-top: 10px;
            }
          }

        }

        .flow-viewer-container {
          flex: 1;
          overflow: hidden;

          .viewer {
            height: 100%;
            width: 100%;
          }
        }

      }

      .ff-dialog-actions {
        border-top: 1px solid $ff-grey-400;
      }
    }
}

</style>
