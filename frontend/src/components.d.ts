// Global component type declarations for Volar (Vue - Official) IDE support.
// Enables Go-to-Definition and autocomplete for globally registered components.
// Keep in sync with: ui-components/components.js and main.js

declare module 'vue' {
    export interface GlobalComponents {
        // -- ui-components/components.js --
        FfNavBreadcrumb: typeof import('./ui-components/components/Breadcrumb.vue')['default']
        FfButton: typeof import('./ui-components/components/Button.vue')['default']
        FfCheck: typeof import('./ui-components/components/Check.vue')['default']
        FfDialog: typeof import('./ui-components/components/DialogBox.vue')['default']
        FfDivider: typeof import('./ui-components/components/Divider.vue')['default']
        FfHelp: typeof import('./ui-components/components/Help.vue')['default']
        FfMarkdownViewer: typeof import('./ui-components/components/Markdown.vue')['default']
        FfNotificationPill: typeof import('./ui-components/components/NotificationPill.vue')['default']
        FfNotificationToast: typeof import('./ui-components/components/NotificationToast.vue')['default']
        FfPopover: typeof import('./ui-components/components/Popover.vue')['default']
        FfSpinner: typeof import('./ui-components/components/Spinner.vue')['default']

        // Data Table
        FfDataTable: typeof import('./ui-components/components/data-table/DataTable.vue')['default']
        FfDataTableCell: typeof import('./ui-components/components/data-table/DataTableCell.vue')['default']
        FfDataTableRow: typeof import('./ui-components/components/data-table/DataTableRow.vue')['default']

        // Form Elements
        FfCheckbox: typeof import('./ui-components/components/form/Checkbox.vue')['default']
        FfCombobox: typeof import('./ui-components/components/form/ComboBox.vue')['default']
        FfDropdown: typeof import('./ui-components/components/form/Dropdown.vue')['default']
        FfDropdownOption: typeof import('./ui-components/components/form/DropdownOption.vue')['default']
        FfListbox: typeof import('./ui-components/components/form/ListBox.vue')['default']
        FfRadioButton: typeof import('./ui-components/components/form/RadioButton.vue')['default']
        FfRadioGroup: typeof import('./ui-components/components/form/RadioGroup.vue')['default']
        FfTextInput: typeof import('./ui-components/components/form/TextInput.vue')['default']
        FfTileSelection: typeof import('./ui-components/components/form/TileSelection.vue')['default']
        FfTileSelectionOption: typeof import('./ui-components/components/form/TileSelectionOption.vue')['default']
        FfToggleSwitch: typeof import('./ui-components/components/form/ToggleSwitch.vue')['default']

        // Kebab Menu
        FfKebabItem: typeof import('./ui-components/components/kebab-menu/KebabItem.vue')['default']
        FfKebabMenu: typeof import('./ui-components/components/kebab-menu/KebabMenu.vue')['default']

        // Tabs
        FfTabs: typeof import('./ui-components/components/tabs/Tabs.vue')['default']

        // -- main.js --
        FfPage: typeof import('./layouts/Page.vue')['default']
        FfPageHeader: typeof import('./components/SectionNavigationHeader.vue')['default']
        FfLoading: typeof import('./components/Loading.vue')['default']
        FfTeamLink: typeof import('./components/router-links/TeamLink.vue')['default']
        LottieAnimation: typeof import('lottie-web-vue')['LottieAnimation']
    }
}

export {}
