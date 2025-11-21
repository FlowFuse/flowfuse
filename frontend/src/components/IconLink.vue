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

border-radius: var(--ff-unit-sm);
border: 1px solid var(--ff-grey-300);

height: 28px;
padding: var(--ff-unit-sm) 5px;

font-size: var(--ff-funit-sm);
line-height: 20px;

svg {
  margin-right: 5px;
}

&:hover {
  cursor: pointer;
  border-color: var(--ff-blue-600);

  color: var(--ff-blue-600);;
  background-color: var(--ff-grey-50);

  .ff-icon {
      color: var(--ff-blue-600);
  }
}
}
</style>
