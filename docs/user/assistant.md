---
navTitle: FlowFuse Assistant
---

# FlowFuse Assistant Plugin

**Introduced in FlowFuse 2.6 on FlowFuse Cloud only. This feature is not yet available for self-hosted customers.**

The FlowFuse Assistant brings the power of AI to the Node-RED editor.

Node-RED instances running within FlowFuse Cloud will include the **FlowFuse Assistant**
plugin that aims to helps you work faster and smarter.

The plugin currently supports 2 features:

1. Function node creation directly from the Node-RED editor toolbar
2. In-line Function code generation within the function node editor
3. In-line JSON generation within the JSON editor
4. Flow Explainer to explain the selected nodes
5. In-line CSS and HTML generation for FlowFuse Dashboard `ui-template` nodes

To enable the Assistant and any new features, ensure your instance is running the latest Stack and the assistant is updated to the latest version.

Access to the main features of the FlowFuse Assistant is either via the FlowFuse Assistant menu button on the
Node-RED editor toolbar or via a codelens in the code editor.

### Function Node Creation

The FlowFuse Assistant plugin adds a new menu button to the Node-RED editor toolbar that provides access to the assistants features. 

![toolbar](./images/assistant/toolbar.png)

![assistant dialog](./images/assistant/dialog-function-node-builder.png)

This is useful when you want to quickly add a function
node to your flow without having to drag it from the palette and write the code yourself.

If your instance supports external modules, you can also ask for a function node that uses this
and it will be added to the function node setup.

If your function node requires multiple outputs, the assistant will know to set the number of outputs
on the function node setup.


### In-line Function Code Generation

The FlowFuse Assistant plugin also adds a new code lens to the function node editor that allows you
to generate code directly within the editor. 

![inline code lens](./images/assistant/function-node-inline-code-lens.png)

This is useful when you want to quickly add code to an
existing function node without having to generate a full function node from scratch.

### In-line JSON Generation

The FlowFuse Assistant plugin also adds a code lens to the JSON editor that allows you
to generate JSON directly within the monaco editor.

This is useful when you want to quickly generate JSON in a template node, change node, inject node or
any node that the TypedInput offers the JSON editor.


### Flow Explainer

The FlowFuse Assistant plugin also adds a new button to the Assistant menu that will explain what the selected nodes do.
To use this feature, simply select the 1 or more nodes that you want to understand and click the "Explain Flows" button in the Assistant menu.

### In-line CSS and HTML Generation for FlowFuse Dashboard

The FlowFuse Assistant plugin also adds a code lens to the FlowFuse Dashboard `ui-template` node that allows you
to generate CSS and HTML directly within the code editor. It is aware of the context of the node and will
generate suitable CSS and HTML components for vuetify and the FlowFuse Dashboard.

