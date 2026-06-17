<template>
    <router-link
        v-slot="{ href, navigate }"
        :to="to"
        class="ff-icon-link"
        :title="title"
    >
        <a :href="href" class="flex" @click.stop="navigate">
            <component :is="icon" :class="`ff-icon ${iconColor}`" />
            <slot />
        </a>
    </router-link>
</template>

<script>
export default {
    name: 'IconLink',
    props: {
        icon: {
            type: Function,
            required: true
        },
        to: {
            type: [String, Object],
            required: true
        },
        title: {
            type: String,
            default: undefined
        },
        iconColor: {
            type: String,
            default: 'text-teal-700'
        }
    }
}
</script>

<style lang="scss" scoped>
.ff-icon-link {
display: flex;
justify-content: space-between;
align-items: center;
position: relative;

border-radius: $ff-unit-sm;
border: 1px solid var(--ff-color-border-strong);

height: 28px;
padding: $ff-unit-sm 5px;

font-size: $ff-funit-sm;
line-height: 20px;

svg {
  margin-right: 5px;
}

&:hover {
  cursor: pointer;
  border-color: var(--ff-color-link);

  color: var(--ff-color-link);;
  background-color: var(--ff-color-bg-surface);

  .ff-icon {
      color: var(--ff-color-link);
  }
}
}
</style>
