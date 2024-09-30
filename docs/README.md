---
navTitle: Documentation
meta:
   description: Explore comprehensive documentation for FlowFuse, covering user manuals, API references, Node-RED migration guides, device management, FlowFuse Cloud setup, self-hosted installations, support resources, and contributing to FlowFuse development.
   tags:
      - flowfuse
      - nodered
      - documentation
      - api
      - migration
      - device management
      - cloud
      - self-hosted
      - support
      - contributing
---

<script>     
   class IconChevronRight extends HTMLElement {
      constructor() {
         super();
         this.attachShadow({ 'mode': 'open' })
      }
      
      connectedCallback () {
         this.shadowRoot.innerHTML = `<svg class="ff-icon ff-icon-sm" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>`
      }
   }
   customElements.define('icon-chevron-right', IconChevronRight);
</script>

# FlowFuse Documentation

Welcome to the documentation for FlowFuse, an open-source, industrial data platform that enables engineers to build, manage, scale, and secure their Node-RED solutions.

It covers everything from setup, to usage, and development. All [contributions](http://localhost:8080/docs/contribute/introduction/) are welcome. 

## Getting Started

<div class="ff-offering-tiles grid-cols-1 sm:grid-cols-2">
   <div class="ff-tile ff-offering-tile">
      <label>FlowFuse Self-Hosted</label>
      <p>Run FlowFuse yourself on your own infrastructure.</p>
      <ul style="margin-top: 0; margin-bottom: 0;">
         <li class="ff-offering-cta">
            <a href="/docs/install/introduction/">
               Install FlowFuse Self-Hosted
               <icon-chevron-right class="ff-icon ff-icon-sm" />
            </a>
         </li>
         <li>
            <a href="/docs/upgrade">
               Upgrade Your FlowFuse Instance
               <icon-chevron-right class="ff-icon ff-icon-sm" />
            </a>
         </li>
         <li>
            <a href="/docs/upgrade/open-source-to-premium/">
               Unlock Enterprise Features
               <icon-chevron-right class="ff-icon ff-icon-sm" />
            </a>
         </li>
         <li>
            <a href="/docs/admin/introduction/">
               Administering FlowFuse
               <icon-chevron-right class="ff-icon ff-icon-sm" />
            </a>
         </li>
      </ul>
   </div>
   <div class="ff-tile ff-offering-tile">
      <label>FlowFuse Cloud</label>
      <p>Hosted solution, nothing to install anything, jump straight in.</p>
      <ul style="margin-top: 0; margin-bottom: 0;">
         <li class="ff-offering-cta"><a href="https://app.flowfuse.com/account/create">Sign Up for Free<icon-chevron-right class="ff-icon ff-icon-sm" /></a></li>
         <li><a href="">Upgrading Teams<icon-chevron-right class="ff-icon ff-icon-sm" /></a></li>
         <li><a href="/docs/cloud/billing/">Billing<icon-chevron-right class="ff-icon ff-icon-sm" /></a></li>
         <li><a href="/docs/cloud/introduction/#single-sign-on">Single Sign On<icon-chevron-right class="ff-icon ff-icon-sm" /></a></li>
      </ul>
   </div>
</div>

## Using FlowFuse

### Getting Started

Here are some quick reference links to our most popular topics. You can also view the full documentation available for FlowFuse in our [Getting Started](http://localhost:8080/docs/user/introduction) guide.

<div class="ff-product-feature-tiles grid-cols-1 md:grid-cols-2">
   <a class="ff-tile ff-product-feature-tile" href="/docs/user/instance-settings/">
      <div class="ff-product-feature-tile-decorator">
         <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 14.62"><path class="st0" d="M0,7.31v-1.72c5.09,0,5.81-.94,6.44-1.77,.72-.94,1.46-1.67,3.88-1.67v1.72c-1.76,0-2.04,.37-2.51,.99-1.02,1.34-2.31,2.45-7.81,2.45Z"/><path class="st0" d="M8.6,12.47c-2.9,0-3.47-1.58-3.88-2.73-.47-1.31-.87-2.43-4.72-2.43v-1.72c4.67,0,5.67,1.69,6.34,3.57,.38,1.06,.57,1.59,2.26,1.59v1.72Z"/><path class="st0" d="M16.78,14.62h-6.88c-.95,0-1.72-.77-1.72-1.72v-2.58c0-.95,.77-1.72,1.72-1.72h6.88c.95,0,1.72,.77,1.72,1.72v2.58c0,.95-.77,1.72-1.72,1.72Zm0-1.72v0h0Zm0-2.58h-6.88v2.58h6.88v-2.58Z"/><path class="st0" d="M18.28,6.02h-6.88c-.95,0-1.72-.77-1.72-1.72V1.72c0-.95,.77-1.72,1.72-1.72h6.88c.95,0,1.72,.77,1.72,1.72v2.58c0,.95-.77,1.72-1.72,1.72Zm0-1.72v0h0Zm0-2.58h-6.88v2.58h6.88V1.72Z"/></svg>
      </div>
      <div>
         <label>Configuring Instances</label>
         <span>Understand the options available for your Node-RED Instances</span>
      </div>
   </a>
   <a class="ff-tile ff-product-feature-tile" href="/docs/user/snapshots/">
      <div class="ff-product-feature-tile-decorator">
         <svg class="ff-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
      </div>
      <div>
         <label>Snapshots</label>
         <span>Version Control for your Node-RED Instances.</span>
      </div>
   </a>
   <a class="ff-tile ff-product-feature-tile" href="/docs/user/shared-library/">
      <div class="ff-product-feature-tile-decorator">
         <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" /></svg>
      </div>
      <div>
         <label>Team Library</label>
         <span>Centralized management of re-usable flows and functions.</span>
      </div>
   </a>
   <a class="ff-tile ff-product-feature-tile" href="/docs/user/snapshots/">
      <div class="ff-product-feature-tile-decorator">
         <svg class="ff-icon" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 24 24" style="enable-background:new 0 0 24 24;" xml:space="preserve"><g class="st0"><path d="M7,15.8 M7,3.1 M7,15.8V4.2C7,3.5,6.5,3,5.8,3H3.9C3.2,3,2.6,3.5,2.6,4.2v11.6"/><path d="M14,15.8 M14,3.1 M14,15.8V4.2C14,3.5,13.5,3,12.8,3h-1.9c-0.7,0-1.2,0.5-1.2,1.2v11.6"/><path d="M21,3.1 M21,15c0-2.7,0-10.8,0-10.8C21,3.5,20.5,3,19.8,3h-1.9c-0.7,0-1.2,0.5-1.2,1.2V11"/><path d="M17.2,22.5c-0.2,0-0.4-0.1-0.5-0.2c-0.3-0.3-0.3-0.8,0-1.1l2.5-2.5H3c-0.4,0-0.8-0.3-0.8-0.8s0.3-0.8,0.8-0.8h16.2l-2.5-2.5c-0.3-0.3-0.3-0.8,0-1.1s0.8-0.3,1.1,0l3.8,3.8c0.1,0.1,0.1,0.2,0.2,0.2c0,0.1,0.1,0.2,0.1,0.3s0,0.2-0.1,0.3c0,0.1-0.1,0.2-0.2,0.2l-3.8,3.8C17.6,22.4,17.4,22.5,17.2,22.5z"/></g></svg>
      </div>
      <div>
         <label>Pipelines</label>
         <span>Deploy flows between Test, Staging & Production Environments.</span>
      </div>
   </a>
   <a class="ff-tile ff-product-feature-tile" href="/docs/user/device-groups/">
      <div class="ff-product-feature-tile-decorator">
         <svg class="ff-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 0 0 2.25-2.25V6.75a2.25 2.25 0 0 0-2.25-2.25H6.75A2.25 2.25 0 0 0 4.5 6.75v10.5a2.25 2.25 0 0 0 2.25 2.25Zm.75-12h9v9h-9v-9Z" /></svg>
      </div>
      <div>
         <label>Remote Instances</label>
         <span>Deploy flows remotely with FlowFuse "Devices".</span>
      </div>
   </a>
   <a class="ff-tile ff-product-feature-tile" href="/docs/user/device-groups/">
      <div class="ff-product-feature-tile-decorator">
         <svg class="ff-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g><path d="M16.2 11.63H11.63V16.2H16.2V11.63Z" fill="currentColor"/><path fill-rule="evenodd" clip-rule="evenodd" d="M8.27997 16.18V18.13C8.27997 18.5 8.42997 18.87 8.69997 19.14C8.96997 19.41 9.32997 19.56 9.70997 19.56H11.66V20.67C11.66 20.82 11.72 20.97 11.83 21.08C12.05 21.3 12.43 21.3 12.65 21.08C12.76 20.97 12.82 20.83 12.82 20.67V19.56H15.03V20.67C15.03 20.82 15.09 20.97 15.2 21.08C15.42 21.3 15.8 21.3 16.02 21.08C16.13 20.97 16.19 20.83 16.19 20.67V19.56H18.14C18.51 19.56 18.88 19.41 19.15 19.14C19.42 18.87 19.57 18.51 19.57 18.13V16.18H20.68C20.83 16.18 20.98 16.12 21.09 16.01C21.2 15.9 21.26 15.75 21.26 15.6C21.26 15.45 21.2 15.3 21.09 15.19C20.98 15.08 20.84 15.02 20.68 15.02H19.57V12.81H20.68C20.83 12.81 20.98 12.75 21.09 12.64C21.2 12.53 21.26 12.38 21.26 12.23C21.26 12.08 21.2 11.93 21.09 11.82C20.98 11.71 20.83 11.65 20.68 11.65H19.57V9.69996C19.57 9.32996 19.42 8.95996 19.15 8.68996C18.88 8.41996 18.52 8.26996 18.14 8.26996H12.82V7.15996C12.82 7.00996 12.76 6.85996 12.65 6.74996C12.43 6.52996 12.05 6.52996 11.83 6.74996C11.72 6.85996 11.66 6.99996 11.66 7.15996V8.26996H9.70997C9.32997 8.26996 8.96997 8.41996 8.69997 8.68996C8.43997 8.94996 8.27997 9.31996 8.27997 9.69996V11.65H7.16997C7.01997 11.65 6.86997 11.71 6.75997 11.82C6.64997 11.93 6.58997 12.08 6.58997 12.23C6.58997 12.38 6.64997 12.53 6.75997 12.64C6.86997 12.75 7.01997 12.81 7.16997 12.81H8.27997V16.18ZM18.4 18.39H9.43997V9.42996H18.4V18.39Z" fill="currentColor"/><path fill-rule="evenodd" clip-rule="evenodd" d="M8.28997 15.02H6.07997V6.05996H15.04V8.26996H16.2V6.31996C16.2 5.94996 16.05 5.57996 15.78 5.30996C15.52 5.04996 15.15 4.88996 14.77 4.88996H12.82V3.77996C12.82 3.62996 12.76 3.47996 12.65 3.36996C12.43 3.14996 12.05 3.14996 11.83 3.36996C11.72 3.47996 11.66 3.61996 11.66 3.77996V4.88996H9.44997V3.77996C9.44997 3.62996 9.38997 3.47996 9.27997 3.36996C9.05997 3.14996 8.67997 3.14996 8.45997 3.36996C8.34997 3.47996 8.28997 3.61996 8.28997 3.77996V4.88996H6.33997C5.95997 4.88996 5.59997 5.03996 5.32997 5.30996C5.06997 5.56996 4.90997 5.93996 4.90997 6.31996V8.26996H3.79997C3.64997 8.26996 3.49997 8.32996 3.38997 8.43996C3.27997 8.54996 3.21997 8.69996 3.21997 8.84996C3.21997 8.99996 3.27997 9.14996 3.38997 9.25996C3.49997 9.36996 3.64997 9.42996 3.79997 9.42996H4.90997V11.64H3.79997C3.64997 11.64 3.49997 11.7 3.38997 11.81C3.27997 11.92 3.21997 12.06 3.21997 12.22C3.21997 12.38 3.27997 12.52 3.38997 12.63C3.49997 12.74 3.64997 12.8 3.79997 12.8H4.90997V14.75C4.90997 15.12 5.05997 15.49 5.32997 15.76C5.59997 16.03 5.95997 16.18 6.33997 16.18H8.27997V15.02H8.28997Z" fill="currentColor"/></g><defs></defs>
</svg>

      </div>
      <div>
         <label>Device Groups</label>
         <span>Manage large numbers of devices together.</span>
      </div>
   </a>
</div>

### Advanced Features

Once you're more comfortable with FlowFuse, you may want to explore some of our more advanced features that will help elevate your Node-RED experience even further.

<div class="ff-product-feature-tiles grid-cols-1 md:grid-cols-2">
   <a class="ff-tile ff-product-feature-tile" href="/docs/user/team/">
      <div class="ff-product-feature-tile-decorator">
         <svg class="ff-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" /></svg>
      </div>
      <div>
         <label>Managing Teams</label>
         <span>Host your Instances at a custom subdomain</span>
      </div>
   </a>
   <a class="ff-tile ff-product-feature-tile" href="/docs/user/custom-hostnames/">
      <div class="ff-product-feature-tile-decorator">
         <svg class="ff-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" /></svg>

      </div>
      <div>
         <label>Custom Domains</label>
         <span>Host your Instances at a custom subdomain</span>
      </div>
   </a>
   <a class="ff-tile ff-product-feature-tile" href="/docs/user/device-groups/">
      <div class="ff-product-feature-tile-decorator">
         <svg class="ff-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" /></svg>
      </div>
      <div>
         <label>High Availability</label>
         <span>Automatically distribute workload across multiple copies of your Node-RED Instance.</span>
      </div>
   </a>
</div>


## FlowFuse Extras

<div class="ff-offering-tiles grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
   <div class="ff-tile ff-offering-tile">
      <label><img src="/img/logo-dashboard.png" />FlowFuse Dashboard</label>
      <p>Create interactive, responsive and secure Dashboards in Node-RED.<p>
      <ul>
         <li><a href="https://dashboard.flowfuse.com">Install FlowFuse Dashboard<icon-chevron-right class="ff-icon ff-icon-sm" /></a></li>
         <li><a href="https://dashboard.flowfuse.com">Build Your First Dashboard<icon-chevron-right class="ff-icon ff-icon-sm" /></a></li>
         <li><a href="https://dashboard.flowfuse.com/user/multi-tenancy.html">Multi Tenant Dashboards<icon-chevron-right class="ff-icon ff-icon-sm" /></a></li>
      </ul>
   </div>
   <div class="ff-tile ff-offering-tile">
      <label><img src="/img/logo-device-agent.png" />FlowFuse Device Agent</label>
      <p>Manage thousands of Node-RED Instances remotely with the FlowFuse Device Agent.<p>
      <ul>
         <li><a href="/docs/device-agent/install/">Install the Device Agent<icon-chevron-right class="ff-icon ff-icon-sm" /></a></li>
         <li><a href="/docs/device-agent/register/">Registering Devices in FlowFuse<icon-chevron-right class="ff-icon ff-icon-sm" /></a></li>
         <li><a href="/docs/device-agent/deploy/">Deploying Flows to your Device<icon-chevron-right class="ff-icon ff-icon-sm" /></a></li>
         <li><a href="/docs/device-agent/deploy/">Editing Flows on your Device<icon-chevron-right class="ff-icon ff-icon-sm" /></a></li>
      </ul>
   </div>
   <div class="ff-tile ff-offering-tile">
      <label>FlowFuse Assistant</label>
      <p>AI in the Node-RED Editor to help build your flows.<p>
      <ul>
         <li><a href="/docs/user/assistant/">Getting Started Guide<icon-chevron-right class="ff-icon ff-icon-sm" /></a></li>
      </ul>
   </div>
   <div class="ff-tile ff-offering-tile">
      <label>FlowFuse Project Nodes</label>
      <p>Seamlessly pass data between your Node-RED Instances.<p>
      <ul>
         <li><a href="/docs/user/projectnodes/">Getting Started Guide<icon-chevron-right class="ff-icon ff-icon-sm" /></a></li>
      </ul>
   </div>
</div>

## Support

- [Troubleshooting](/docs/debugging/)
- [Community Support](https://community.flowfuse.com/)
- [FlowFuse Cloud Support](/docs/premium-support/)

## Contributing to FlowFuse
 - [Useful Information](./contribute/introduction/#contributing-to-flowfuse) - Learn the foundational concepts of how FlowFuse is built & structured. 
 - [Development Setup](./contribute/introduction/#development-setup) - Configure your local development environment to contribute to FlowFuse.
 - [Testing](./contribute/introduction/#testing) - Understand our testing philosophy at FlowFuse.

<style>
.st0 {
   fill: currentColor;
   stroke-width: 1.5;
   stroke-linecap: round;
   stroke-linejoin: round;
}
</style>


<style>
   a label {
      cursor: pointer;
   }
   .ff-tile,
   .ff-offering-tile ul li a {
      gap: 6px;
      border: 1px solid #e2e8f0;
      border-radius: 0.5rem;
   }
   .ff-tile span {
      display: block;
      color: #374151;
      font-size: 0.875rem;
      font-weight: 300;
      line-height: 1.25rem;
   }
   .ff-offering-tiles {
      display: grid;
      gap: 1rem;
   }
   .ff-offering-tile {
      padding: 1rem;
   }
   .ff-offering-tile .ff-offering-cta {
      /* margin-bottom: 1.5rem; */
   }
   .ff-offering-tile label {
      font-size: 1.25rem;
      font-weight: 500;
      color: #4b5563;
      display: flex;
      align-items: center;
      gap: 6px;
   }
   .ff-offering-tile label img {
      width: 32px;
   }
   .ff-offering-tile ul {
      list-style: none;
      padding: 0;
      margin-bottom: 0;
   }
   .ff-offering-tile ul li {
      padding-left: 0;
   }
   .ff-offering-tile ul li:last-child {
      margin-bottom: 0;
   }
   .ff-offering-tile ul li a {
      display: flex;
      padding: 6px 9px;
      text-decoration: none;
      align-items: center;
      justify-content: space-between;
   }
   .ff-offering-tile ul li a:hover,
   .ff-product-feature-tile:hover {
      cursor: pointer;
      border: 1px solid #4F46E5;
      text-decoration: none;
   }
   .ff-offering-tile ul li .ff-icon {
      padding-right: 0;      
   }
   .ff-product-feature-tiles {
      display: grid;
      gap: 1rem;
   }
   .ff-product-feature-tile {
      display: flex;
      padding: 6px;
      text-decoration: none;
   }
   .ff-product-feature-tile label,
   .ff-product-feature-tile .ff-product-feature-tile-decorator {
      color: #2463eb;
   }
   .ff-product-feature-tile .ff-icon {
      width: 32px;
      height: 32px;
      stroke-width: 1.5px;
   }
   .ff-product-feature-tile-decorator {
      background-color: #EEF2FF;
      padding: 3px;
      width: 42px;
      display: flex;
      justify-content: center;
      align-items: center;
      flex-shrink: 0;
   }
</style>