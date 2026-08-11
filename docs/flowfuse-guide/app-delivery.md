---
navTitle: App delivery methods
navOrder: 2
meta:
   description: Two ways to deliver work in FlowFuse: promote a whole versioned app through pipelines, or publish one reusable piece to the Team Library.
---

# App delivery methods

Two different units of code, delivered two ways. You can ship the whole app, a complete versioned project promoted through environments. Or you can publish one reusable piece, a package the whole team installs and upgrades in one place. Pick by what you are shipping: the app, or a part of it.

## Whole app

Snapshots and pipelines: promote a complete, versioned project through dev, staging and production, out to every place that runs it.

![One dev instance at the top feeding a versioned build down to three separate site instances, each with its own environment settings.](./images/app-delivery-whole-app.svg){data-zoomable}

Take the whole app, every flow, setting and dependency, as a versioned [snapshot](/docs/user/snapshots/). Then promote that one controlled build through pipeline stages to every place that should run it.

**Use it when** you are shipping a complete application and every site should run the same, controlled version.

<div class="ff-doc-cards">
  <div class="ff-doc-card">
    <div class="ff-doc-card__title">How it works</div>
    <p>A <a href="/docs/user/devops-pipelines/">pipeline</a> promotes a snapshot from dev to staging to production. Each target is parameterised by its own environment variables, so one controlled build serves every site.</p>
  </div>
  <div class="ff-doc-card">
    <div class="ff-doc-card__title">Major components</div>
    <ul>
      <li><strong>Snapshot</strong>: the whole app, frozen as one versioned build.</li>
      <li><strong>Pipeline</strong>: promotes that snapshot through dev, staging and production.</li>
      <li><strong>Dev instance</strong>: where you build and test the project.</li>
      <li><strong>Remote and Hosted Instances</strong>: the fleet each snapshot rolls out to, connected through the <a href="/docs/device-agent/">Device Agent</a>.</li>
    </ul>
  </div>
  <div class="ff-doc-card">
    <div class="ff-doc-card__title">Where config and data live</div>
    <ul>
      <li><strong>Config</strong>: each target is parameterised by its own <a href="/docs/user/envvar/">environment variables</a>.</li>
      <li><strong>Rollout</strong>: <a href="/docs/user/device-groups/">Device Groups</a> plus pipeline promotion, so one controlled build reaches many places.</li>
    </ul>
  </div>
</div>

## Pieces

Subflow export: publish one piece as a package the team installs, like a shared library.

![A subflow flowing into a shared library, which three separate apps install at their own versions, with a record underneath of which version each app runs.](./images/app-delivery-pieces.svg){data-zoomable}

Package a single piece of a flow, a block of logic or UI, as a reusable subflow. Publish it to the [Team Library](/docs/user/shared-library/) as an [installable node](/docs/user/custom-npm-packages/) that other apps pull in, instead of copying code between projects.

**Use it when** a part of an app should be reused across many apps and upgraded in one place. This is a shared library, not a whole application.

<div class="ff-doc-cards">
  <div class="ff-doc-card">
    <div class="ff-doc-card__title">How it works</div>
    <p>There are two routes. The subflow can travel as importable JSON, or it can be published to the Team Library as an installable package with an example flow. Apps install it like a library dependency, and the <a href="/docs/user/bill-of-materials/">Bill of Materials</a> tracks every version in use.</p>
  </div>
  <div class="ff-doc-card">
    <div class="ff-doc-card__title">Major components</div>
    <ul>
      <li><strong>Subflow</strong>: the one reusable piece you package.</li>
      <li><strong>Team Library</strong>: the catalogue you publish the package to.</li>
      <li><strong>Instances</strong>: the apps that install and run the piece.</li>
      <li><strong>Bill of Materials</strong>: tracks which version each app runs.</li>
    </ul>
  </div>
  <div class="ff-doc-card">
    <div class="ff-doc-card__title">Where config and data live</div>
    <ul>
      <li><strong>Config</strong>: the subflow's instance properties, or the environment where it is installed.</li>
      <li><strong>Distribution</strong>: publish once to the Team Library, and apps install and upgrade from it, like a library.</li>
    </ul>
  </div>
</div>

{% note %}
Dev and production may sit on separate servers, with dev in IT or the cloud and production in OT or air gapped. A GitHub bridge carries the same versioned code across that boundary. That is an [architecture decision](/docs/flowfuse-guide/architectures/).
{% endnote %}
