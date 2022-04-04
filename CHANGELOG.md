#### 0.3.5: Maintenance Release

 - Use the correct ID when updating billing metadata (#) @hardillb

#### 0.3.4: Maintenance Release

 - Backport project billing metadata fix (#435) @hardillb

#### 0.3.3: Maintenance Release

 - Fix viewing of bill for Team owners (#417) @hardillb

#### 0.3.2: Maintenance Release

 - Fix setup of billing for existing project (#414) @hardillb

#### 0.3.1: Maintenance Release
 
 - Fix broken storage routes (creds/sessions) (#402) @hardillb

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
