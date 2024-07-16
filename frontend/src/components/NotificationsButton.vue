<template>
    <div class="notifications-button-wrapper">
        <button class="notifications-button" @click="onClick">
            <MailIcon />
        </button>
    </div>
</template>

<script>
import { MailIcon } from '@heroicons/vue/solid'

export default {
    name: 'NotificationsButton',
    components: { MailIcon },
    methods: {
        onClick () {
            console.log(123)
        }
    }
}
</script>

<style scoped lang="scss">
.notifications-button-wrapper {

  .notifications-button {
    border-left: 1px solid $ff-grey-500;
    color: white;
    display: flex;
    align-items: center;
    flex: 1;
    justify-content: center;
    width: 100%;
    height: 100%;
    padding: 10px;

    &:hover {
      background-color: $ff-grey-700;
    }

    svg {
      flex: 1;
      width: 35px;
      height: 35px;
    }
  }

}
</style>
