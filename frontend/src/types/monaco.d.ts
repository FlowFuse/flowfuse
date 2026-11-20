// monaco-editor 0.57 exposes its entry points through package "exports", which moduleResolution "node" can't see
declare module 'monaco-editor/editor' {
    export * from 'monaco-editor/esm/vs/editor/editor.api'
}

declare module 'monaco-editor/features/register.all'

declare module 'monaco-editor/languages/features/json/register' {
    export * from 'monaco-editor/esm/vs/languages/features/json/register'
}
