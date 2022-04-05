<template>
  <form class="space-y-4" @submit.prevent>
    <FormHeading>Editor</FormHeading>
    <div class="flex flex-col sm:flex-row">
      <div class="w-full max-w-md sm:mr-8">
        <FormRow
          v-model="editable.settings.disableEditor"
          type="checkbox"
          :disabled="!editTemplate && !editable.policy.disableEditor"
        >
          Disable editor
          <template #description>
            Disable the editor for this project. The only way to modify the
            running flows will be to re-enable the editor and restart the
            project, or use the Admin API.
          </template>
          <template #append
            ><ChangeIndicator
              :value="editable.changed.settings.disableEditor"
            ></ChangeIndicator
          ></template>
        </FormRow>
      </div>
      <LockSetting
        :editTemplate="editTemplate"
        v-model="editable.policy.disableEditor"
        :changed="editable.changed.policy.disableEditor"
      ></LockSetting>
    </div>
    <div class="flex flex-col sm:flex-row">
      <div class="w-full max-w-md sm:mr-8">
        <FormRow
          v-model="editable.settings.httpAdminRoot"
          :error="editable.errors.httpAdminRoot"
          :type="
            editTemplate || editable.policy.httpAdminRoot
              ? 'text'
              : 'uneditable'
          "
        >
          Editor URL Path
          <template #description> The path used to serve the editor </template>
          <template #append
            ><ChangeIndicator
              :value="editable.changed.settings.httpAdminRoot"
            ></ChangeIndicator
          ></template>
        </FormRow>
      </div>
      <LockSetting
        :editTemplate="editTemplate"
        v-model="editable.policy.httpAdminRoot"
        :changed="editable.changed.policy.httpAdminRoot"
      ></LockSetting>
    </div>
    <div class="flex flex-col sm:flex-row">
      <div class="w-full max-w-md sm:mr-8">
        <FormRow
          v-model="editable.settings.codeEditor"
          :type="
            editTemplate || editable.policy.codeEditor ? 'select' : 'uneditable'
          "
          :options="[
            { label: 'monaco', value: 'monaco' },
            { label: 'ace', value: 'ace' },
          ]"
        >
          Code Editor
          <template #append
            ><ChangeIndicator
              :value="editable.changed.settings.codeEditor"
            ></ChangeIndicator
          ></template>
        </FormRow>
      </div>
      <LockSetting
        :editTemplate="editTemplate"
        v-model="editable.policy.codeEditor"
        :changed="editable.changed.policy.codeEditor"
      ></LockSetting>
    </div>
    <div class="flex flex-col sm:flex-row">
      <div class="w-full max-w-md sm:mr-8">
        <FormRow
          v-model="editable.settings.timeZone"
          :type="
            editTemplate || editable.policy.timeZone ? 'select' : 'uneditable'
          "
          :options="[
            { label: 'monaco', value: 'monaco' },
            { label: 'ace', value: 'ace' },
            { label: 'Europe/Andorra', value: 'Europe/Andorra' },
            { label: 'Asia/Dubai', value: 'Asia/Dubai' },
            { label: 'Asia/Kabul', value: 'Asia/Kabul' },
            { label: 'Europe/Tirane', value: 'Europe/Tirane' },
            { label: 'Asia/Yerevan', value: 'Asia/Yerevan' },
            { label: 'Antarctica/Casey', value: 'Antarctica/Casey' },
            { label: 'Antarctica/Davis', value: 'Antarctica/Davis' },
            {
              label: 'Antarctica/DumontDUrville',
              value: 'Antarctica/DumontDUrville',
            },
            { label: 'Antarctica/Mawson', value: 'Antarctica/Mawson' },
            { label: 'Antarctica/Palmer', value: 'Antarctica/Palmer' },
            { label: 'Antarctica/Rothera', value: 'Antarctica/Rothera' },
            { label: 'Antarctica/Syowa', value: 'Antarctica/Syowa' },
            { label: 'Antarctica/Troll', value: 'Antarctica/Troll' },
            { label: 'Antarctica/Vostok', value: 'Antarctica/Vostok' },
            {
              label: 'America/Argentina/Buenos_Aires',
              value: 'America/Argentina/Buenos_Aires',
            },
            {
              label: 'America/Argentina/Cordoba',
              value: 'America/Argentina/Cordoba',
            },
            {
              label: 'America/Argentina/Salta',
              value: 'America/Argentina/Salta',
            },
            {
              label: 'America/Argentina/Jujuy',
              value: 'America/Argentina/Jujuy',
            },
            {
              label: 'America/Argentina/Tucuman',
              value: 'America/Argentina/Tucuman',
            },
            {
              label: 'America/Argentina/Catamarca',
              value: 'America/Argentina/Catamarca',
            },
            {
              label: 'America/Argentina/La_Rioja',
              value: 'America/Argentina/La_Rioja',
            },
            {
              label: 'America/Argentina/San_Juan',
              value: 'America/Argentina/San_Juan',
            },
            {
              label: 'America/Argentina/Mendoza',
              value: 'America/Argentina/Mendoza',
            },
            {
              label: 'America/Argentina/San_Luis',
              value: 'America/Argentina/San_Luis',
            },
            {
              label: 'America/Argentina/Rio_Gallegos',
              value: 'America/Argentina/Rio_Gallegos',
            },
            {
              label: 'America/Argentina/Ushuaia',
              value: 'America/Argentina/Ushuaia',
            },
            { label: 'Pacific/Pago_Pago', value: 'Pacific/Pago_Pago' },
            { label: 'Europe/Vienna', value: 'Europe/Vienna' },
            { label: 'Australia/Lord_Howe', value: 'Australia/Lord_Howe' },
            { label: 'Antarctica/Macquarie', value: 'Antarctica/Macquarie' },
            { label: 'Australia/Hobart', value: 'Australia/Hobart' },
            { label: 'Australia/Currie', value: 'Australia/Currie' },
            { label: 'Australia/Melbourne', value: 'Australia/Melbourne' },
            { label: 'Australia/Sydney', value: 'Australia/Sydney' },
            { label: 'Australia/Broken_Hill', value: 'Australia/Broken_Hill' },
            { label: 'Australia/Brisbane', value: 'Australia/Brisbane' },
            { label: 'Australia/Lindeman', value: 'Australia/Lindeman' },
            { label: 'Australia/Adelaide', value: 'Australia/Adelaide' },
            { label: 'Australia/Darwin', value: 'Australia/Darwin' },
            { Label: 'Australia/Perth', value: 'Australia/Perth' },
            { Label: 'Australia/Eucla', value: 'Australia/Eucla' },
            { Label: 'Asia/Baku', value: 'Asia/Baku' },
            { Label: 'America/Barbados', value: 'America/Barbados' },
            { Label: 'Asia/Dhaka', value: 'Asia/Dhaka' },
            { Label: 'Europe/Brussels', value: 'Europe/Brussels' },
            { Label: 'Europe/Sofia', value: 'Europe/Sofia' },
            { Label: 'Atlantic/Bermuda', value: 'Atlantic/Bermuda' },
            { Label: 'Asia/Brunei', value: 'Asia/Brunei' },
            { Label: 'America/La_Paz', value: 'America/La_Paz' },
            { Label: 'America/Noronha', value: 'America/Noronha' },
            { Label: 'America/Belem', value: 'America/Belem' },
            { Label: 'America/Fortaleza', value: 'America/Fortaleza' },
            { Label: 'America/Recife', value: 'America/Recife' },
            { Label: 'America/Araguaina', value: 'America/Araguaina' },
            { Label: 'America/Maceio', value: 'America/Maceio' },
            { Label: 'America/Bahia', value: 'America/Bahia' },
            { Label: 'America/Sao_Paulo', value: 'America/Sao_Paulo' },
            { Label: 'America/Campo_Grande', value: 'America/Campo_Grande' },
            { Label: 'America/Cuiaba', value: 'America/Cuiaba' },
            { Label: 'America/Santarem', value: 'America/Santarem' },
            { Label: 'America/Porto_Velho', value: 'America/Porto_Velho' },
            { Label: 'America/Boa_Vista', value: 'America/Boa_Vista' },
            { Label: 'America/Manaus', value: 'America/Manaus' },
            { Label: 'America/Eirunepe', value: 'America/Eirunepe' },
            { Label: 'America/Rio_Branco', value: 'America/Rio_Branco' },
            { Label: 'America/Nassau', value: 'America/Nassau' },
            { Label: 'Asia/Thimphu', value: 'Asia/Thimphu' },
            { Label: 'Europe/Minsk', value: 'Europe/Minsk' },
            { Label: 'America/Belize', value: 'America/Belize' },
          ]"
        >
          Time Zone
          <template #append
            ><ChangeIndicator
              :value="editable.changed.settings.timeZone"
            ></ChangeIndicator
          ></template>
        </FormRow>
      </div>
      <LockSetting
        :editTemplate="editTemplate"
        v-model="editable.policy.timeZone"
        :changed="editable.changed.policy.timeZone"
      ></LockSetting>
    </div>
    <FormHeading class="pt-8">External Modules</FormHeading>
    <div class="flex flex-col sm:flex-row">
      <div class="space-y-4 w-full max-w-md sm:mr-8">
        <FormRow
          v-model="editable.settings.modules_allowInstall"
          type="checkbox"
          :disabled="!editTemplate && !editable.policy.modules_allowInstall"
        >
          Allow user to install new modules in the Function node
          <template #append
            ><ChangeIndicator
              :value="editable.changed.settings.modules_allowInstall"
            ></ChangeIndicator
          ></template>
        </FormRow>
      </div>
      <LockSetting
        :editTemplate="editTemplate"
        v-model="editable.policy.modules_allowInstall"
        :changed="editable.changed.policy.modules_allowInstall"
      ></LockSetting>
    </div>
  </form>
</template>

<script>
import FormRow from "@/components/FormRow";
import FormHeading from "@/components/FormHeading";
import LockSetting from "../components/LockSetting";
import ChangeIndicator from "../components/ChangeIndicator";

export default {
  name: "TemplateSettingsEditor",
  props: ["editTemplate", "modelValue"],
  computed: {
    editable: {
      get() {
        return this.modelValue;
      },
      set(localValue) {
        this.$emit("update:modelValue", localValue);
      },
    },
  },
  components: {
    FormRow,
    FormHeading,
    LockSetting,
    ChangeIndicator,
  },
};
</script>
