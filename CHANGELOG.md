#### 0.4.2: Maintence Release

- Fix for Stripe credit note crate (#488) @hardillb

#### 0.4.1: Maintence Release

 - Fix for Stripe "charge.succeeded" callback (#484) @hardillb

#### 0.4.0: Release

 - Timezone support for Node-RED (#452) @PLCMercenary
 - Clean when billing enabled & permission checks are done (#478) @joepavitt
 - Don't 404 for admin users when accessing billing info (#479) @hardillb
 - Add option to use existing stack as a base to fill out the form (#477) @joepavitt
 - Add a $1 charge when setting up team billing (#476) @hardillb
 - docs for 0.4 (#475) @sammachin
 - Don't try and send negative project count to Stripe (#472) @hardillb
 - License expiry date incorrect (#471) @PLCMercenary
 - Reformat team name displays in confirmation dialogs (#474) @joepavitt
 - Only show the 'confirm additional charges' message if billing feature is enabled (#473) @joepavitt
 - frontend: Admin created users default to no team (#469) @ZJvandeWeg
 - made the team name block (#444) @fakoredeDamilola
 - added additional steps to setup dev environemnt (#470) @sammachin
 - Allow a project stack to be changed (#437) @knolleary
 - Add unit tests for team member/invite apis (#467) @knolleary
 - Update project automation (#462) @knolleary
 - Add requirement for price acknowledgement when creating project (#458) @joepavitt
 - Fix 404 in Stripe Billing callback for charge.failed (#456) @hardillb
 - Fix runtime compilation of vue components (#461) @knolleary
 - Update LocalFS install instructions (#432) @hardillb
 - Add dynamic page title via router-view meta data (#445) @joepavitt
 - Add in T&Cs options in Admin Panel (#443) @joepavitt
 - Use stripe id not the sequize id (#440) @hardillb
 - add link to Cloud to index (#441) @sammachin
 - Proper fix for project billing metadata (#436) @hardillb
 - Ensure async billing call errors are handled (#433) @knolleary
 - Add support for Environment Variables in Project Templates (#426) @knolleary
 - Add project meta data to the Subscription (#425) @hardillb
 - add docs for ff.cloud & billing (#374) @sammachin
 - Fix verbose logging from auth routes (#418) @hardillb
 - Fix displaying current bill status (#417) @hardillb
 - Fix existing team billing setup (#415) @hardillb
 - Include forge-ui-components in Setup app (#412) @joepavitt
 - Add nyc for code coverage reporting (#400) @knolleary
 - Add ui-components to dev:local task (#410) @knolleary
 - Fix cancel/create button alignment on Create Template page (#408) @joepavitt
 - Fix dev:local task to setup nr-launcher symlinks (#403) @knolleary
 - Add tests for the Storage API (#401) @hardillb
 - Add docs about setting up local build. (#399) @hardillb
 - Update eslint rules to include .vue files in build. (#396) @joepavitt
 - Switch <button> and <input type="text"/> elements to use forge-ui-components (#395) @joepavitt
 - Install stack script (#389) @hardillb
 - Set up local development (#388) @hardillb
 - 362 vue linting (#386) @joepavitt


#### 0.3.0: Release

 - Round down to whole seconds (#375) @hardillb
 - Add Validation to project names (#350) @hardillb
 - Add stack/template info to docs (#369) @knolleary
 - Fix getter for Project.url (#373) @hardillb
 - Add id column (styled subtly as to not distract) (#367) @joepavitt
 - Update license to cover EE components (#368) @knolleary
 - Implement password reset (#365) @hardillb
 - Add production license keys (#364) @knolleary
 - Link button to the teamApi removeteamInvitation method (#361) @joepavitt
 - Introduce Project Templates (#352) @knolleary
 - Update link params for Team object (#360) @joepavitt
 - Fix migrations with PostgreSQL (#358) @hardillb
 - 347 block project rename (#356) @joepavitt
 - Frontend Billing (#346) @joepavitt
 - Backend billing (#332) @hardillb
 - Add initial Project Stacks (#326) @knolleary
 - Allow logging level to be changed (#344) @hardillb
 - Signup flows (#336) @knolleary
 - Do proper check for valid invite on user registration (#335) @knolleary
 - default to "overview" of navigated to team. (#329) @joepavitt
 - Implement Container driver wrapper (#327) @hardillb
 - update favicon to match website (#328) @joepavitt
 - Update package-lock.json (#321) @hardillb
 - Automate npm publish on release (#322) @hardillb
 - Add instructions to upgrade from v0.1.0 to v0.2.0 (#320) @hardillb

#### 0.2.0: Release

 - Email Docs (#205)
 - Add host to config (#311) @knolleary
 - Update telemetry option wording & add std forge-link class (#304) @joepavitt
 - Update docs for telemetry feature (#303) @knolleary
 - Restore import following merge (#302) @knolleary
 - Fix path in installer zip (#293) @hardillb
 - Allow Admin to view all projects even if not a member (#297) @hardillb
 - Auto-accept pending invites when registering to the platform (#301) @knolleary
 - fix slug issue (#284) @sammachin
 - Fix 403 for node admin users creating projects (#292) @hardillb
 - Add link to project to download (#290) @hardillb
 - Docker docs (#265) @hardillb
 - Remove "itchy" from adjectives list (#276) @hardillb
 - Tidy up test close calls (#283) @knolleary
 - Add container driver shutdown hook (#281) @hardillb
 - Ensure tests close the app after each test to prevent hangs (#282) @knolleary
 - Add telemetry metrics component (#274) @knolleary
 - Fix startup error with uninitialised config (#267) @knolleary
 - Add migration framework for database (#263) @knolleary
 - Remove console.log from the storage library route (#262) @hardillb
 - Force teamId/ProjectId to a string (#261) @hardillb
 - Fix missing () on end of toString (#259) @hardillb
 - Update various deps to latest (#258) @knolleary
 - Fix build.yml to run a code build before test (#257) @knolleary
 - Refactor forge entry point to make it testable (#255) @knolleary
 - Allow changing the from address (#256) @hardillb
 - First pass at SES support (#254) @hardillb
 - Move initialisation of instanceId and add cookieSecret (#249) @knolleary
 - Move stub driver out of node_modules (#248) @knolleary
 - Introduce eslint standard and tidy up forge code base (#244) @knolleary
 - Check NodeJS version and log FF version (#243) @hardillb
 - Add engines section to package.json (#228) @hardillb
 - Add project automation workflow (#230) @knolleary
 - Update issues templates (#206) @knolleary
 - Fix install instructions (#201) @hardillb
