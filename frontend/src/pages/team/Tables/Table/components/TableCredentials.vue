<template>
    <div id="table-credentials" class="flex gap-5">
        <section class="database flex-1">
            <div class="title">
                <DatabaseIcon class="ff-icon ff-icon-sm" />
                <h3>Database Details</h3>
            </div>
            <div class="database-details">
                <dl>
                    <div class="flex item">
                        <dt>Database ID:</dt>
                        <dd>{{ database.credentials.database }}</dd>
                    </div>
                    <div class="flex item">
                        <dt>Host:</dt>
                        <dd>{{ database.credentials.host }}</dd>
                    </div>
                    <div class="flex item">
                        <dt>Port</dt>
                        <dd>{{ database.credentials.port }}</dd>
                    </div>
                    <div v-if="database.credentials.ssl" class="flex item">
                        <dt>SSL</dt>
                        <dd>{{ database.credentials.ssl }}</dd>
                    </div>
                </dl>
            </div>
        </section>
        <section class="credentials flex-1">
            <div class="title">
                <LockClosedIcon class="ff-icon ff-icon-sm" />
                <h3>Client Credentials</h3>
            </div>
            <div class="client-details">
                <dl>
                    <div class="flex item">
                        <dt>Username:</dt>
                        <dd>{{ database.credentials.user }}</dd>
                    </div>
                    <div class="flex item">
                        <dt>Password:</dt>
                        <dd>{{ database.credentials.password }}</dd>
                    </div>
                </dl>
            </div>
        </section>
    </div>
</template>

<script>

import { DatabaseIcon, LockClosedIcon } from '@heroicons/vue/outline'

import { defineComponent } from 'vue'
import { mapGetters, mapState } from 'vuex'

export default defineComponent({
    name: 'TableCredentials',
    components: { DatabaseIcon, LockClosedIcon },
    computed: {
        ...mapState('product/tables', ['databases']),
        ...mapGetters('product/tables', ['database'])
    }
})
</script>

<style scoped lang="scss">
#table-credentials {
    .title {
        display: flex;
        gap: 5px;
        align-items: center;
        margin-bottom: 10px;

        h3 {
            margin: 0;
            padding: 0;
        }
    }

    .client-details,
    .database-details {
        padding: 10px;
        background: $ff-white;
        border: 1px solid $ff-color--border;
        border-radius: 5px;

        .item {
            display: flex;
            margin-bottom: 10px;

            dt {
                font-weight: 500;
                max-width: 30%;
                flex: 1
            }

            dd {
                flex: 1;
            }
        }
    }
}
</style>
