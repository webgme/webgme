# Change Log

## [v2.9.0](https://github.com/webgme/webgme/tree/v2.9.0) (2017-01-16)
[Full Changelog](https://github.com/webgme/webgme/compare/v2.8.0...v2.9.0)

**Implemented enhancements:**

- Add option to copy exported models to clipboard and tab in import accepting link [\#1276](https://github.com/webgme/webgme/issues/1276)
- Webgme doesn't work with node v7  [\#1273](https://github.com/webgme/webgme/issues/1273)
- auto slider showing results when plugin finished [\#1271](https://github.com/webgme/webgme/issues/1271)
- Provide mechanism for plugin to load/query the model before displaying config to user [\#945](https://github.com/webgme/webgme/issues/945)
- Add option to point to a custom plugin configurator [\#1298](https://github.com/webgme/webgme/pull/1298) ([pmeijer](https://github.com/pmeijer))
- Upgrading seeds so they use the latest data format. [\#1292](https://github.com/webgme/webgme/pull/1292) ([kecso](https://github.com/kecso))
- gmeAuth dispatches events when creating/deleting users or organizations. [\#1287](https://github.com/webgme/webgme/pull/1287) ([pmeijer](https://github.com/pmeijer))
- Drag-n-Drop onto designer items adds drag-items to set. [\#1286](https://github.com/webgme/webgme/pull/1286) ([kecso](https://github.com/kecso))
- Support copy to clipboard at model export [\#1283](https://github.com/webgme/webgme/pull/1283) ([kecso](https://github.com/kecso))
- Make project creation and opening race free [\#1282](https://github.com/webgme/webgme/pull/1282) ([pmeijer](https://github.com/pmeijer))
- Bump year to 2017 [\#1280](https://github.com/webgme/webgme/pull/1280) ([pmeijer](https://github.com/pmeijer))
- Fixes \#1271 Show clickable notification when plugin finishes [\#1279](https://github.com/webgme/webgme/pull/1279) ([pmeijer](https://github.com/pmeijer))
- Upgrade mongodb to 2.2.19 Fixes \#1273 [\#1274](https://github.com/webgme/webgme/pull/1274) ([pmeijer](https://github.com/pmeijer))

**Fixed bugs:**

- Inverse overlay in cache can get mutated at changes [\#1295](https://github.com/webgme/webgme/issues/1295)
- client saveRoot throws exception if core available but root node is not [\#1294](https://github.com/webgme/webgme/issues/1294)
- Branch event received after closed branch in storage throws exception [\#1290](https://github.com/webgme/webgme/issues/1290)
- Uncaught exception in ConnectionRouteManager3 [\#1289](https://github.com/webgme/webgme/issues/1289)
- Uncaught exception at noMoreCommitsToDisplay in ProjectRepositoryWidget [\#1288](https://github.com/webgme/webgme/issues/1288)
- Some links in generated documentation is broken [\#1277](https://github.com/webgme/webgme/issues/1277)
- Set- and CrosscutEditor crashes at new selection if no set available. [\#1275](https://github.com/webgme/webgme/issues/1275)
- SaveToDisk failing w/ blob url [\#1272](https://github.com/webgme/webgme/issues/1272)
- Exporting model fails with error about aspect sets missing a base [\#1269](https://github.com/webgme/webgme/issues/1269)
- Active selection state not updated in read-only or multi-select mode from ModelEditor [\#1268](https://github.com/webgme/webgme/issues/1268)
- Fixes bug that not allowed drop if the node had only sets defined. [\#1300](https://github.com/webgme/webgme/pull/1300) ([kecso](https://github.com/kecso))
- Fixes \#1295 Inverse overlay in cache can get mutated at changes [\#1297](https://github.com/webgme/webgme/pull/1297) ([kecso](https://github.com/kecso))
- Fixes \#1294 saveRoot exception when rootnode not loaded. [\#1296](https://github.com/webgme/webgme/pull/1296) ([pmeijer](https://github.com/pmeijer))
- Fixes \#1288 \#1289 \#1290 Minor uncaught exceptions in the UI [\#1293](https://github.com/webgme/webgme/pull/1293) ([pmeijer](https://github.com/pmeijer))
- Fixes \#1277 Some links in generated documentation is broken [\#1285](https://github.com/webgme/webgme/pull/1285) ([kecso](https://github.com/kecso))
- Fixes \#1268 Multi-select and read-only updates state correctly [\#1284](https://github.com/webgme/webgme/pull/1284) ([pmeijer](https://github.com/pmeijer))
- Do not publish the test files on npm \(reduces size by 20Mb\). [\#1281](https://github.com/webgme/webgme/pull/1281) ([pmeijer](https://github.com/pmeijer))
- Closes \#1275 Exception when no tabs in Set- and CrossCutEditor [\#1278](https://github.com/webgme/webgme/pull/1278) ([pmeijer](https://github.com/pmeijer))
- Fixes \#1269 - Exporting model fails with error about aspect sets missing a base [\#1270](https://github.com/webgme/webgme/pull/1270) ([kecso](https://github.com/kecso))

**Closed issues:**

- node not deleting using the `client` [\#1122](https://github.com/webgme/webgme/issues/1122)

## [v2.8.0](https://github.com/webgme/webgme/tree/v2.8.0) (2016-12-20)
[Full Changelog](https://github.com/webgme/webgme/compare/v2.7.1...v2.8.0)

**Implemented enhancements:**

- Provide Additional Promise versions for methods [\#1259](https://github.com/webgme/webgme/issues/1259)
- Fail gracefully when can't find asset [\#1255](https://github.com/webgme/webgme/issues/1255)
- Multiple locations added to browser history per one user action [\#1226](https://github.com/webgme/webgme/issues/1226)
- Naming a pointer 'base' is not allowed [\#892](https://github.com/webgme/webgme/issues/892)
- Use a different template for the generated source code documentation [\#1264](https://github.com/webgme/webgme/pull/1264) ([kecso](https://github.com/kecso))
- Add support for custom commit-badges and footer-widgets. [\#1261](https://github.com/webgme/webgme/pull/1261) ([pmeijer](https://github.com/pmeijer))
- Better error handling in core [\#1260](https://github.com/webgme/webgme/pull/1260) ([kecso](https://github.com/kecso))
- Closes \#1255 gracefully handle hash-like attributes during export [\#1257](https://github.com/webgme/webgme/pull/1257) ([pmeijer](https://github.com/pmeijer))
- Option to enable automatic error reports on uncaught execptions using sentry.io/raven-js [\#1256](https://github.com/webgme/webgme/pull/1256) ([pmeijer](https://github.com/pmeijer))
- Add helper method on PluginBase for preloading nodes. [\#1254](https://github.com/webgme/webgme/pull/1254) ([pmeijer](https://github.com/pmeijer))
- Better state-handling and fix selection manager from trigger multiple events. [\#1253](https://github.com/webgme/webgme/pull/1253) ([pmeijer](https://github.com/pmeijer))
- Fixes \#892 add better feedback and better handling of invalidly named pointers/sets [\#1231](https://github.com/webgme/webgme/pull/1231) ([pmeijer](https://github.com/pmeijer))

**Fixed bugs:**

- Fixes for v2.8.0 release [\#1267](https://github.com/webgme/webgme/pull/1267) ([pmeijer](https://github.com/pmeijer))

**Closed issues:**

- Add optional parameters when updating the webgme ui state in the StateManager. [\#1252](https://github.com/webgme/webgme/issues/1252)

**Merged pull requests:**

- Migrate executor-worker to own repository [\#1265](https://github.com/webgme/webgme/pull/1265) ([pmeijer](https://github.com/pmeijer))
- Provide entrypoint for checking consistency of meta-model. [\#1258](https://github.com/webgme/webgme/pull/1258) ([pmeijer](https://github.com/pmeijer))

## [v2.7.1](https://github.com/webgme/webgme/tree/v2.7.1) (2016-11-28)
[Full Changelog](https://github.com/webgme/webgme/compare/v2.7.0...v2.7.1)

**Fixed bugs:**

- client.copyNode should return new node id [\#1250](https://github.com/webgme/webgme/issues/1250)
- Cardinality check w.r.t. set members is off by one. [\#1247](https://github.com/webgme/webgme/issues/1247)
- Adjusted client.copyNode to return nodeId. Fixes \#1250 [\#1251](https://github.com/webgme/webgme/pull/1251) ([brollb](https://github.com/brollb))
- Fixes SetEditor exception, cardinality check and way to remove invalid sets. [\#1248](https://github.com/webgme/webgme/pull/1248) ([pmeijer](https://github.com/pmeijer))

**Closed issues:**

- Provide bin script for safely cleaning up blob storage. [\#1237](https://github.com/webgme/webgme/issues/1237)

**Merged pull requests:**

- blob-fs-clean-up script [\#1249](https://github.com/webgme/webgme/pull/1249) ([kecso](https://github.com/kecso))

## [v2.7.0](https://github.com/webgme/webgme/tree/v2.7.0) (2016-11-22)
[Full Changelog](https://github.com/webgme/webgme/compare/v2.6.3...v2.7.0)

**Implemented enhancements:**

- Provide path for updating projects coming from different deployments. [\#1240](https://github.com/webgme/webgme/issues/1240)
- Add core methods for accessing set registries and attributes. [\#1227](https://github.com/webgme/webgme/issues/1227)
- Increase test-coverage of simple worker methods and improve error-handling [\#1244](https://github.com/webgme/webgme/pull/1244) ([pmeijer](https://github.com/pmeijer))
- Harmonize dialogs and provide base class [\#1242](https://github.com/webgme/webgme/pull/1242) ([pmeijer](https://github.com/pmeijer))
- Add line preferences to PropertyEditor [\#1238](https://github.com/webgme/webgme/pull/1238) ([kecso](https://github.com/kecso))
- Providing the color/text\_color/border\_color registry entries in the property editor [\#1233](https://github.com/webgme/webgme/pull/1233) ([kecso](https://github.com/kecso))

**Fixed bugs:**

- Importing Models fails due to reverse relations stored in reverse-overlay. [\#1241](https://github.com/webgme/webgme/issues/1241)
- Files from branch status widget and network status widget are not automatically downloaded. [\#1235](https://github.com/webgme/webgme/issues/1235)
- Server crash on "Too many files open" [\#1234](https://github.com/webgme/webgme/issues/1234)
- Getting setMemberAttributes/Registries excludes properties that shouldn't be excluded. [\#1228](https://github.com/webgme/webgme/issues/1228)
- Closes \#1235 Download file from browser issue and fixes style and minor bugs before release. [\#1246](https://github.com/webgme/webgme/pull/1246) ([pmeijer](https://github.com/pmeijer))
- Closes \#1234 Make sure to close writeStream if readStream closed before writeStream. [\#1245](https://github.com/webgme/webgme/pull/1245) ([pmeijer](https://github.com/pmeijer))
- Fixes \#1241 Importing Models fails due to reverse relations stored in reverse-overlay. [\#1243](https://github.com/webgme/webgme/pull/1243) ([kecso](https://github.com/kecso))

**Closed issues:**

- Provide Document Nodes in META [\#903](https://github.com/webgme/webgme/issues/903)

**Merged pull requests:**

- Adds feature for squashing commits and importing a project as a new commit. [\#1230](https://github.com/webgme/webgme/pull/1230) ([kecso](https://github.com/kecso))
- Add support for documentation in MetaEditor, fixes \#903 and also \#1227 and \#1228 [\#1229](https://github.com/webgme/webgme/pull/1229) ([pmeijer](https://github.com/pmeijer))

## [v2.6.3](https://github.com/webgme/webgme/tree/v2.6.3) (2016-11-16)
[Full Changelog](https://github.com/webgme/webgme/compare/v2.6.2...v2.6.3)

**Fixed bugs:**

- Get rid of undefined before calculating hashes. [\#1239](https://github.com/webgme/webgme/pull/1239) ([pmeijer](https://github.com/pmeijer))

## [v2.6.2](https://github.com/webgme/webgme/tree/v2.6.2) (2016-11-15)
[Full Changelog](https://github.com/webgme/webgme/compare/v2.6.1...v2.6.2)

**Implemented enhancements:**

- Indent errors in eslint with fresh visualizer generation [\#1224](https://github.com/webgme/webgme/issues/1224)
- Removed extra space in Control template. Fixes \#1224 [\#1225](https://github.com/webgme/webgme/pull/1225) ([brollb](https://github.com/brollb))

**Fixed bugs:**

- Data conversion should not modify objects on storage level. [\#1236](https://github.com/webgme/webgme/pull/1236) ([pmeijer](https://github.com/pmeijer))
- Process the min\_relid\_length of parent of when inherited child modified. [\#1232](https://github.com/webgme/webgme/pull/1232) ([pmeijer](https://github.com/pmeijer))

## [v2.6.1](https://github.com/webgme/webgme/tree/v2.6.1) (2016-10-31)
[Full Changelog](https://github.com/webgme/webgme/compare/v2.6.0...v2.6.1)

**Implemented enhancements:**

- Use new client API functions [\#1217](https://github.com/webgme/webgme/pull/1217) ([pmeijer](https://github.com/pmeijer))

**Fixed bugs:**

- Starting the UI from SetEditor throws exception. [\#1222](https://github.com/webgme/webgme/issues/1222)
- incorrect active object change event [\#1063](https://github.com/webgme/webgme/issues/1063)
- Closes \#1222, \#1063 and various fixes for Set- and CrossCut-editor. [\#1223](https://github.com/webgme/webgme/pull/1223) ([pmeijer](https://github.com/pmeijer))

## [v2.6.0](https://github.com/webgme/webgme/tree/v2.6.0) (2016-10-24)
[Full Changelog](https://github.com/webgme/webgme/compare/v2.5.1...v2.6.0)

**Implemented enhancements:**

- Harmonize relid generation in core layers [\#1207](https://github.com/webgme/webgme/issues/1207)
- Enable webGME to run under systemd control [\#1205](https://github.com/webgme/webgme/issues/1205)
- API documentation should be created on prepublish [\#1197](https://github.com/webgme/webgme/issues/1197)
- Large file \(asset\) upload for plugins fails [\#1145](https://github.com/webgme/webgme/issues/1145)
- New connections in meta-editor are dashed which make it hard to distinguish between inheritance and mixins. [\#964](https://github.com/webgme/webgme/issues/964)
- Symmetric "Plug-in Architectural Programmer's Guide" and "Annotated Examples" [\#883](https://github.com/webgme/webgme/issues/883)
- Tutorials [\#117](https://github.com/webgme/webgme/issues/117)
- Client gme node getters api [\#1215](https://github.com/webgme/webgme/pull/1215) ([pmeijer](https://github.com/pmeijer))
- Allow for upload of large blob files and give progress feed-back on UI. [\#1213](https://github.com/webgme/webgme/pull/1213) ([pmeijer](https://github.com/pmeijer))
- Collect instances [\#1212](https://github.com/webgme/webgme/pull/1212) ([kecso](https://github.com/kecso))
- Remove reverse overlay [\#1209](https://github.com/webgme/webgme/pull/1209) ([kecso](https://github.com/kecso))
- Closes \#1205 by adding optional server.handle to be passed from config. [\#1206](https://github.com/webgme/webgme/pull/1206) ([pmeijer](https://github.com/pmeijer))
- In setBase only keep children data that have common origin. [\#1202](https://github.com/webgme/webgme/pull/1202) ([pmeijer](https://github.com/pmeijer))
- Add generation of REST api docs to prepublish [\#1199](https://github.com/webgme/webgme/pull/1199) ([pmeijer](https://github.com/pmeijer))
- Meta editor should react on state changes w.r.t. tab and selection. [\#1195](https://github.com/webgme/webgme/pull/1195) ([pmeijer](https://github.com/pmeijer))

**Fixed bugs:**

- Error: tried to insert existing hash - the two objects were NOT equal [\#1218](https://github.com/webgme/webgme/issues/1218)
- Removing meta-sheet that's not active does not clear out the meta-rules [\#1198](https://github.com/webgme/webgme/issues/1198)
- Server start crashes on Mac w/ node v6.2.0 [\#1196](https://github.com/webgme/webgme/issues/1196)
- Standardized export file name [\#1189](https://github.com/webgme/webgme/issues/1189)
- Exception when setting pointer [\#975](https://github.com/webgme/webgme/issues/975)
- Fixes \#1218 Error: tried to insert existing hash - the two objects were NOT equal [\#1219](https://github.com/webgme/webgme/pull/1219) ([kecso](https://github.com/kecso))
- Fixes \#975 Exception when setting pointer [\#1216](https://github.com/webgme/webgme/pull/1216) ([kecso](https://github.com/kecso))
- Fixes \#1189 Standardized export file name [\#1214](https://github.com/webgme/webgme/pull/1214) ([kecso](https://github.com/kecso))
- Fix never ending loading of nodes in composition tree [\#1201](https://github.com/webgme/webgme/pull/1201) ([pmeijer](https://github.com/pmeijer))
- Closes \#1198 Hide delete-btn for non-active tabs. [\#1200](https://github.com/webgme/webgme/pull/1200) ([pmeijer](https://github.com/pmeijer))
- Clicking on anchors inside svgs triggers events now so they need to be removed [\#1193](https://github.com/webgme/webgme/pull/1193) ([pmeijer](https://github.com/pmeijer))

**Closed issues:**

- Unnecessary forking with automerge [\#1135](https://github.com/webgme/webgme/issues/1135)

**Merged pull requests:**

- Do not use raphael api to get length and bboxes for connections. [\#1211](https://github.com/webgme/webgme/pull/1211) ([pmeijer](https://github.com/pmeijer))
- Cache the computed relids in the core. [\#1208](https://github.com/webgme/webgme/pull/1208) ([pmeijer](https://github.com/pmeijer))
- Only compute data when needed in jump on crossings [\#1192](https://github.com/webgme/webgme/pull/1192) ([pmeijer](https://github.com/pmeijer))
- Reduce preloaded children from 2 to 1 in tree browser. [\#1191](https://github.com/webgme/webgme/pull/1191) ([pmeijer](https://github.com/pmeijer))
- Do not keep two sets of the nodes in the client and get rid of meta.js [\#1190](https://github.com/webgme/webgme/pull/1190) ([pmeijer](https://github.com/pmeijer))

## [v2.5.1](https://github.com/webgme/webgme/tree/v2.5.1) (2016-09-30)
[Full Changelog](https://github.com/webgme/webgme/compare/v2.5.0...v2.5.1)

**Implemented enhancements:**

- Loosen user-mangement version constraint [\#1188](https://github.com/webgme/webgme/pull/1188) ([pmeijer](https://github.com/pmeijer))
- Color meta nodes in trees [\#1187](https://github.com/webgme/webgme/pull/1187) ([pmeijer](https://github.com/pmeijer))

## [v2.5.0](https://github.com/webgme/webgme/tree/v2.5.0) (2016-09-27)
[Full Changelog](https://github.com/webgme/webgme/compare/v2.4.1...v2.5.0)

**Implemented enhancements:**

- Should be able to execute client side plugin while AHEAD [\#1162](https://github.com/webgme/webgme/issues/1162)
- Export Branch Progress Bar \(from tree browser export\) [\#1160](https://github.com/webgme/webgme/issues/1160)
- Should "Follow library" take you to the branch or commit? [\#1158](https://github.com/webgme/webgme/issues/1158)
- Generated router uses incorrect logger name [\#1147](https://github.com/webgme/webgme/issues/1147)
- Generate unit test file\(s\) for rest routers [\#1146](https://github.com/webgme/webgme/issues/1146)
- Enhanced base matching for model sharing. [\#1185](https://github.com/webgme/webgme/pull/1185) ([kecso](https://github.com/kecso))
- Do not only rely on clearOutput-timer when clearing output for a CANCELED job before restart. [\#1184](https://github.com/webgme/webgme/pull/1184) ([pmeijer](https://github.com/pmeijer))
- Prohibit and deal with invalid regexps for string attributes [\#1182](https://github.com/webgme/webgme/pull/1182) ([pmeijer](https://github.com/pmeijer))
- Group tree browser's context menu and add actions to inheritance and crosscut tree [\#1179](https://github.com/webgme/webgme/pull/1179) ([pmeijer](https://github.com/pmeijer))
- Improve visual feedback and control for invalid attribute values [\#1176](https://github.com/webgme/webgme/pull/1176) ([pmeijer](https://github.com/pmeijer))
- Expose grid layout buttons. Hide connection bumps. [\#1174](https://github.com/webgme/webgme/pull/1174) ([pmeijer](https://github.com/pmeijer))
- Update from file [\#1170](https://github.com/webgme/webgme/pull/1170) ([kecso](https://github.com/kecso))
- Added rest router unit test generation. Fixes \#1146 [\#1166](https://github.com/webgme/webgme/pull/1166) ([brollb](https://github.com/brollb))
- Closes \#1160 Progress notifications from tree browser exports [\#1164](https://github.com/webgme/webgme/pull/1164) ([pmeijer](https://github.com/pmeijer))
- Only check if AHEAD for server plugins. Fixes \#1162 [\#1163](https://github.com/webgme/webgme/pull/1163) ([brollb](https://github.com/brollb))
- Add feature to set connection label placement. [\#1159](https://github.com/webgme/webgme/pull/1159) ([pmeijer](https://github.com/pmeijer))
- Npm packages update [\#1154](https://github.com/webgme/webgme/pull/1154) ([pmeijer](https://github.com/pmeijer))
- Bump user-management page to 0.2.1. [\#1153](https://github.com/webgme/webgme/pull/1153) ([pmeijer](https://github.com/pmeijer))
- Publish bower\_components at npm. [\#1152](https://github.com/webgme/webgme/pull/1152) ([pmeijer](https://github.com/pmeijer))
- Order valid visualizers and create custom control for setting the value. [\#1150](https://github.com/webgme/webgme/pull/1150) ([pmeijer](https://github.com/pmeijer))
- Set logger to use provided router name. Fixes \#1147 [\#1148](https://github.com/webgme/webgme/pull/1148) ([brollb](https://github.com/brollb))

**Fixed bugs:**

- Meta rules checker does not account for mixed types [\#1171](https://github.com/webgme/webgme/issues/1171)
- You can move objects even though you're in read-only mode for checked out commits [\#1157](https://github.com/webgme/webgme/issues/1157)
- SplitPanel blocks certain mouse events, don't call event.stopPropagation\(\) [\#1151](https://github.com/webgme/webgme/issues/1151)
- Register active visualizer at panel switch in split panel view. [\#1183](https://github.com/webgme/webgme/pull/1183) ([pmeijer](https://github.com/pmeijer))
- Update download to disk since API changed in CRM3 [\#1181](https://github.com/webgme/webgme/pull/1181) ([pmeijer](https://github.com/pmeijer))
- Fixes for \#1177 relid collisions from base class [\#1180](https://github.com/webgme/webgme/pull/1180) ([pmeijer](https://github.com/pmeijer))
- Inherited child relation removal [\#1178](https://github.com/webgme/webgme/pull/1178) ([kecso](https://github.com/kecso))
- Fixes potential relid collisions when creating children in bases [\#1177](https://github.com/webgme/webgme/pull/1177) ([kecso](https://github.com/kecso))
- Fixes error in webgme.classes build due to missing chance. [\#1175](https://github.com/webgme/webgme/pull/1175) ([pmeijer](https://github.com/pmeijer))
- Closes \#1171 in meta-rules make sure to include mixins too. [\#1173](https://github.com/webgme/webgme/pull/1173) ([pmeijer](https://github.com/pmeijer))
- Nodes unloaded/loaded need to be potential updates too. [\#1172](https://github.com/webgme/webgme/pull/1172) ([pmeijer](https://github.com/pmeijer))
- Restrict the usage of pointers named member [\#1168](https://github.com/webgme/webgme/pull/1168) ([pmeijer](https://github.com/pmeijer))
- Closes \#1157 Respect read-only at commit in url [\#1165](https://github.com/webgme/webgme/pull/1165) ([pmeijer](https://github.com/pmeijer))
- Fixes \#1151 Allow the mousedown event to propagate from split panel [\#1156](https://github.com/webgme/webgme/pull/1156) ([pmeijer](https://github.com/pmeijer))

**Closed issues:**

- autoMerge fails: Maximum call stack exceeded [\#1117](https://github.com/webgme/webgme/issues/1117)

**Merged pull requests:**

- Share models [\#1167](https://github.com/webgme/webgme/pull/1167) ([kecso](https://github.com/kecso))
- Bower module updates [\#1155](https://github.com/webgme/webgme/pull/1155) ([pmeijer](https://github.com/pmeijer))
- Core performance enhancements [\#1149](https://github.com/webgme/webgme/pull/1149) ([pmeijer](https://github.com/pmeijer))

## [v2.4.1](https://github.com/webgme/webgme/tree/v2.4.1) (2016-09-01)
[Full Changelog](https://github.com/webgme/webgme/compare/v2.4.0...v2.4.1)

**Implemented enhancements:**

- "WebGME API API documentation" [\#1132](https://github.com/webgme/webgme/issues/1132)
- Clean up the docs folder [\#1128](https://github.com/webgme/webgme/issues/1128)
- UI should react to whether the current user can create or not \(project\) [\#1127](https://github.com/webgme/webgme/issues/1127)
- Notify user on reconnect on executor worker [\#1114](https://github.com/webgme/webgme/issues/1114)
- Log message when worker reconnects [\#1142](https://github.com/webgme/webgme/pull/1142) ([pmeijer](https://github.com/pmeijer))
- Fixes regarding project creation on UI, closes \#1127 and \#1138 [\#1140](https://github.com/webgme/webgme/pull/1140) ([pmeijer](https://github.com/pmeijer))
- Closes \#1128 and \#1132 and ensures that the source code docs are published on npm [\#1139](https://github.com/webgme/webgme/pull/1139) ([pmeijer](https://github.com/pmeijer))
- Add MIT License badge [\#1136](https://github.com/webgme/webgme/pull/1136) ([pmeijer](https://github.com/pmeijer))

**Fixed bugs:**

- Projects dialog does not block enter pressing when entered project collides with existing one. [\#1138](https://github.com/webgme/webgme/issues/1138)
- Relid collision with inherited children not check during create/copy/moveNode [\#1141](https://github.com/webgme/webgme/pull/1141) ([pmeijer](https://github.com/pmeijer))
- Fixes regarding project creation on UI, closes \\#1127 and \\#1138 [\#1140](https://github.com/webgme/webgme/pull/1140) ([pmeijer](https://github.com/pmeijer))
- Closes \\#1128 and \\#1132 and ensures that the source code docs are published on npm [\#1139](https://github.com/webgme/webgme/pull/1139) ([pmeijer](https://github.com/pmeijer))

**Closed issues:**

- getAttribute from rootNode fails [\#1131](https://github.com/webgme/webgme/issues/1131)
- Uncaught exception on executor [\#1110](https://github.com/webgme/webgme/issues/1110)

## [v2.4.0](https://github.com/webgme/webgme/tree/v2.4.0) (2016-08-29)
[Full Changelog](https://github.com/webgme/webgme/compare/v2.3.1...v2.4.0)

**Implemented enhancements:**

- Clicking "show more" in the project history sets scroll to top [\#1116](https://github.com/webgme/webgme/issues/1116)
- Speed up build [\#1094](https://github.com/webgme/webgme/issues/1094)
- Add methods to check for validity of new base and parent on the Core [\#1134](https://github.com/webgme/webgme/pull/1134) ([pmeijer](https://github.com/pmeijer))
- Closes \#1094 Requirejs build [\#1125](https://github.com/webgme/webgme/pull/1125) ([pmeijer](https://github.com/pmeijer))
- Fixes \#1116 Clicking "show more" in the project history sets scroll to top [\#1124](https://github.com/webgme/webgme/pull/1124) ([kecso](https://github.com/kecso))
- Add avatar in project-repository widget. [\#1091](https://github.com/webgme/webgme/pull/1091) ([pmeijer](https://github.com/pmeijer))
- Allow for safe deletion of users and organization [\#1090](https://github.com/webgme/webgme/pull/1090) ([pmeijer](https://github.com/pmeijer))

**Fixed bugs:**

- Moving node can create infinite loop inside core [\#1133](https://github.com/webgme/webgme/issues/1133)
- Error on import project [\#1119](https://github.com/webgme/webgme/issues/1119)
- Error in JsDoc on BlobClient [\#1113](https://github.com/webgme/webgme/issues/1113)
- Right clicking on loading project root \(in tree browser\) throws exception [\#1112](https://github.com/webgme/webgme/issues/1112)
- Missing JSDOC for BlobClient [\#1107](https://github.com/webgme/webgme/issues/1107)
- Importing project fails: "Error: Invalid argument, data.projectId is not a string.\(…\)" [\#1106](https://github.com/webgme/webgme/issues/1106)
- Running plugins fails on client [\#1104](https://github.com/webgme/webgme/issues/1104)
- Applying merge resolution results in ASSERT error. [\#1087](https://github.com/webgme/webgme/issues/1087)
- branch merge fails [\#1082](https://github.com/webgme/webgme/issues/1082)
- Add methods to check for validity of new base and parent on the Core [\#1134](https://github.com/webgme/webgme/pull/1134) ([pmeijer](https://github.com/pmeijer))
- Conflicting patch instruction handling [\#1130](https://github.com/webgme/webgme/pull/1130) ([kecso](https://github.com/kecso))
- Fixes \#1087 Applying merge resolution results in ASSERT error. [\#1129](https://github.com/webgme/webgme/pull/1129) ([kecso](https://github.com/kecso))
- Closes \#1112 non-empty context menu to avoid exception. [\#1126](https://github.com/webgme/webgme/pull/1126) ([pmeijer](https://github.com/pmeijer))
- Fixes \#1082 branch merge fails [\#1123](https://github.com/webgme/webgme/pull/1123) ([kecso](https://github.com/kecso))
- Fixes \#1106 Importing project fails: "Error: Invalid argument, data.projectId is not a string.\(…\)" [\#1118](https://github.com/webgme/webgme/pull/1118) ([kecso](https://github.com/kecso))
- Closes \#1104 Creating plugin error result fails on Client [\#1109](https://github.com/webgme/webgme/pull/1109) ([pmeijer](https://github.com/pmeijer))
- Closes \#1107 JSDOC generation of BlobClient [\#1108](https://github.com/webgme/webgme/pull/1108) ([pmeijer](https://github.com/pmeijer))

**Closed issues:**

- this.project.loadObject in plugin is not promise-friendly [\#1115](https://github.com/webgme/webgme/issues/1115)
- Error renders projects unuseable [\#1111](https://github.com/webgme/webgme/issues/1111)
- update library from seed [\#1105](https://github.com/webgme/webgme/issues/1105)
- Incorrect automerge resolution [\#1102](https://github.com/webgme/webgme/issues/1102)

## [v2.3.1](https://github.com/webgme/webgme/tree/v2.3.1) (2016-08-10)
[Full Changelog](https://github.com/webgme/webgme/compare/v2.3.0...v2.3.1)

**Implemented enhancements:**

- Document decorator should display icon in part-browser [\#1088](https://github.com/webgme/webgme/issues/1088)
- Update user-management-page to 0.2.1 [\#1100](https://github.com/webgme/webgme/pull/1100) ([pmeijer](https://github.com/pmeijer))
- \#1088 Display svg in PartBrowser for DocumentDecorator. [\#1099](https://github.com/webgme/webgme/pull/1099) ([pmeijer](https://github.com/pmeijer))

**Fixed bugs:**

- Extra \n in stdout logs [\#1093](https://github.com/webgme/webgme/issues/1093)
- Server crash [\#1092](https://github.com/webgme/webgme/issues/1092)
- Update user-management-page to 0.2.1 [\#1100](https://github.com/webgme/webgme/pull/1100) ([pmeijer](https://github.com/pmeijer))
- Closes \#1093 Remove trailing newlines in output. [\#1098](https://github.com/webgme/webgme/pull/1098) ([pmeijer](https://github.com/pmeijer))
- Closes \#1092 Server crashes when wrong panel path sent. [\#1097](https://github.com/webgme/webgme/pull/1097) ([pmeijer](https://github.com/pmeijer))

**Closed issues:**

- Arrays of requirejsPaths not handled correctly when requested from the client. [\#1096](https://github.com/webgme/webgme/issues/1096)

## [v2.3.0](https://github.com/webgme/webgme/tree/v2.3.0) (2016-08-01)
[Full Changelog](https://github.com/webgme/webgme/compare/v2.2.1...v2.3.0)

**Implemented enhancements:**

- detect originating webgme url from executor script [\#1085](https://github.com/webgme/webgme/issues/1085)
- ExecutorClient should default httpsecure to false on node [\#1069](https://github.com/webgme/webgme/issues/1069)
- Generated Viz `selectedObjChange` refactor [\#1011](https://github.com/webgme/webgme/issues/1011)
- SVG Decorator should support the drop action for pointer setting like the default decorator does. [\#954](https://github.com/webgme/webgme/issues/954)
- Added ORIGIN\_URL env on ExecutorWorker creation. Fixes \#1085 [\#1086](https://github.com/webgme/webgme/pull/1086) ([brollb](https://github.com/brollb))
- User-management-page v0.2.0 [\#1083](https://github.com/webgme/webgme/pull/1083) ([pmeijer](https://github.com/pmeijer))
- Remove hound config [\#1078](https://github.com/webgme/webgme/pull/1078) ([pmeijer](https://github.com/pmeijer))
- Fixed viz template code style issues. [\#1072](https://github.com/webgme/webgme/pull/1072) ([brollb](https://github.com/brollb))
- Added default value for httpsecure in executor client. Fixes \#1069 [\#1070](https://github.com/webgme/webgme/pull/1070) ([brollb](https://github.com/brollb))
- Add option of sending plugin notifications to the branch-room. [\#1060](https://github.com/webgme/webgme/pull/1060) ([pmeijer](https://github.com/pmeijer))

**Fixed bugs:**

- Seed Project from Branch always copies "master" branch [\#1076](https://github.com/webgme/webgme/issues/1076)
- cached executor job gives incorrect outputNumber/stdout [\#1073](https://github.com/webgme/webgme/issues/1073)
- BlobClient getArtifact promise "callback is not a function" [\#1067](https://github.com/webgme/webgme/issues/1067)
- Error on artifact.save\(\) [\#1064](https://github.com/webgme/webgme/issues/1064)
- Issue/merge [\#1080](https://github.com/webgme/webgme/pull/1080) ([kecso](https://github.com/kecso))
- Respect the seedCommit parameter in seedProject [\#1079](https://github.com/webgme/webgme/pull/1079) ([pmeijer](https://github.com/pmeijer))
- Make sure to handle arrays in config.requirejsPaths [\#1074](https://github.com/webgme/webgme/pull/1074) ([pmeijer](https://github.com/pmeijer))
- Fixed getArtifact promise error handling. Fixes \#1067 [\#1068](https://github.com/webgme/webgme/pull/1068) ([brollb](https://github.com/brollb))
- Closes \#1064 do not set the Content-Length from blob client when running in the browser [\#1065](https://github.com/webgme/webgme/pull/1065) ([pmeijer](https://github.com/pmeijer))

**Closed issues:**

- postinstall fails [\#1081](https://github.com/webgme/webgme/issues/1081)
- executor worker should use streaming unzip [\#1066](https://github.com/webgme/webgme/issues/1066)
- Failed branch export fails silently [\#1039](https://github.com/webgme/webgme/issues/1039)
- Provide TypeScript Description Files for Core API [\#1016](https://github.com/webgme/webgme/issues/1016)
- Extend containment concept [\#940](https://github.com/webgme/webgme/issues/940)
- Stop executor jobs [\#1071](https://github.com/webgme/webgme/issues/1071)

**Merged pull requests:**

- Model templates [\#1084](https://github.com/webgme/webgme/pull/1084) ([pmeijer](https://github.com/pmeijer))
- Executor cancel implemented Closes \#1071 and \#1073 [\#1077](https://github.com/webgme/webgme/pull/1077) ([pmeijer](https://github.com/pmeijer))
- Auto merge when making commits [\#1075](https://github.com/webgme/webgme/pull/1075) ([pmeijer](https://github.com/pmeijer))
- Bin script for executing plugins on commits to models [\#1057](https://github.com/webgme/webgme/pull/1057) ([pmeijer](https://github.com/pmeijer))

## [v2.2.1](https://github.com/webgme/webgme/tree/v2.2.1) (2016-07-18)
[Full Changelog](https://github.com/webgme/webgme/compare/v2.2.0...v2.2.1)

**Implemented enhancements:**

- Add missing rest api call for transfer projects [\#1062](https://github.com/webgme/webgme/pull/1062) ([patrickkerrypei](https://github.com/patrickkerrypei))
- Use core.traverse in bin storage\_stats.js [\#1055](https://github.com/webgme/webgme/pull/1055) ([pmeijer](https://github.com/pmeijer))

**Fixed bugs:**

- Aspects are not saved properly in meta editor. [\#1056](https://github.com/webgme/webgme/issues/1056)
- Run plugin doesn't respects user parameter [\#1051](https://github.com/webgme/webgme/issues/1051)
- Error when merging branches - GUID Mismatch  [\#1033](https://github.com/webgme/webgme/issues/1033)
- Get api/users should return same user structure as /user and /users/:username. [\#1059](https://github.com/webgme/webgme/pull/1059) ([pmeijer](https://github.com/pmeijer))
- Fixes \#1056 pass correct params when saving spects in MetaDecorator [\#1058](https://github.com/webgme/webgme/pull/1058) ([pmeijer](https://github.com/pmeijer))
- Fixes \#1033 Error when merging branches - GUID Mismatch [\#1054](https://github.com/webgme/webgme/pull/1054) ([kecso](https://github.com/kecso))
- Fixes \#1051 Run plugin doesn't respects user parameter [\#1052](https://github.com/webgme/webgme/pull/1052) ([kecso](https://github.com/kecso))

## [v2.2.0](https://github.com/webgme/webgme/tree/v2.2.0) (2016-07-04)
[Full Changelog](https://github.com/webgme/webgme/compare/v2.1.0...v2.2.0)

**Implemented enhancements:**

- Project history empty if no branches [\#1026](https://github.com/webgme/webgme/issues/1026)
- Update header if no auth enabled [\#1021](https://github.com/webgme/webgme/issues/1021)
- Footer viz refactor [\#1020](https://github.com/webgme/webgme/issues/1020)
- Visual feedback on merge [\#1017](https://github.com/webgme/webgme/issues/1017)
- Setting 'layout' in url params is lost on page load [\#1006](https://github.com/webgme/webgme/issues/1006)
- Config and CHANGELOG documentation for v2.2.0 [\#1050](https://github.com/webgme/webgme/pull/1050) ([pmeijer](https://github.com/pmeijer))
- Generator for rest router [\#1047](https://github.com/webgme/webgme/pull/1047) ([pmeijer](https://github.com/pmeijer))
- Webhook events [\#1045](https://github.com/webgme/webgme/pull/1045) ([pmeijer](https://github.com/pmeijer))
- Plugin fast forward [\#1044](https://github.com/webgme/webgme/pull/1044) ([pmeijer](https://github.com/pmeijer))
- Closes \#1006 Store layout in state. [\#1040](https://github.com/webgme/webgme/pull/1040) ([pmeijer](https://github.com/pmeijer))
- Show progress bar for potentially heavy tasks closes \#1017 [\#1029](https://github.com/webgme/webgme/pull/1029) ([pmeijer](https://github.com/pmeijer))
- Refactored Footer \(createCredits, createWidgets\). Fixes \#1020 [\#1027](https://github.com/webgme/webgme/pull/1027) ([brollb](https://github.com/brollb))
- Minor fixes in the REST API. [\#1023](https://github.com/webgme/webgme/pull/1023) ([pmeijer](https://github.com/pmeijer))
- Closes \#1021 Only display project name when auth disabled. [\#1022](https://github.com/webgme/webgme/pull/1022) ([pmeijer](https://github.com/pmeijer))
- Traverse function have been implemented. [\#1019](https://github.com/webgme/webgme/pull/1019) ([kecso](https://github.com/kecso))

**Fixed bugs:**

- Server error when creating duplicate project [\#1036](https://github.com/webgme/webgme/issues/1036)
- "Couldn't download the latest Root CAs" on worker start [\#1030](https://github.com/webgme/webgme/issues/1030)
- mixin node from library not loaded [\#1028](https://github.com/webgme/webgme/issues/1028)
- Double click to open project throws errors [\#1015](https://github.com/webgme/webgme/issues/1015)
- typo in generated plugin code [\#1013](https://github.com/webgme/webgme/issues/1013)
- Generated plugin tests failing [\#1003](https://github.com/webgme/webgme/issues/1003)
- Moving programmatically created meta nodes causes error [\#973](https://github.com/webgme/webgme/issues/973)
- Call correct ModelDecoratorPartBrowserWidget method in generated decorator. [\#1049](https://github.com/webgme/webgme/pull/1049) ([pmeijer](https://github.com/pmeijer))
- Fixes \#1015 Prohibit multiple openings of a project. [\#1048](https://github.com/webgme/webgme/pull/1048) ([pmeijer](https://github.com/pmeijer))
- Creating org with name collision should return 400 [\#1046](https://github.com/webgme/webgme/pull/1046) ([pmeijer](https://github.com/pmeijer))
- Closes \#1036 Pass correct params when duplicating project. [\#1041](https://github.com/webgme/webgme/pull/1041) ([pmeijer](https://github.com/pmeijer))
- Fixes \#1028 mixin node from library not loaded [\#1035](https://github.com/webgme/webgme/pull/1035) ([kecso](https://github.com/kecso))
- Make it configurable to download latest ssl certs in executor worker. [\#1032](https://github.com/webgme/webgme/pull/1032) ([pmeijer](https://github.com/pmeijer))
- \#973 Always update position if none given. [\#1025](https://github.com/webgme/webgme/pull/1025) ([pmeijer](https://github.com/pmeijer))
- Fixed typo in plugin template. Fixes \#1013 [\#1014](https://github.com/webgme/webgme/pull/1014) ([brollb](https://github.com/brollb))

**Closed issues:**

- Client error on duplicating project [\#1042](https://github.com/webgme/webgme/issues/1042)
- Exporting branch incorrectly grabs assets from blob [\#1037](https://github.com/webgme/webgme/issues/1037)
- InterpreterManager fails after uncaught exception [\#1024](https://github.com/webgme/webgme/issues/1024)
- "Error: object does not exist" when deleting node [\#1018](https://github.com/webgme/webgme/issues/1018)

**Merged pull requests:**

- Add in user-management-page for dealing with users. [\#1043](https://github.com/webgme/webgme/pull/1043) ([pmeijer](https://github.com/pmeijer))
- Test fixes \(again\) [\#1034](https://github.com/webgme/webgme/pull/1034) ([pmeijer](https://github.com/pmeijer))
- Webhook feature [\#1031](https://github.com/webgme/webgme/pull/1031) ([kecso](https://github.com/kecso))

## [v2.1.0](https://github.com/webgme/webgme/tree/v2.1.0) (2016-06-06)
[Full Changelog](https://github.com/webgme/webgme/compare/v2.0.1...v2.1.0)

**Implemented enhancements:**

- Error report should include the UI state if WebGMEGlobal is available. [\#1001](https://github.com/webgme/webgme/issues/1001)
- Make project authorization \(read, write, delete, create\) a replaceable module. [\#1010](https://github.com/webgme/webgme/pull/1010) ([pmeijer](https://github.com/pmeijer))
- Fix appveyor failures [\#1005](https://github.com/webgme/webgme/pull/1005) ([pmeijer](https://github.com/pmeijer))
- Fixed dockerfile so it builds and runs the default configuration [\#998](https://github.com/webgme/webgme/pull/998) ([kecso](https://github.com/kecso))

**Fixed bugs:**

- Running plugin on server ignores namespace [\#1008](https://github.com/webgme/webgme/issues/1008)
- Library update fails with "object does not exist" [\#1007](https://github.com/webgme/webgme/issues/1007)
- Fixes \#1007 Library update fails with "object does not exist". [\#1012](https://github.com/webgme/webgme/pull/1012) ([kecso](https://github.com/kecso))
- Closes \#1008 bug plugin namespace server [\#1009](https://github.com/webgme/webgme/pull/1009) ([pmeijer](https://github.com/pmeijer))
- Fixed seed ext and node id. Fixes \#1003 [\#1004](https://github.com/webgme/webgme/pull/1004) ([brollb](https://github.com/brollb))

**Merged pull requests:**

- Feature display connected users [\#1002](https://github.com/webgme/webgme/pull/1002) ([pmeijer](https://github.com/pmeijer))

## [v2.0.1](https://github.com/webgme/webgme/tree/v2.0.1) (2016-05-23)
[Full Changelog](https://github.com/webgme/webgme/compare/v2.0.0...v2.0.1)

**Implemented enhancements:**

- Do not hide and show the nav btn \(use disable/enable\) [\#999](https://github.com/webgme/webgme/pull/999) ([pmeijer](https://github.com/pmeijer))
- Remove left out only in test. [\#992](https://github.com/webgme/webgme/pull/992) ([pmeijer](https://github.com/pmeijer))

**Fixed bugs:**

- Containment cardinality check in PartBrowser is not refreshed on changes in Meta. [\#994](https://github.com/webgme/webgme/issues/994)
- Library Update fails if there were a removal in the library [\#993](https://github.com/webgme/webgme/issues/993)
- Delete webgme-token before emitting notification. [\#1000](https://github.com/webgme/webgme/pull/1000) ([pmeijer](https://github.com/pmeijer))
- Fixes \#994 Containment cardinality check in PartBrowser is not refreshed on changes in Meta. [\#996](https://github.com/webgme/webgme/pull/996) ([kecso](https://github.com/kecso))
- Fixes \#993 Library Update fails if there were a removal in the library [\#995](https://github.com/webgme/webgme/pull/995) ([kecso](https://github.com/kecso))

**Closed issues:**

- Minor - Correcting link to API documentation in README [\#997](https://github.com/webgme/webgme/issues/997)

## [v2.0.0](https://github.com/webgme/webgme/tree/v2.0.0) (2016-05-06)
[Full Changelog](https://github.com/webgme/webgme/compare/v1.7.2...v2.0.0)

**Implemented enhancements:**

- Seeding from existing project loses library info [\#970](https://github.com/webgme/webgme/issues/970)
- Better feedback when trying to edit/add a constraint to a library node. [\#955](https://github.com/webgme/webgme/issues/955)
- Provide a legitimate save/load mechanism [\#895](https://github.com/webgme/webgme/issues/895)
- Remove old serialization [\#991](https://github.com/webgme/webgme/pull/991) ([pmeijer](https://github.com/pmeijer))
- Provide look-up of selected namespace in plugin-config. [\#989](https://github.com/webgme/webgme/pull/989) ([pmeijer](https://github.com/pmeijer))
- Continuous integration tests now use node version 4.x and 6.x [\#988](https://github.com/webgme/webgme/pull/988) ([pmeijer](https://github.com/pmeijer))
- Fixes \#970 Seeding from existing project loses library info [\#986](https://github.com/webgme/webgme/pull/986) ([kecso](https://github.com/kecso))
- Implemented namespace selector and name-only type list in part-browser [\#985](https://github.com/webgme/webgme/pull/985) ([kecso](https://github.com/kecso))
- Plugin execution [\#980](https://github.com/webgme/webgme/pull/980) ([pmeijer](https://github.com/pmeijer))
- Client build cont [\#960](https://github.com/webgme/webgme/pull/960) ([pmeijer](https://github.com/pmeijer))

**Fixed bugs:**

- Gathering collection information for a node inside a complex instantiation crashes the core [\#982](https://github.com/webgme/webgme/issues/982)
- Connection Not Redrawn [\#969](https://github.com/webgme/webgme/issues/969)
- Adding and removing library node to main meta sheet removes the node from the global meta. [\#963](https://github.com/webgme/webgme/issues/963)
- Closes \#969 redraw canvas on connection changes [\#990](https://github.com/webgme/webgme/pull/990) ([pmeijer](https://github.com/pmeijer))
- Fixes \#963 Adding and removing library node to main meta sheet removes the node from the global meta. [\#987](https://github.com/webgme/webgme/pull/987) ([kecso](https://github.com/kecso))
- Fixes \#982 Gathering collection information for a node inside a complex instantiation crashes the core [\#983](https://github.com/webgme/webgme/pull/983) ([kecso](https://github.com/kecso))
- Fix for panels not being resizable when using distribution. [\#967](https://github.com/webgme/webgme/pull/967) ([pmeijer](https://github.com/pmeijer))

**Closed issues:**

- Don't prerequire all modules in \_globals [\#653](https://github.com/webgme/webgme/issues/653)

**Merged pull requests:**

- Bin script for generating statistics about projects and their mongodb collections. [\#984](https://github.com/webgme/webgme/pull/984) ([pmeijer](https://github.com/pmeijer))
- Lazy load modules in \_globals and webgme, closes \#653 [\#981](https://github.com/webgme/webgme/pull/981) ([pmeijer](https://github.com/pmeijer))

## [v1.7.2](https://github.com/webgme/webgme/tree/v1.7.2) (2016-04-26)
[Full Changelog](https://github.com/webgme/webgme/compare/v1.7.1...v1.7.2)

**Implemented enhancements:**

- ImportProject in testFixture supports webgmex seeds. [\#979](https://github.com/webgme/webgme/pull/979) ([pmeijer](https://github.com/pmeijer))
- Enable webgmex usage in import/export bin scripts [\#977](https://github.com/webgme/webgme/pull/977) ([kecso](https://github.com/kecso))
- Refactoring of export import functionality regarding new project package [\#974](https://github.com/webgme/webgme/pull/974) ([kecso](https://github.com/kecso))
- Generated Visualizers should behave well in split mode. PR also closes \#957. [\#958](https://github.com/webgme/webgme/pull/958) ([pmeijer](https://github.com/pmeijer))

**Fixed bugs:**

- Updating a library \(created w/ url\) using URL fails [\#971](https://github.com/webgme/webgme/issues/971)
- Containment and pointer rules do not propagate properly from mixins [\#968](https://github.com/webgme/webgme/issues/968)
- The displayed library guids are all 00000000-0000... [\#966](https://github.com/webgme/webgme/issues/966)
- Add Library Exception [\#961](https://github.com/webgme/webgme/issues/961)
- Suppressing look up of visualizer from node should still update listed visualizers. [\#957](https://github.com/webgme/webgme/issues/957)
- When checking project constraints the links to offending nodes are broken. [\#948](https://github.com/webgme/webgme/issues/948)
- Refactoring of export import functionality regarding new project package [\#974](https://github.com/webgme/webgme/pull/974) ([kecso](https://github.com/kecso))
- Closes \#948 Ensure node loaded when setting state [\#965](https://github.com/webgme/webgme/pull/965) ([pmeijer](https://github.com/pmeijer))
- Fix base loading mechanism [\#962](https://github.com/webgme/webgme/pull/962) ([kecso](https://github.com/kecso))

**Closed issues:**

- Exception updating library [\#978](https://github.com/webgme/webgme/issues/978)

## [v1.7.1](https://github.com/webgme/webgme/tree/v1.7.1) (2016-04-18)
[Full Changelog](https://github.com/webgme/webgme/compare/v1.7.0...v1.7.1)

**Implemented enhancements:**

- Trying to use an exported webgmeX \(or its json\) as a seed fails [\#943](https://github.com/webgme/webgme/issues/943)
- Print warnings in functions/API that will be removed in v2.0.0 [\#952](https://github.com/webgme/webgme/pull/952) ([pmeijer](https://github.com/pmeijer))
- Fixes \#943 Trying to use an exported webgmeX \(or its json\) as a seed fails [\#950](https://github.com/webgme/webgme/pull/950) ([kecso](https://github.com/kecso))

**Fixed bugs:**

- Loader Circles created before body populated. [\#946](https://github.com/webgme/webgme/issues/946)
- Trying to use an exported webgmeX \\(or its json\\) as a seed fails [\#943](https://github.com/webgme/webgme/issues/943)
- Custom constraints produces server error [\#939](https://github.com/webgme/webgme/issues/939)
- DocumentDecorator uses default classes when rendering onto Object [\#938](https://github.com/webgme/webgme/issues/938)
- Closes \#938 Do not apply Epic Editor's css rules to UI. [\#951](https://github.com/webgme/webgme/pull/951) ([pmeijer](https://github.com/pmeijer))
- Fixes \\#943 Trying to use an exported webgmeX \\(or its json\\) as a seed fails [\#950](https://github.com/webgme/webgme/pull/950) ([kecso](https://github.com/kecso))
- SVG caching and fix minor bug regarding loader circles. Closes \#946 [\#947](https://github.com/webgme/webgme/pull/947) ([pmeijer](https://github.com/pmeijer))
- Ensure Error when rejecting constraint after eval. Closes \#939 [\#944](https://github.com/webgme/webgme/pull/944) ([pmeijer](https://github.com/pmeijer))
- Introduce getNamespace on core to distinguish between meta-nodes with dots in name. [\#941](https://github.com/webgme/webgme/pull/941) ([pmeijer](https://github.com/pmeijer))

**Closed issues:**

- Child containment minimum cardinality should be respected during model creation [\#942](https://github.com/webgme/webgme/issues/942)

## [v1.7.0](https://github.com/webgme/webgme/tree/v1.7.0) (2016-04-11)
[Full Changelog](https://github.com/webgme/webgme/compare/v1.6.0...v1.7.0)

**Implemented enhancements:**

- zoom +/- buttons with collapsible zoom slider [\#907](https://github.com/webgme/webgme/issues/907)
- Requiring text in plugin causes tests to fail [\#898](https://github.com/webgme/webgme/issues/898)
- User experience issue : adding connector to a crosscut [\#897](https://github.com/webgme/webgme/issues/897)
- Create a default crosscut [\#866](https://github.com/webgme/webgme/issues/866)
- Hover response is too aggressive [\#843](https://github.com/webgme/webgme/issues/843)
- Update CONTRIBUTING and config-readme. [\#937](https://github.com/webgme/webgme/pull/937) ([pmeijer](https://github.com/pmeijer))
- Require bower from a node-script in postinstall instead of relying on path to bin script. [\#936](https://github.com/webgme/webgme/pull/936) ([pmeijer](https://github.com/pmeijer))
- Css fixes and isis ui components [\#930](https://github.com/webgme/webgme/pull/930) ([pmeijer](https://github.com/pmeijer))
- FIX: \#902 Use ejs for html templating [\#929](https://github.com/webgme/webgme/pull/929) ([pmeijer](https://github.com/pmeijer))
- FIX for \#902 security issue regarding html-elements. [\#927](https://github.com/webgme/webgme/pull/927) ([pmeijer](https://github.com/pmeijer))
- Plugin metadata and support for plugin Icons. Closes \#898 too. [\#926](https://github.com/webgme/webgme/pull/926) ([pmeijer](https://github.com/pmeijer))
- Add library support to WebGME [\#925](https://github.com/webgme/webgme/pull/925) ([kecso](https://github.com/kecso))
- Add debug.html entry point that does not use dist and min. [\#924](https://github.com/webgme/webgme/pull/924) ([pmeijer](https://github.com/pmeijer))
- Make ZoomWidget with buttons and collapsible slider - closes \#907 [\#921](https://github.com/webgme/webgme/pull/921) ([pmeijer](https://github.com/pmeijer))
- Update to isis-ui-components v0.2.18 Closes \#843 [\#918](https://github.com/webgme/webgme/pull/918) ([pmeijer](https://github.com/pmeijer))
- Add tabs in the svg selector and display short names [\#914](https://github.com/webgme/webgme/pull/914) ([pmeijer](https://github.com/pmeijer))
- Add option to generate decorator inheriting from ModelDecorator [\#911](https://github.com/webgme/webgme/pull/911) ([pmeijer](https://github.com/pmeijer))
- Make the cookieId of JWT configurable. [\#908](https://github.com/webgme/webgme/pull/908) ([pmeijer](https://github.com/pmeijer))
- Cross cut fixes \#866 \#897 \#905 [\#906](https://github.com/webgme/webgme/pull/906) ([pmeijer](https://github.com/pmeijer))
- Set www.ogp.me metadata in index.html when requested. [\#902](https://github.com/webgme/webgme/pull/902) ([pmeijer](https://github.com/pmeijer))
- Update config/README.md with missing parameters. [\#901](https://github.com/webgme/webgme/pull/901) ([pmeijer](https://github.com/pmeijer))
- Added component settings to boilerplate. Fixes \#893 [\#894](https://github.com/webgme/webgme/pull/894) ([brollb](https://github.com/brollb))

**Fixed bugs:**

- Download url for libraries are not working when server is behind a proxy. [\#932](https://github.com/webgme/webgme/issues/932)
- Exclude library roots from meta-rule checker. [\#931](https://github.com/webgme/webgme/issues/931)
- Null pointers not handled correctly [\#919](https://github.com/webgme/webgme/issues/919)
- MetaCache doesn't handle node removal during load [\#909](https://github.com/webgme/webgme/issues/909)
- Suppress auto visualizer look-up when switching panels in split view [\#905](https://github.com/webgme/webgme/issues/905)
- Generated plugins fork logger as "NewPlugin" in the tests [\#899](https://github.com/webgme/webgme/issues/899)
- Fixes library element ordering in ObjectBrowser [\#935](https://github.com/webgme/webgme/pull/935) ([kecso](https://github.com/kecso))
- Fixes \#932 Download url for libraries are not working when server is behind a proxy. [\#934](https://github.com/webgme/webgme/pull/934) ([kecso](https://github.com/kecso))
- Closes \#931 Exclude lib-roots from meta-rule checking. [\#933](https://github.com/webgme/webgme/pull/933) ([pmeijer](https://github.com/pmeijer))
- Closes \#919 Make sure to remove ptr completely if no items left or empty. [\#928](https://github.com/webgme/webgme/pull/928) ([pmeijer](https://github.com/pmeijer))
- Fixes \#909 MetaCache doesn't handle node removal during load [\#912](https://github.com/webgme/webgme/pull/912) ([kecso](https://github.com/kecso))
- Cross cut fixes \\#866 \\#897 \\#905 [\#906](https://github.com/webgme/webgme/pull/906) ([pmeijer](https://github.com/pmeijer))
- Updated forked logger name. Fixes \#899 [\#900](https://github.com/webgme/webgme/pull/900) ([brollb](https://github.com/brollb))

**Closed issues:**

- Prototypal-Inheritance v. Class-Inheritance [\#910](https://github.com/webgme/webgme/issues/910)
- Crosscut visualizer does not automatically load nodes from other branches [\#904](https://github.com/webgme/webgme/issues/904)
- Add tests for reassigning guids. [\#889](https://github.com/webgme/webgme/issues/889)
- Provide "Speculative" Collaboration via External Databases \(especially Graph Databases\) [\#875](https://github.com/webgme/webgme/issues/875)

**Merged pull requests:**

- Adds feature to export commit-queue and apply it to a branch. [\#923](https://github.com/webgme/webgme/pull/923) ([pmeijer](https://github.com/pmeijer))
- Send patch objects for all nodes and calc. changed nodes. [\#920](https://github.com/webgme/webgme/pull/920) ([pmeijer](https://github.com/pmeijer))
- Notify clients on uncaught exceptions. [\#913](https://github.com/webgme/webgme/pull/913) ([pmeijer](https://github.com/pmeijer))

## [v1.6.0](https://github.com/webgme/webgme/tree/v1.6.0) (2016-03-14)
[Full Changelog](https://github.com/webgme/webgme/compare/v1.5.1...v1.6.0)

**Implemented enhancements:**

- LayoutGenerator should use ComponentSettings [\#893](https://github.com/webgme/webgme/issues/893)
- Enable selection of node when switching to project. [\#887](https://github.com/webgme/webgme/issues/887)
- ProjectNavigator should have option to disable and hide project-actions. [\#885](https://github.com/webgme/webgme/issues/885)
- Enable custom css files to be loaded at start up. [\#884](https://github.com/webgme/webgme/issues/884)
- Layout config in component settings [\#879](https://github.com/webgme/webgme/issues/879)
- UMLStateMachine decorator should respect colors. [\#863](https://github.com/webgme/webgme/issues/863)
- Pre-release 1.6.0 [\#891](https://github.com/webgme/webgme/pull/891) ([kecso](https://github.com/kecso))
- Vulcan ui config [\#888](https://github.com/webgme/webgme/pull/888) ([pmeijer](https://github.com/pmeijer))
- Make a build for commonly used client side files. [\#877](https://github.com/webgme/webgme/pull/877) ([pmeijer](https://github.com/pmeijer))
- Add DEMO tab in Projects Dialog. [\#873](https://github.com/webgme/webgme/pull/873) ([pmeijer](https://github.com/pmeijer))
- Remove verbose logs and unnecessary warnings. [\#868](https://github.com/webgme/webgme/pull/868) ([pmeijer](https://github.com/pmeijer))
- Support svg-icons in object \(tree\) browsers. [\#865](https://github.com/webgme/webgme/pull/865) ([pmeijer](https://github.com/pmeijer))
- Update main README.md closes \#863 [\#864](https://github.com/webgme/webgme/pull/864) ([pmeijer](https://github.com/pmeijer))
- Add tests for re-connections in storage. [\#861](https://github.com/webgme/webgme/pull/861) ([pmeijer](https://github.com/pmeijer))
- Update bower packages for 1.6 [\#860](https://github.com/webgme/webgme/pull/860) ([lattmann](https://github.com/lattmann))
- Update npm packages to the latest. [\#859](https://github.com/webgme/webgme/pull/859) ([lattmann](https://github.com/lattmann))
- Enable redis adapter for socket io [\#858](https://github.com/webgme/webgme/pull/858) ([pmeijer](https://github.com/pmeijer))
- Improve tests and use bower components [\#851](https://github.com/webgme/webgme/pull/851) ([lattmann](https://github.com/lattmann))
- Add config-file for hound [\#850](https://github.com/webgme/webgme/pull/850) ([pmeijer](https://github.com/pmeijer))
- Add clean\_up bin script. [\#849](https://github.com/webgme/webgme/pull/849) ([pmeijer](https://github.com/pmeijer))
- Update to isis-ui-components@0.2.17, delay dropdown menu [\#848](https://github.com/webgme/webgme/pull/848) ([lattmann](https://github.com/lattmann))
- Log output from executor-works to console. [\#844](https://github.com/webgme/webgme/pull/844) ([pmeijer](https://github.com/pmeijer))
- Add button for opening node on the canvas. [\#841](https://github.com/webgme/webgme/pull/841) ([pmeijer](https://github.com/pmeijer))
- Update travis build matrix to include node v4.3 [\#839](https://github.com/webgme/webgme/pull/839) ([lattmann](https://github.com/lattmann))

**Fixed bugs:**

- ModelEditor crashes when using it without VisualizerPanel [\#880](https://github.com/webgme/webgme/issues/880)
- Attributes with prefix \_ [\#878](https://github.com/webgme/webgme/issues/878)
- Wrong export format is created if an empty instance functions as base for some nodes [\#874](https://github.com/webgme/webgme/issues/874)
- Project import fails with exception. [\#856](https://github.com/webgme/webgme/issues/856)
- MultiselectWidget doesn't persist if active node is changed before closing. [\#854](https://github.com/webgme/webgme/issues/854)
- Unable to create pointer after removal if it was defined in the base-class and itself. [\#852](https://github.com/webgme/webgme/issues/852)
- Fixes \#856 Project import fails with exception [\#886](https://github.com/webgme/webgme/pull/886) ([kecso](https://github.com/kecso))
- Fixes \#852 Unable to create pointer after removal if it was defined in the base-class and itself. [\#882](https://github.com/webgme/webgme/pull/882) ([kecso](https://github.com/kecso))
- Added behavior for no activePanel set. Fixes \#880 [\#881](https://github.com/webgme/webgme/pull/881) ([brollb](https://github.com/brollb))
- Fixes \#874 Wrong export format is created if an empty instance functions as base for some nodes [\#876](https://github.com/webgme/webgme/pull/876) ([kecso](https://github.com/kecso))
- Closes \#854 MultiSelectWidget persist if changes on mouseleave. [\#872](https://github.com/webgme/webgme/pull/872) ([pmeijer](https://github.com/pmeijer))
- Fixes error on connection removal from crosscut [\#869](https://github.com/webgme/webgme/pull/869) ([kecso](https://github.com/kecso))
- Fix login page bootstrap paths [\#857](https://github.com/webgme/webgme/pull/857) ([lattmann](https://github.com/lattmann))
- Meta Relation Icons sizes got mixed [\#855](https://github.com/webgme/webgme/pull/855) ([kecso](https://github.com/kecso))

**Merged pull requests:**

- Use JSON Web Tokens for authentication. [\#890](https://github.com/webgme/webgme/pull/890) ([pmeijer](https://github.com/pmeijer))
- Remove UMLStateMachine from the repo. [\#867](https://github.com/webgme/webgme/pull/867) ([pmeijer](https://github.com/pmeijer))
- Mixin feature to support multiple inheritance in the meta [\#853](https://github.com/webgme/webgme/pull/853) ([kecso](https://github.com/kecso))

## [v1.5.1](https://github.com/webgme/webgme/tree/v1.5.1) (2016-02-20)
[Full Changelog](https://github.com/webgme/webgme/compare/v1.5.0...v1.5.1)

**Fixed bugs:**

- Dragging a node from the tree-browser w/o selecting it creates another node. [\#838](https://github.com/webgme/webgme/issues/838)
- Remove TreeBrowserWidget edit on dbl-click and shift-click [\#847](https://github.com/webgme/webgme/pull/847) ([pmeijer](https://github.com/pmeijer))
- Switching panel triggers visualizer switch to the viz set on the node. [\#846](https://github.com/webgme/webgme/pull/846) ([pmeijer](https://github.com/pmeijer))
- Visualizers redraw themselves at panel switch in split mode. [\#845](https://github.com/webgme/webgme/pull/845) ([pmeijer](https://github.com/pmeijer))
- Closes \#838 drag from tree bug [\#840](https://github.com/webgme/webgme/pull/840) ([pmeijer](https://github.com/pmeijer))
- Fixes type error exception in jsonPatcher. [\#837](https://github.com/webgme/webgme/pull/837) ([pmeijer](https://github.com/pmeijer))

## [v1.5.0](https://github.com/webgme/webgme/tree/v1.5.0) (2016-02-15)
[Full Changelog](https://github.com/webgme/webgme/compare/v1.4.1...v1.5.0)

**Implemented enhancements:**

- Make a Widget for validPlugins, useAddOns, validDecorators etc. [\#828](https://github.com/webgme/webgme/issues/828)
- Add default support for storing plugin config in users. [\#824](https://github.com/webgme/webgme/issues/824)
- pre-release 1.5.0 [\#836](https://github.com/webgme/webgme/pull/836) ([pmeijer](https://github.com/pmeijer))
- Filter everything for page print except the center panel. [\#833](https://github.com/webgme/webgme/pull/833) ([lattmann](https://github.com/lattmann))
- Closes \#828 multi select widget [\#831](https://github.com/webgme/webgme/pull/831) ([pmeijer](https://github.com/pmeijer))
- Generate source as part of postinstall and serve it. [\#830](https://github.com/webgme/webgme/pull/830) ([pmeijer](https://github.com/pmeijer))
- Core layers uses self/this when adding when adding and modifying methods. [\#822](https://github.com/webgme/webgme/pull/822) ([pmeijer](https://github.com/pmeijer))
- Make components configurable. Closes \#823 and closes \#824. [\#819](https://github.com/webgme/webgme/pull/819) ([pmeijer](https://github.com/pmeijer))
- TreeBrowser added filters, editing, sorting and locate. [\#815](https://github.com/webgme/webgme/pull/815) ([pmeijer](https://github.com/pmeijer))
- Update npm packages to the latest. [\#814](https://github.com/webgme/webgme/pull/814) ([lattmann](https://github.com/lattmann))
- Core layers consistency [\#813](https://github.com/webgme/webgme/pull/813) ([pmeijer](https://github.com/pmeijer))
- PluginResultDialog accepts any metadata as artifact. [\#811](https://github.com/webgme/webgme/pull/811) ([pmeijer](https://github.com/pmeijer))
- Generating CHANGELOG.md for releases [\#810](https://github.com/webgme/webgme/pull/810) ([lattmann](https://github.com/lattmann))
- Updated appveyor config to skip frequently failing tests. [\#808](https://github.com/webgme/webgme/pull/808) ([lattmann](https://github.com/lattmann))
- Add support for custom user data. [\#803](https://github.com/webgme/webgme/pull/803) ([pmeijer](https://github.com/pmeijer))
- Use FancyTree library for TreeBrowsers. [\#801](https://github.com/webgme/webgme/pull/801) ([pmeijer](https://github.com/pmeijer))
- Optimized import project functionality. [\#800](https://github.com/webgme/webgme/pull/800) ([kecso](https://github.com/kecso))
- Tune css to get a more compact plugin config dialog. [\#797](https://github.com/webgme/webgme/pull/797) ([lattmann](https://github.com/lattmann))
- Patch Root Communication feature [\#789](https://github.com/webgme/webgme/pull/789) ([kecso](https://github.com/kecso))

**Fixed bugs:**

- Visualizer URL not respected and meta editor tabs neither. [\#823](https://github.com/webgme/webgme/issues/823)
- Importing an instance model duplicates the meta-sheets. [\#820](https://github.com/webgme/webgme/issues/820)
- Exception in CrosscutController. [\#806](https://github.com/webgme/webgme/issues/806)
- Multiple Meta views in Split View changes the tabs unexpectedly. [\#802](https://github.com/webgme/webgme/issues/802)
- Attribute types Integer and Float are not respected in Property Editor. [\#616](https://github.com/webgme/webgme/issues/616)
- Update executor readme with OSX and added dependent packages [\#835](https://github.com/webgme/webgme/pull/835) ([lattmann](https://github.com/lattmann))
- Fix json patch performance [\#834](https://github.com/webgme/webgme/pull/834) ([kecso](https://github.com/kecso))
- Guard against assigning null in IntegerWidget. [\#829](https://github.com/webgme/webgme/pull/829) ([pmeijer](https://github.com/pmeijer))
- Closes \#616 Attribute types Integer and Float are not respected in Property Editor [\#827](https://github.com/webgme/webgme/pull/827) ([pmeijer](https://github.com/pmeijer))
- ProjectNavigator sometimes logs empty errors. [\#825](https://github.com/webgme/webgme/pull/825) ([pmeijer](https://github.com/pmeijer))
- Core layers uses self/this when adding when adding and modifying methods. [\#822](https://github.com/webgme/webgme/pull/822) ([pmeijer](https://github.com/pmeijer))
- Fixes \#820 Importing an instance model duplicates the meta-sheets. [\#821](https://github.com/webgme/webgme/pull/821) ([kecso](https://github.com/kecso))
- Fixes setPointer function of corediff.applyTreeDiff [\#817](https://github.com/webgme/webgme/pull/817) ([kecso](https://github.com/kecso))
- Disable line-style controls in Meta Editor. [\#816](https://github.com/webgme/webgme/pull/816) ([pmeijer](https://github.com/pmeijer))
- Fixes \#806 Exception in CrosscutController. [\#807](https://github.com/webgme/webgme/pull/807) ([kecso](https://github.com/kecso))
- Fix test cases with non-deterministic results. [\#805](https://github.com/webgme/webgme/pull/805) ([kecso](https://github.com/kecso))
- Fixes \#802 Multiple Meta views in Split View changes the tabs unexpectedly. [\#804](https://github.com/webgme/webgme/pull/804) ([kecso](https://github.com/kecso))

**Closed issues:**

- Missing name attributes in export [\#812](https://github.com/webgme/webgme/issues/812)
- Server side plugins with dependencies [\#779](https://github.com/webgme/webgme/issues/779)

**Merged pull requests:**

- Performance improvements for core layers [\#832](https://github.com/webgme/webgme/pull/832) ([lattmann](https://github.com/lattmann))
- Remove BlockEditor from webgme-repo. [\#826](https://github.com/webgme/webgme/pull/826) ([pmeijer](https://github.com/pmeijer))
- TreeBrowserControl perf avoid updateTerritories. [\#818](https://github.com/webgme/webgme/pull/818) ([pmeijer](https://github.com/pmeijer))
- Use push and new array in coretree.getKeys. [\#809](https://github.com/webgme/webgme/pull/809) ([pmeijer](https://github.com/pmeijer))

## [v1.4.1](https://github.com/webgme/webgme/tree/v1.4.1) (2016-01-20)
[Full Changelog](https://github.com/webgme/webgme/compare/v1.4.0...v1.4.1)

**Fixed bugs:**

- Fixes core node children cache handling [\#799](https://github.com/webgme/webgme/pull/799) ([kecso](https://github.com/kecso))

## [v1.4.0](https://github.com/webgme/webgme/tree/v1.4.0) (2016-01-18)
[Full Changelog](https://github.com/webgme/webgme/compare/v1.3.2...v1.4.0)

**Implemented enhancements:**

- BlobClient getObjectAsString and getObjectAsJSON methods. [\#798](https://github.com/webgme/webgme/issues/798)
- Using zip file for testing seed fails [\#795](https://github.com/webgme/webgme/issues/795)
- Expose getHistory on project classes. [\#793](https://github.com/webgme/webgme/issues/793)
- Executor feedback during execution [\#686](https://github.com/webgme/webgme/issues/686)
- Closes \#795 Add option to import from zip in \_globals. [\#796](https://github.com/webgme/webgme/pull/796) ([pmeijer](https://github.com/pmeijer))
- Revise and improve documentation. Fix inconsistencies found: closes \#792 \#793 \#798 [\#794](https://github.com/webgme/webgme/pull/794) ([pmeijer](https://github.com/pmeijer))
- Add alignment controls for diagram designer [\#784](https://github.com/webgme/webgme/pull/784) ([pmeijer](https://github.com/pmeijer))
- Executor uses mongodb and worker can be queried for output. Closes \#686 [\#782](https://github.com/webgme/webgme/pull/782) ([pmeijer](https://github.com/pmeijer))
- Custom test config must start with 'test' [\#777](https://github.com/webgme/webgme/pull/777) ([pmeijer](https://github.com/pmeijer))
- Moved autorouter to lib and updated requirejs paths. Fixes \#774 [\#775](https://github.com/webgme/webgme/pull/775) ([brollb](https://github.com/brollb))
- Enhanced relid generation [\#751](https://github.com/webgme/webgme/pull/751) ([kecso](https://github.com/kecso))

**Fixed bugs:**

- Copying multiple objects doesn't work [\#787](https://github.com/webgme/webgme/issues/787)
- Moving nodes with keyboard does not always update the right registry. [\#786](https://github.com/webgme/webgme/issues/786)
- URL query for node is not working for paths with non-numbers. [\#785](https://github.com/webgme/webgme/issues/785)
- Closes \#787 Copying multiple objects doesn't work [\#790](https://github.com/webgme/webgme/pull/790) ([pmeijer](https://github.com/pmeijer))
- Fixes \#785 URL query for node is not working for paths with non-numbers. [\#788](https://github.com/webgme/webgme/pull/788) ([kecso](https://github.com/kecso))
- FIX: Update karma \(and remove nedb\) [\#783](https://github.com/webgme/webgme/pull/783) ([pmeijer](https://github.com/pmeijer))
- executor/worker: fix maxConcurrentJobs [\#776](https://github.com/webgme/webgme/pull/776) ([ksmyth](https://github.com/ksmyth))

**Closed issues:**

- BlobClient/Artifact should return Error objects on failures consistently. [\#792](https://github.com/webgme/webgme/issues/792)

**Merged pull requests:**

- reassing\_relids tool have been implemented [\#791](https://github.com/webgme/webgme/pull/791) ([kecso](https://github.com/kecso))
- Add plugin for developers to evaluate and debug constraints. [\#780](https://github.com/webgme/webgme/pull/780) ([pmeijer](https://github.com/pmeijer))

## [v1.3.2](https://github.com/webgme/webgme/tree/v1.3.2) (2016-01-08)
[Full Changelog](https://github.com/webgme/webgme/compare/v1.3.1...v1.3.2)

**Implemented enhancements:**

- Use the autorouter from the webgme/autorouter repository [\#774](https://github.com/webgme/webgme/issues/774)

**Fixed bugs:**

- Instance target bug [\#772](https://github.com/webgme/webgme/issues/772)
- Fixes \#772 Instance target bug [\#778](https://github.com/webgme/webgme/pull/778) ([kecso](https://github.com/kecso))

## [v1.3.1](https://github.com/webgme/webgme/tree/v1.3.1) (2015-12-23)
[Full Changelog](https://github.com/webgme/webgme/compare/v1.3.0...v1.3.1)

**Fixed bugs:**

- ProjectsDialog does not check if project already exists. [\#769](https://github.com/webgme/webgme/issues/769)
- Fix DocumentDecorator DOM leakage and issues with cache. [\#771](https://github.com/webgme/webgme/pull/771) ([pmeijer](https://github.com/pmeijer))
- Fix \#769 check project ID and name before creating. [\#770](https://github.com/webgme/webgme/pull/770) ([pmeijer](https://github.com/pmeijer))

## [v1.3.0](https://github.com/webgme/webgme/tree/v1.3.0) (2015-12-21)
[Full Changelog](https://github.com/webgme/webgme/compare/v1.2.1...v1.3.0)

**Implemented enhancements:**

- Autorouter simple routes too generously [\#730](https://github.com/webgme/webgme/issues/730)
- AutoRouter Replay Download Button [\#728](https://github.com/webgme/webgme/issues/728)
- Smooth Connection Updates [\#725](https://github.com/webgme/webgme/issues/725)
- Load a branch by clicking a branch tag [\#750](https://github.com/webgme/webgme/issues/750)
- Use the common regular expressions throughout the UI. [\#749](https://github.com/webgme/webgme/issues/749)
- Fix/safari and ui fixes [\#768](https://github.com/webgme/webgme/pull/768) ([pmeijer](https://github.com/pmeijer))
- Expose project authorisation on REST API [\#756](https://github.com/webgme/webgme/pull/756) ([pmeijer](https://github.com/pmeijer))
- Blob- and Executor-Client use loggers. [\#742](https://github.com/webgme/webgme/pull/742) ([pmeijer](https://github.com/pmeijer))
- Add method isInvalidActiveNode on PluginBase. [\#741](https://github.com/webgme/webgme/pull/741) ([pmeijer](https://github.com/pmeijer))
- Minor improvements to DocumentDecorator. [\#738](https://github.com/webgme/webgme/pull/738) ([pmeijer](https://github.com/pmeijer))
- AddOns can send notifications [\#734](https://github.com/webgme/webgme/pull/734) ([pmeijer](https://github.com/pmeijer))
- Enhancement to test configurability. [\#733](https://github.com/webgme/webgme/pull/733) ([kecso](https://github.com/kecso))
- Added animation functionality. Fixes \#725 [\#732](https://github.com/webgme/webgme/pull/732) ([brollb](https://github.com/brollb))
- Only tmp routing the moved items' paths. Fixes \#730 [\#731](https://github.com/webgme/webgme/pull/731) ([brollb](https://github.com/brollb))
- Added autorouter replay download button. Fixes \#728 [\#729](https://github.com/webgme/webgme/pull/729) ([brollb](https://github.com/brollb))
- Respect access level in ProjectRepository [\#726](https://github.com/webgme/webgme/pull/726) ([pmeijer](https://github.com/pmeijer))
- Change tag color to blue \(primary\). [\#721](https://github.com/webgme/webgme/pull/721) ([pmeijer](https://github.com/pmeijer))
- Travis uses mongodb 2.6 and duplicateProject back [\#718](https://github.com/webgme/webgme/pull/718) ([pmeijer](https://github.com/pmeijer))
- Navigator order recent branches at connect. [\#717](https://github.com/webgme/webgme/pull/717) ([pmeijer](https://github.com/pmeijer))
- Fixes small findings on core and client [\#715](https://github.com/webgme/webgme/pull/715) ([kecso](https://github.com/kecso))
- Refactored the rotate button. [\#714](https://github.com/webgme/webgme/pull/714) ([kecso](https://github.com/kecso))
- Change commit msg for open/complete transaction [\#711](https://github.com/webgme/webgme/pull/711) ([pmeijer](https://github.com/pmeijer))
- Add Meta type in PropertyEditor [\#710](https://github.com/webgme/webgme/pull/710) ([pmeijer](https://github.com/pmeijer))
- Plugin can be invoked on read-only and commit. [\#709](https://github.com/webgme/webgme/pull/709) ([pmeijer](https://github.com/pmeijer))
- Test with node 4.2 on travis instead of 4.1 [\#708](https://github.com/webgme/webgme/pull/708) ([lattmann](https://github.com/lattmann))
- Update npm packages to the latest. [\#707](https://github.com/webgme/webgme/pull/707) ([lattmann](https://github.com/lattmann))
- Indicate the selected element for the dropdown list with a checkmark. [\#704](https://github.com/webgme/webgme/pull/704) ([lattmann](https://github.com/lattmann))
- Sort part browser alphabetically, then based on relids. [\#703](https://github.com/webgme/webgme/pull/703) ([lattmann](https://github.com/lattmann))
- Use promises for executor/blob/plugin/coreAPI [\#692](https://github.com/webgme/webgme/pull/692) ([pmeijer](https://github.com/pmeijer))

**Fixed bugs:**

- Blob clients in workers raises DEPTH\_ZERO\_SELF\_SIGNED\_CERT when https enabled. [\#521](https://github.com/webgme/webgme/issues/521)
- saveJsonToDisk failing [\#761](https://github.com/webgme/webgme/issues/761)
- PartBrowser throws exception when aspect does not exist. [\#757](https://github.com/webgme/webgme/issues/757)
- Graph View Truncated  [\#746](https://github.com/webgme/webgme/issues/746)
- TypeError thrown in ConnectionRouteManager3 [\#743](https://github.com/webgme/webgme/issues/743)
- Node deletion error [\#736](https://github.com/webgme/webgme/issues/736)
- Remove the state-fullness of the serialization. [\#696](https://github.com/webgme/webgme/issues/696)
- PartBrowser not resizing [\#683](https://github.com/webgme/webgme/issues/683)
- Multiple Rotate Icons on Selected Objects All Do the Same Thing [\#663](https://github.com/webgme/webgme/issues/663)
- If URL contains connection as 'selection' the loading fails [\#658](https://github.com/webgme/webgme/issues/658)
- Corediff sometimes gets invalid path for pointer target [\#458](https://github.com/webgme/webgme/issues/458)
- Revert "Added autorouter replay download button. Fixes \#728" [\#767](https://github.com/webgme/webgme/pull/767) ([pmeijer](https://github.com/pmeijer))
- Revert "Only tmp routing the moved items' paths. Fixes \#730" [\#766](https://github.com/webgme/webgme/pull/766) ([pmeijer](https://github.com/pmeijer))
- Revert "Added animation functionality. Fixes \#725" [\#765](https://github.com/webgme/webgme/pull/765) ([pmeijer](https://github.com/pmeijer))
- Revert "Fixed duplicate initialization bug. Fixes \#736" [\#764](https://github.com/webgme/webgme/pull/764) ([pmeijer](https://github.com/pmeijer))
- Revert "ConnectionRouteManager3 - Check for paths entry. Fixes \#743" [\#763](https://github.com/webgme/webgme/pull/763) ([pmeijer](https://github.com/pmeijer))
- PluginBase.save passes wrong parent after commit was CANCELED. [\#762](https://github.com/webgme/webgme/pull/762) ([pmeijer](https://github.com/pmeijer))
- Fixes \#757 PartBrowser throws exception when aspect does not exist [\#758](https://github.com/webgme/webgme/pull/758) ([kecso](https://github.com/kecso))
- Fixes \#749 Use the common regular expressions throughout the UI. [\#755](https://github.com/webgme/webgme/pull/755) ([kecso](https://github.com/kecso))
- FIX MetaEditor persists after move with keys. [\#754](https://github.com/webgme/webgme/pull/754) ([pmeijer](https://github.com/pmeijer))
- FIX call update during on\_addTo. [\#753](https://github.com/webgme/webgme/pull/753) ([pmeijer](https://github.com/pmeijer))
- Fixes \#746 Graph view truncated [\#752](https://github.com/webgme/webgme/pull/752) ([kecso](https://github.com/kecso))
- ConnectionRouteManager3 - Check for paths entry. Fixes \#743 [\#748](https://github.com/webgme/webgme/pull/748) ([brollb](https://github.com/brollb))
- Fixes error during jsdoc generation [\#744](https://github.com/webgme/webgme/pull/744) ([kecso](https://github.com/kecso))
- FIX: Add missing q for node webkit executor worker [\#740](https://github.com/webgme/webgme/pull/740) ([pmeijer](https://github.com/pmeijer))
- Fixed duplicate initialization bug. Fixes \#736 [\#737](https://github.com/webgme/webgme/pull/737) ([brollb](https://github.com/brollb))
- Added async onSelect to wait for rendered connections. Fixes \#658 [\#735](https://github.com/webgme/webgme/pull/735) ([brollb](https://github.com/brollb))
- Fixed exception caused by coretree usage [\#724](https://github.com/webgme/webgme/pull/724) ([kecso](https://github.com/kecso))
- Fixes \#683 PartBrowser not resizing [\#722](https://github.com/webgme/webgme/pull/722) ([kecso](https://github.com/kecso))
- Refactored the rotate button. [\#714](https://github.com/webgme/webgme/pull/714) ([kecso](https://github.com/kecso))
- Fixes \#702 Persist moved selection by the arrow keys. [\#713](https://github.com/webgme/webgme/pull/713) ([lattmann](https://github.com/lattmann))
- Fixes \#696 Remove the state-fullness of the serialization. [\#701](https://github.com/webgme/webgme/pull/701) ([kecso](https://github.com/kecso))
- Removed crossbar from highlighted elements [\#698](https://github.com/webgme/webgme/pull/698) ([lattmann](https://github.com/lattmann))

**Closed issues:**

- Uncaught exception when switching between projects. [\#664](https://github.com/webgme/webgme/issues/664)
- Abstract models cannot be moved. [\#629](https://github.com/webgme/webgme/issues/629)
- Plugin should be enabled by node type [\#720](https://github.com/webgme/webgme/issues/720)
- Introduce tags [\#712](https://github.com/webgme/webgme/issues/712)

**Merged pull requests:**

- Remove https [\#739](https://github.com/webgme/webgme/pull/739) ([lattmann](https://github.com/lattmann))
- Added documentation decorator [\#727](https://github.com/webgme/webgme/pull/727) ([VictorCoder123](https://github.com/VictorCoder123))
- Closes \#720 Plugin should be enabled by node type/ [\#723](https://github.com/webgme/webgme/pull/723) ([pmeijer](https://github.com/pmeijer))
- Enable downloading error json at ERRORed branch. [\#719](https://github.com/webgme/webgme/pull/719) ([pmeijer](https://github.com/pmeijer))
- Closes \#712 Introduce tags [\#716](https://github.com/webgme/webgme/pull/716) ([pmeijer](https://github.com/pmeijer))
- Support branch history from ProjectRepository. [\#706](https://github.com/webgme/webgme/pull/706) ([pmeijer](https://github.com/pmeijer))
- Move selected items with the arrow keys in the diagram and meta views [\#702](https://github.com/webgme/webgme/pull/702) ([lattmann](https://github.com/lattmann))
- Database adapters [\#700](https://github.com/webgme/webgme/pull/700) ([pmeijer](https://github.com/pmeijer))

## [v1.2.1](https://github.com/webgme/webgme/tree/v1.2.1) (2015-11-30)
[Full Changelog](https://github.com/webgme/webgme/compare/v1.2.0...v1.2.1)

**Implemented enhancements:**

- Fix issues in ProjectDialog and revise project creation. [\#691](https://github.com/webgme/webgme/pull/691) ([pmeijer](https://github.com/pmeijer))

**Fixed bugs:**

- Export branch fails [\#411](https://github.com/webgme/webgme/issues/411)
- Fixes issue, that 'Show all...' on navigator bar causes exception [\#705](https://github.com/webgme/webgme/pull/705) ([kecso](https://github.com/kecso))
- Fixed ProjectDialog exception after delete. [\#699](https://github.com/webgme/webgme/pull/699) ([pmeijer](https://github.com/pmeijer))
- Throttle the project imports for karma tests [\#697](https://github.com/webgme/webgme/pull/697) ([pmeijer](https://github.com/pmeijer))
- Fixes stack overflow exception during project import [\#695](https://github.com/webgme/webgme/pull/695) ([kecso](https://github.com/kecso))
- Update appveyor.yml regarding npm & redis updates [\#693](https://github.com/webgme/webgme/pull/693) ([pmeijer](https://github.com/pmeijer))
- Fix issues in ProjectDialog and revise project creation. [\#691](https://github.com/webgme/webgme/pull/691) ([pmeijer](https://github.com/pmeijer))
- Fix the selection of the default visualizer [\#690](https://github.com/webgme/webgme/pull/690) ([kecso](https://github.com/kecso))
- Fixes \#411 Export branch fails [\#689](https://github.com/webgme/webgme/pull/689) ([kecso](https://github.com/kecso))

## [v1.2.0](https://github.com/webgme/webgme/tree/v1.2.0) (2015-11-23)
[Full Changelog](https://github.com/webgme/webgme/compare/v1.1.0...v1.2.0)

**Implemented enhancements:**

- Run plugin toggle should be removed if server execution is disabled [\#676](https://github.com/webgme/webgme/issues/676)
- Should be able to assign null pointer in Property Editor. [\#673](https://github.com/webgme/webgme/issues/673)
- Seeding a project should work with assets. [\#671](https://github.com/webgme/webgme/issues/671)
- Better autorouter temporary paths [\#669](https://github.com/webgme/webgme/issues/669)
- Create subtypes of connection in MetaEditor [\#659](https://github.com/webgme/webgme/issues/659)
- Moving objects [\#633](https://github.com/webgme/webgme/issues/633)
- Make sure Q library doesn't suppress any exceptions \(use done/nodeify after catches\). [\#354](https://github.com/webgme/webgme/issues/354)
- Refactored crosscut functionality. [\#684](https://github.com/webgme/webgme/pull/684) ([kecso](https://github.com/kecso))
- Closes \#676 RunOnServer toggle box not shown if readOnly [\#682](https://github.com/webgme/webgme/pull/682) ([pmeijer](https://github.com/pmeijer))
- Closes \#673 Enable assigning null-ptr in property editor [\#681](https://github.com/webgme/webgme/pull/681) ([pmeijer](https://github.com/pmeijer))
- Move config.client.usedDecorators to config.visualization.decoratorsToPreload [\#679](https://github.com/webgme/webgme/pull/679) ([pmeijer](https://github.com/pmeijer))
- Closes \#671 seeding assets [\#678](https://github.com/webgme/webgme/pull/678) ([pmeijer](https://github.com/pmeijer))
- Added support for click-and-drag. Fixes \#633 [\#672](https://github.com/webgme/webgme/pull/672) ([brollb](https://github.com/brollb))
- Added simple routing in CR3 for "quick connections". Fixes \#669 [\#670](https://github.com/webgme/webgme/pull/670) ([brollb](https://github.com/brollb))
- Plugin notifications and configure server/browser from plugin. [\#667](https://github.com/webgme/webgme/pull/667) ([pmeijer](https://github.com/pmeijer))
- Relative url methods in blob exec clients [\#666](https://github.com/webgme/webgme/pull/666) ([pmeijer](https://github.com/pmeijer))
- Closes \#659 Display connections and abstracts in "meta" part-browser. [\#661](https://github.com/webgme/webgme/pull/661) ([pmeijer](https://github.com/pmeijer))
- Executor: fix FAILED\_UNZIP jobs being re-run [\#655](https://github.com/webgme/webgme/pull/655) ([ksmyth](https://github.com/ksmyth))
- Fixes \#354 return missing returned promises in bin-tests. [\#652](https://github.com/webgme/webgme/pull/652) ([pmeijer](https://github.com/pmeijer))

**Fixed bugs:**

- Popups on models with multiple pointers [\#660](https://github.com/webgme/webgme/issues/660)
- Connections are not following endpoint update with AutoRouter [\#657](https://github.com/webgme/webgme/issues/657)
- Closes \#660 Temporary suppress drop action from decorator [\#688](https://github.com/webgme/webgme/pull/688) ([pmeijer](https://github.com/pmeijer))
- Fix corrupt diff generation [\#680](https://github.com/webgme/webgme/pull/680) ([kecso](https://github.com/kecso))
- Added listener for path updates. Fixes \#657 [\#668](https://github.com/webgme/webgme/pull/668) ([brollb](https://github.com/brollb))
- ExecutorWorker: register for child\_process 'error' event [\#654](https://github.com/webgme/webgme/pull/654) ([ksmyth](https://github.com/ksmyth))

**Closed issues:**

- Default Visualizer not always set [\#627](https://github.com/webgme/webgme/issues/627)
- More information about the projects [\#677](https://github.com/webgme/webgme/issues/677)
- Enable option to add/upload SVG icons to the project [\#635](https://github.com/webgme/webgme/issues/635)

**Merged pull requests:**

- Closes \#677 add more project info [\#685](https://github.com/webgme/webgme/pull/685) ([pmeijer](https://github.com/pmeijer))
- Added flexible default visualizer. Fixes \#627 [\#675](https://github.com/webgme/webgme/pull/675) ([brollb](https://github.com/brollb))
- Property Editor accepts objects drops for pointers. [\#665](https://github.com/webgme/webgme/pull/665) ([pmeijer](https://github.com/pmeijer))
- Add option to export/import all assets from ExportImport plugin. [\#662](https://github.com/webgme/webgme/pull/662) ([pmeijer](https://github.com/pmeijer))
- Closes \#635 Add svgDirs parameters to config. [\#656](https://github.com/webgme/webgme/pull/656) ([pmeijer](https://github.com/pmeijer))
- Add support for redis as database. [\#651](https://github.com/webgme/webgme/pull/651) ([pmeijer](https://github.com/pmeijer))

## [v1.1.0](https://github.com/webgme/webgme/tree/v1.1.0) (2015-10-26)
[Full Changelog](https://github.com/webgme/webgme/compare/v1.0.2...v1.1.0)

**Implemented enhancements:**

- Display available choices for plugins, addOns, etc in Property Editor. [\#613](https://github.com/webgme/webgme/issues/613)
- Custom Layout Generator [\#607](https://github.com/webgme/webgme/issues/607)
- Custom Layout support [\#606](https://github.com/webgme/webgme/issues/606)
- Update config doc for v1.1.0 [\#650](https://github.com/webgme/webgme/pull/650) ([pmeijer](https://github.com/pmeijer))
- Make sure webSocket not closed when leaving room. [\#645](https://github.com/webgme/webgme/pull/645) ([pmeijer](https://github.com/pmeijer))
- Added support for appveyor and node 4.x [\#644](https://github.com/webgme/webgme/pull/644) ([lattmann](https://github.com/lattmann))
- Filter in ProjectsDialog applies to names. [\#643](https://github.com/webgme/webgme/pull/643) ([pmeijer](https://github.com/pmeijer))
- Move loadPaths and getCommonAncestor to storage. [\#639](https://github.com/webgme/webgme/pull/639) ([pmeijer](https://github.com/pmeijer))
- Feature/nodeless inquiry [\#636](https://github.com/webgme/webgme/pull/636) ([kecso](https://github.com/kecso))
- Feature/enhanced meta attribute [\#631](https://github.com/webgme/webgme/pull/631) ([kecso](https://github.com/kecso))
- Improve documentation [\#630](https://github.com/webgme/webgme/pull/630) ([pmeijer](https://github.com/pmeijer))
- loadPaths function [\#628](https://github.com/webgme/webgme/pull/628) ([kecso](https://github.com/kecso))
- Added layout generator. Fixes \#607 [\#626](https://github.com/webgme/webgme/pull/626) ([brollb](https://github.com/brollb))
- Added custom layout support. Fixes \#606 [\#624](https://github.com/webgme/webgme/pull/624) ([brollb](https://github.com/brollb))
- Display available choices for plugins, addOns, etc. Closes \#613 [\#614](https://github.com/webgme/webgme/pull/614) ([pmeijer](https://github.com/pmeijer))

**Fixed bugs:**

- Title of an object is wrong after inline editor usage [\#647](https://github.com/webgme/webgme/issues/647)
- Generated addOns have incorrect AddOnBase path [\#640](https://github.com/webgme/webgme/issues/640)
- Uncaught Error while loading a branch [\#632](https://github.com/webgme/webgme/issues/632)
- Panel basePaths [\#625](https://github.com/webgme/webgme/issues/625)
- Root node not opened when project opened w/o tree browser [\#619](https://github.com/webgme/webgme/issues/619)
- Release 1.1.0 bug fixes. [\#649](https://github.com/webgme/webgme/pull/649) ([pmeijer](https://github.com/pmeijer))
- Fixes \#647 Title of an object is wrong after inline editor usage [\#648](https://github.com/webgme/webgme/pull/648) ([kecso](https://github.com/kecso))
- Added panelPaths to config. Fixes \#625 [\#638](https://github.com/webgme/webgme/pull/638) ([brollb](https://github.com/brollb))
- ExecutorWorker: dont crash on malformed executor\_config.json [\#634](https://github.com/webgme/webgme/pull/634) ([ksmyth](https://github.com/ksmyth))
- Closes \#619 Root node opened from tree browser. [\#620](https://github.com/webgme/webgme/pull/620) ([pmeijer](https://github.com/pmeijer))
- Fix missing requirejs [\#618](https://github.com/webgme/webgme/pull/618) ([kecso](https://github.com/kecso))
- requireJS build command changed [\#617](https://github.com/webgme/webgme/pull/617) ([ksmyth](https://github.com/ksmyth))
- Fix typo in config readme.md [\#615](https://github.com/webgme/webgme/pull/615) ([pmeijer](https://github.com/pmeijer))

**Closed issues:**

- AddOn Generator Tests [\#641](https://github.com/webgme/webgme/issues/641)

**Merged pull requests:**

- Allow REST access to raw node data from REST. [\#646](https://github.com/webgme/webgme/pull/646) ([pmeijer](https://github.com/pmeijer))
- Added test and fixed AddOnBase path. Fixes \#640, \#641 [\#642](https://github.com/webgme/webgme/pull/642) ([brollb](https://github.com/brollb))

## [v1.0.2](https://github.com/webgme/webgme/tree/v1.0.2) (2015-10-08)
[Full Changelog](https://github.com/webgme/webgme/compare/v1.0.1...v1.0.2)

**Implemented enhancements:**

- Switch from bcrypt to the javascript bcryptjs. [\#623](https://github.com/webgme/webgme/pull/623) ([pmeijer](https://github.com/pmeijer))

**Closed issues:**

- Decorator generator [\#507](https://github.com/webgme/webgme/issues/507)

**Merged pull requests:**

- Closes \#507 decorator generator [\#622](https://github.com/webgme/webgme/pull/622) ([pmeijer](https://github.com/pmeijer))

## [v1.0.1](https://github.com/webgme/webgme/tree/v1.0.1) (2015-10-04)
[Full Changelog](https://github.com/webgme/webgme/compare/v1.0.0...v1.0.1)

**Implemented enhancements:**

- Config doc, metaRule test and PluginGen typo fix [\#612](https://github.com/webgme/webgme/pull/612) ([pmeijer](https://github.com/pmeijer))

**Fixed bugs:**

- False 'base containment' error if relids partially identical [\#609](https://github.com/webgme/webgme/issues/609)
- Will not install in projects with requirejs dependency [\#605](https://github.com/webgme/webgme/issues/605)
- Re-defining a set should not restore its old members [\#565](https://github.com/webgme/webgme/issues/565)
- Fixes \#565 Re-defining a set should not restore its old members [\#611](https://github.com/webgme/webgme/pull/611) ([kecso](https://github.com/kecso))
- Fixes \#609 False 'base containment' error if relids partially identical [\#610](https://github.com/webgme/webgme/pull/610) ([kecso](https://github.com/kecso))
- Fixes \#605 Will not install in projects with requirejs dependency [\#608](https://github.com/webgme/webgme/pull/608) ([kecso](https://github.com/kecso))

## [v1.0.0](https://github.com/webgme/webgme/tree/v1.0.0) (2015-09-29)
[Full Changelog](https://github.com/webgme/webgme/compare/v0.14.1...v1.0.0)

**Implemented enhancements:**

- Squashing commits [\#466](https://github.com/webgme/webgme/issues/466)
- Object browser auto scroll, when navigating with the keyboard [\#408](https://github.com/webgme/webgme/issues/408)
- No Bezier Curves with the AutoRouter [\#314](https://github.com/webgme/webgme/issues/314)
- Part Browser should have tabs to filter available objects [\#209](https://github.com/webgme/webgme/issues/209)
- Reveal in Object Browser [\#48](https://github.com/webgme/webgme/issues/48)
- Enable context-menu in read-only mode and across multiple editors [\#30](https://github.com/webgme/webgme/issues/30)
- Titles of widgets too large [\#593](https://github.com/webgme/webgme/issues/593)
- Major AddOn related improvements. [\#579](https://github.com/webgme/webgme/issues/579)
- No default value in meta rules [\#560](https://github.com/webgme/webgme/issues/560)
- Revise the simple-worker [\#529](https://github.com/webgme/webgme/issues/529)
- Login page issues [\#518](https://github.com/webgme/webgme/issues/518)
- Project dialog doesn't react to project creation/deletion [\#517](https://github.com/webgme/webgme/issues/517)
- Create documentation for v1.0.0 release [\#37](https://github.com/webgme/webgme/issues/37)
- Closes \#37 API documentation for v1 [\#604](https://github.com/webgme/webgme/pull/604) ([pmeijer](https://github.com/pmeijer))
- Adds a cached meta layer to core [\#598](https://github.com/webgme/webgme/pull/598) ([kecso](https://github.com/kecso))
- Fixes \#593 decrease the font-size for panel-title. [\#595](https://github.com/webgme/webgme/pull/595) ([lattmann](https://github.com/lattmann))
- AddOns closes \#579 [\#590](https://github.com/webgme/webgme/pull/590) ([pmeijer](https://github.com/pmeijer))
- Add gmeConfig.server.extlibExcludes. [\#586](https://github.com/webgme/webgme/pull/586) ([pmeijer](https://github.com/pmeijer))
- Closes \#560 no default field among meta rules [\#578](https://github.com/webgme/webgme/pull/578) ([kecso](https://github.com/kecso))
- Improvement iCheckBox displays true/false instead of yes/no [\#564](https://github.com/webgme/webgme/pull/564) ([lattmann](https://github.com/lattmann))
- Fixes \#518 Layout and text/title improvements for login form. [\#562](https://github.com/webgme/webgme/pull/562) ([lattmann](https://github.com/lattmann))
- Refactor standalone.js [\#556](https://github.com/webgme/webgme/pull/556) ([kecso](https://github.com/kecso))
- Added /api/{plugins|decorators|seeds|visualizers} [\#553](https://github.com/webgme/webgme/pull/553) ([lattmann](https://github.com/lattmann))
- Update npm package; make superagent client update easier. [\#549](https://github.com/webgme/webgme/pull/549) ([lattmann](https://github.com/lattmann))
- Closes \#529 revise simple worker and \#537 [\#538](https://github.com/webgme/webgme/pull/538) ([pmeijer](https://github.com/pmeijer))
- Create tabs for property editor. [\#536](https://github.com/webgme/webgme/pull/536) ([lattmann](https://github.com/lattmann))
- Added programmatic interface to export.js. Fixes \#534 [\#535](https://github.com/webgme/webgme/pull/535) ([brollb](https://github.com/brollb))
- Use RAML to document rest api [\#532](https://github.com/webgme/webgme/pull/532) ([lattmann](https://github.com/lattmann))
- Closes \#525 cache non persisted [\#528](https://github.com/webgme/webgme/pull/528) ([pmeijer](https://github.com/pmeijer))

**Fixed bugs:**

- Custom Visualizer paths not loaded [\#554](https://github.com/webgme/webgme/issues/554)
- ConnectionRouteManager3 Silent Errors [\#548](https://github.com/webgme/webgme/issues/548)
- Browser crashes due autorouter [\#412](https://github.com/webgme/webgme/issues/412)
- Context menu throws an error [\#373](https://github.com/webgme/webgme/issues/373)
- Clean up executor upon server shutdown [\#323](https://github.com/webgme/webgme/issues/323)
- Make sure META nodes are unique in GMEModelStatistics [\#294](https://github.com/webgme/webgme/issues/294)
- Change of attribute type of base do not propagate correctly [\#249](https://github.com/webgme/webgme/issues/249)
- openProject should create nonexistent project [\#61](https://github.com/webgme/webgme/issues/61)
- Crosscut view missing events [\#55](https://github.com/webgme/webgme/issues/55)
- Enable line settings in Meta editor [\#45](https://github.com/webgme/webgme/issues/45)
- FCO cannot be repositioned [\#603](https://github.com/webgme/webgme/issues/603)
- Cannot draw connection if connection type is not direct valid children type of parent. [\#601](https://github.com/webgme/webgme/issues/601)
- Fails to download exported branches if not localhost. [\#599](https://github.com/webgme/webgme/issues/599)
- Meta rules for sets fails when aspects/crosscuts are present. [\#596](https://github.com/webgme/webgme/issues/596)
- Horizontal Scroll bar is not visible [\#592](https://github.com/webgme/webgme/issues/592)
- Clicking a single node on the canvas does not select it. [\#589](https://github.com/webgme/webgme/issues/589)
- Inheritance connection upside down [\#587](https://github.com/webgme/webgme/issues/587)
- opening index.html directly screws styling [\#566](https://github.com/webgme/webgme/issues/566)
- We should not allow adding instance as descendant [\#563](https://github.com/webgme/webgme/issues/563)
- Reverse the direction of inheritance definition [\#561](https://github.com/webgme/webgme/issues/561)
- Cannot select branch if there is too many of them [\#559](https://github.com/webgme/webgme/issues/559)
- AddOns needs to be stopped/started when switching branch or project. [\#537](https://github.com/webgme/webgme/issues/537)
- Check for \_mutable key in ovrDiff [\#526](https://github.com/webgme/webgme/issues/526)
- Clearing out cache before all core-objects have been persisted can lead to hash not found. [\#525](https://github.com/webgme/webgme/issues/525)
- Autorouter auto download does not work with Safari [\#463](https://github.com/webgme/webgme/issues/463)
- AutoRouter fails to route [\#447](https://github.com/webgme/webgme/issues/447)
- Update territories while loading in changes can cause inconsistencies in client. [\#393](https://github.com/webgme/webgme/issues/393)
- Autorouter WebWorker tests are killing the karma server. [\#379](https://github.com/webgme/webgme/issues/379)
- Create pointer of an object menu doesn't show up after mouse is over of a pointer object [\#378](https://github.com/webgme/webgme/issues/378)
- Part Browser is not updated correctly when switching between branches. [\#377](https://github.com/webgme/webgme/issues/377)
- Property editor is not updated in split view [\#371](https://github.com/webgme/webgme/issues/371)
- Multiple sources of a connection [\#366](https://github.com/webgme/webgme/issues/366)
- Server runs on the background [\#351](https://github.com/webgme/webgme/issues/351)
- Rename from Tree Browser does not work. [\#347](https://github.com/webgme/webgme/issues/347)
- Switching between branches "quickly" kills addon. [\#227](https://github.com/webgme/webgme/issues/227)
- ProjectNavigatorController fails on new project created elsewhere [\#111](https://github.com/webgme/webgme/issues/111)
- Updating client territory patterns does not generate events [\#67](https://github.com/webgme/webgme/issues/67)
- Multiselection copy is faulty [\#36](https://github.com/webgme/webgme/issues/36)
- Disable Crosscut Editor when not context object selected [\#32](https://github.com/webgme/webgme/issues/32)
- Fixes \#601 Cannot draw connection if connection type is not direct valid children type of parent. [\#602](https://github.com/webgme/webgme/pull/602) ([kecso](https://github.com/kecso))
- Closes \#599 export branch/library download fails on non-localhosts. [\#600](https://github.com/webgme/webgme/pull/600) ([pmeijer](https://github.com/pmeijer))
- Closes \#596 meta rules aspects [\#597](https://github.com/webgme/webgme/pull/597) ([pmeijer](https://github.com/pmeijer))
- Fixes \#592 \#574 fixed tab position for designer. Highlight active tab. [\#594](https://github.com/webgme/webgme/pull/594) ([lattmann](https://github.com/lattmann))
- Fix: fall back on rootNode when config.defaultProject.node is not given. [\#591](https://github.com/webgme/webgme/pull/591) ([pmeijer](https://github.com/pmeijer))
- Fixes \#587 Inheritance connection upside down [\#588](https://github.com/webgme/webgme/pull/588) ([kecso](https://github.com/kecso))
- Prohibit copy of FCO [\#583](https://github.com/webgme/webgme/pull/583) ([kecso](https://github.com/kecso))
- Fixes \#559 Cannot select branch if there is too many of them [\#581](https://github.com/webgme/webgme/pull/581) ([kecso](https://github.com/kecso))
- Fixes \#563 We should not allow adding instance as descendant [\#580](https://github.com/webgme/webgme/pull/580) ([kecso](https://github.com/kecso))
- Fixes \#366 multiple connection sources. [\#577](https://github.com/webgme/webgme/pull/577) ([lattmann](https://github.com/lattmann))
- Fix diagram designer tabs and droppable zone. [\#574](https://github.com/webgme/webgme/pull/574) ([lattmann](https://github.com/lattmann))
- Closes \#347 disable renaming from TreeBrowser. [\#573](https://github.com/webgme/webgme/pull/573) ([pmeijer](https://github.com/pmeijer))
- Fixes \#378 create pointer after mouse over an object [\#572](https://github.com/webgme/webgme/pull/572) ([lattmann](https://github.com/lattmann))
- Fixes \#36 multiselection copy [\#571](https://github.com/webgme/webgme/pull/571) ([lattmann](https://github.com/lattmann))
- Fixes \#566 css require paths should not depend on the document's path [\#570](https://github.com/webgme/webgme/pull/570) ([kecso](https://github.com/kecso))
- Fixes \#561 flipping the draw direction of inheritance [\#569](https://github.com/webgme/webgme/pull/569) ([kecso](https://github.com/kecso))
- Added teardown functionality for autorouter replayer. Fixes \#379 [\#558](https://github.com/webgme/webgme/pull/558) ([brollb](https://github.com/brollb))
- Fixes \#371 property browser now reacts to every selection change also in splitview [\#557](https://github.com/webgme/webgme/pull/557) ([kecso](https://github.com/kecso))
- Fixes \#463 saving AR debug info in Safari [\#555](https://github.com/webgme/webgme/pull/555) ([kecso](https://github.com/kecso))
- Fixes \#393 event racing [\#552](https://github.com/webgme/webgme/pull/552) ([kecso](https://github.com/kecso))
- Added better box checking and warnings. Fixes \#548 [\#551](https://github.com/webgme/webgme/pull/551) ([brollb](https://github.com/brollb))
- Replaced deepCopy with explicit copy of child array [\#547](https://github.com/webgme/webgme/pull/547) ([brollb](https://github.com/brollb))
- Respect existing search string when other tab gets selected. [\#544](https://github.com/webgme/webgme/pull/544) ([lattmann](https://github.com/lattmann))
- Fixed error with async routing queues. Fixes \#541 [\#542](https://github.com/webgme/webgme/pull/542) ([brollb](https://github.com/brollb))
- Fix xmp boolean attribute importer, and iCheckBox widget now accepts string 'false' value [\#540](https://github.com/webgme/webgme/pull/540) ([lattmann](https://github.com/lattmann))
- FIX prohibit undo to empty commitHash. [\#539](https://github.com/webgme/webgme/pull/539) ([pmeijer](https://github.com/pmeijer))
- Fixes 447 autorouter cant retrieve end port [\#533](https://github.com/webgme/webgme/pull/533) ([brollb](https://github.com/brollb))
- Fixes \#517 project dialog listens to delete/create events [\#531](https://github.com/webgme/webgme/pull/531) ([kecso](https://github.com/kecso))
- \#526 Fixes bug and issue test added. [\#527](https://github.com/webgme/webgme/pull/527) ([pmeijer](https://github.com/pmeijer))

**Closed issues:**

- Multiple boxes on META breaks ConnectionRouteManager3 [\#541](https://github.com/webgme/webgme/issues/541)
- Better "run plugin" programmatic interface [\#475](https://github.com/webgme/webgme/issues/475)
- Delete multiple projects [\#376](https://github.com/webgme/webgme/issues/376)
- Blob export plugin [\#374](https://github.com/webgme/webgme/issues/374)
- Extend project protocol to load objects smarter [\#278](https://github.com/webgme/webgme/issues/278)
- Zoom-based User Interface [\#116](https://github.com/webgme/webgme/issues/116)
- Keyboard shortcuts [\#57](https://github.com/webgme/webgme/issues/57)
- Redesign status bar [\#51](https://github.com/webgme/webgme/issues/51)
- Easy way to clone a project [\#47](https://github.com/webgme/webgme/issues/47)
- Make it work on iPad [\#35](https://github.com/webgme/webgme/issues/35)
- Add clickable meta type name under object name in top left corner [\#27](https://github.com/webgme/webgme/issues/27)
- Built-in guide [\#24](https://github.com/webgme/webgme/issues/24)
- Copy-2-clipboard for GUIDs, hashes etc. [\#20](https://github.com/webgme/webgme/issues/20)
- Display active object \(in panel\) [\#19](https://github.com/webgme/webgme/issues/19)
- Highlight crosscut/meta creation when no crosscuts exist [\#17](https://github.com/webgme/webgme/issues/17)
- Aspect ordering [\#16](https://github.com/webgme/webgme/issues/16)
- Asset Browser [\#13](https://github.com/webgme/webgme/issues/13)
- Would be good to have some project metadata/descriptions displayed when project is opened [\#12](https://github.com/webgme/webgme/issues/12)
- AutoRouter deepCopy causes stack overflow [\#546](https://github.com/webgme/webgme/issues/546)
- Refactor constraint checking and enable meta rule checking separately. [\#543](https://github.com/webgme/webgme/issues/543)
- Visualizer Generator [\#468](https://github.com/webgme/webgme/issues/468)
- AddOn Generator [\#467](https://github.com/webgme/webgme/issues/467)
- Add documentation for the core API. [\#348](https://github.com/webgme/webgme/issues/348)
- Include project's display name in page title [\#77](https://github.com/webgme/webgme/issues/77)
- Simple Meta and Library update tool [\#38](https://github.com/webgme/webgme/issues/38)

**Merged pull requests:**

- Add notification button to footer. [\#584](https://github.com/webgme/webgme/pull/584) ([lattmann](https://github.com/lattmann))
- Added visualizer generator and tests. Fixes \#468 [\#582](https://github.com/webgme/webgme/pull/582) ([brollb](https://github.com/brollb))
- Simple in-memory storage for running plugins. [\#576](https://github.com/webgme/webgme/pull/576) ([pmeijer](https://github.com/pmeijer))
- Closes \#77 include project's displayed name in title. [\#568](https://github.com/webgme/webgme/pull/568) ([lattmann](https://github.com/lattmann))
- Closes \#543 constraints and meta-rules [\#567](https://github.com/webgme/webgme/pull/567) ([pmeijer](https://github.com/pmeijer))

## [v0.14.1](https://github.com/webgme/webgme/tree/v0.14.1) (2015-09-07)
[Full Changelog](https://github.com/webgme/webgme/compare/v0.14.0...v0.14.1)

**Implemented enhancements:**

- Better programmatic interface for export.js script [\#534](https://github.com/webgme/webgme/issues/534)

**Fixed bugs:**

- Fixes socket.io transport issue [\#530](https://github.com/webgme/webgme/pull/530) ([kecso](https://github.com/kecso))

## [v0.14.0](https://github.com/webgme/webgme/tree/v0.14.0) (2015-08-31)
[Full Changelog](https://github.com/webgme/webgme/compare/v0.13.2...v0.14.0)

**Implemented enhancements:**

- Don't log the entire auth error at new projects. [\#513](https://github.com/webgme/webgme/issues/513)
- Create example core plugins on how to import and export a library. [\#509](https://github.com/webgme/webgme/issues/509)
- Allow project creation on the REST API [\#504](https://github.com/webgme/webgme/issues/504)
- Expose plugin cli manager on webgme [\#487](https://github.com/webgme/webgme/issues/487)
- Revise the test-code from PluginGenerator. [\#485](https://github.com/webgme/webgme/issues/485)
- Add config option to broadcast all modified core objects. [\#474](https://github.com/webgme/webgme/issues/474)
- Fixing the export-name to be consistent among different browser setups [\#524](https://github.com/webgme/webgme/pull/524) ([kecso](https://github.com/kecso))
- Fixes \#515 [\#523](https://github.com/webgme/webgme/pull/523) ([kecso](https://github.com/kecso))
- Project creation/selection bugs/improvemnts, closes \#519, \#516, \#513 [\#520](https://github.com/webgme/webgme/pull/520) ([pmeijer](https://github.com/pmeijer))
- Closes \#509 importexport plugin [\#512](https://github.com/webgme/webgme/pull/512) ([pmeijer](https://github.com/pmeijer))
- Closes \#504 create project API [\#510](https://github.com/webgme/webgme/pull/510) ([kecso](https://github.com/kecso))
- Consistent usage of Errors in storage. [\#506](https://github.com/webgme/webgme/pull/506) ([pmeijer](https://github.com/pmeijer))
- Add user to organization when creating it. [\#505](https://github.com/webgme/webgme/pull/505) ([pmeijer](https://github.com/pmeijer))
- Suggestion on how to document promises. [\#499](https://github.com/webgme/webgme/pull/499) ([pmeijer](https://github.com/pmeijer))
- Closes \#368 reconnect socket [\#498](https://github.com/webgme/webgme/pull/498) ([pmeijer](https://github.com/pmeijer))
- Add coverage API-organization. [\#494](https://github.com/webgme/webgme/pull/494) ([pmeijer](https://github.com/pmeijer))
- Plugin generated tests closes \#485 [\#490](https://github.com/webgme/webgme/pull/490) ([pmeijer](https://github.com/pmeijer))
- Improve executor server - implemented as an express router [\#479](https://github.com/webgme/webgme/pull/479) ([lattmann](https://github.com/lattmann))
- Add option to select default connection router. [\#478](https://github.com/webgme/webgme/pull/478) ([pmeijer](https://github.com/pmeijer))
- Issue/474 emit all core objects [\#477](https://github.com/webgme/webgme/pull/477) ([pmeijer](https://github.com/pmeijer))
- Plugin and userproject [\#473](https://github.com/webgme/webgme/pull/473) ([pmeijer](https://github.com/pmeijer))

**Fixed bugs:**

- Plugin changes not saving [\#476](https://github.com/webgme/webgme/issues/476)
- Race condition when obtaining branches on project created in ProjectNavigator [\#519](https://github.com/webgme/webgme/issues/519)
- Open project without branch doesn't work [\#516](https://github.com/webgme/webgme/issues/516)
- Exporting project / library under Safari fails [\#515](https://github.com/webgme/webgme/issues/515)
- Deleting branch when commit is selected raises exception in Project Nav. [\#500](https://github.com/webgme/webgme/issues/500)
- Meta attributes should not be defined on derived objects. [\#496](https://github.com/webgme/webgme/issues/496)
- mongo.js openDatabase should be refcounted [\#482](https://github.com/webgme/webgme/issues/482)
- "Export branch" runs afoul of Chrome's popup blocker [\#480](https://github.com/webgme/webgme/issues/480)
- Client does not reconnect: enable socket io automatic reconnection in default config [\#368](https://github.com/webgme/webgme/issues/368)
- Add shims for the codemirror css-files. [\#522](https://github.com/webgme/webgme/pull/522) ([pmeijer](https://github.com/pmeijer))
- Project creation/selection bugs/improvemnts, closes \\#519, \\#516, \\#513 [\#520](https://github.com/webgme/webgme/pull/520) ([pmeijer](https://github.com/pmeijer))
- Error has been changed from string to Error object [\#514](https://github.com/webgme/webgme/pull/514) ([kecso](https://github.com/kecso))
- Fixes \#489 socket.io on Safari [\#511](https://github.com/webgme/webgme/pull/511) ([kecso](https://github.com/kecso))
- Closes \#482 Add reference counting in mongo. [\#508](https://github.com/webgme/webgme/pull/508) ([pmeijer](https://github.com/pmeijer))
- Fixes \#496 [\#502](https://github.com/webgme/webgme/pull/502) ([kecso](https://github.com/kecso))
- Closes \#500 Project Navigator exception on delete branch [\#501](https://github.com/webgme/webgme/pull/501) ([pmeijer](https://github.com/pmeijer))
- Sort getCommits by time field. [\#497](https://github.com/webgme/webgme/pull/497) ([pmeijer](https://github.com/pmeijer))
- Fix generate\_decorator\_svg\_list.js [\#495](https://github.com/webgme/webgme/pull/495) ([pmeijer](https://github.com/pmeijer))
- Various fixes to make tests succeed. [\#491](https://github.com/webgme/webgme/pull/491) ([pmeijer](https://github.com/pmeijer))
- Fix circular json reference in client during debug=true [\#486](https://github.com/webgme/webgme/pull/486) ([pmeijer](https://github.com/pmeijer))
- Plugin and userproject [\#473](https://github.com/webgme/webgme/pull/473) ([pmeijer](https://github.com/pmeijer))

**Closed issues:**

- Suppress the decorators territory updates on events in the Part Browser. [\#492](https://github.com/webgme/webgme/issues/492)
- Project list doesn't load under Safari [\#489](https://github.com/webgme/webgme/issues/489)
- Project Ownership and Organization Phase2 [\#431](https://github.com/webgme/webgme/issues/431)

**Merged pull requests:**

- Decorators no longer display all caps. [\#503](https://github.com/webgme/webgme/pull/503) ([pmeijer](https://github.com/pmeijer))
- Closes \#492 force \_suppressDecoratorUpdate. [\#493](https://github.com/webgme/webgme/pull/493) ([pmeijer](https://github.com/pmeijer))
- Issue/431 organizations [\#488](https://github.com/webgme/webgme/pull/488) ([pmeijer](https://github.com/pmeijer))

## [v0.13.2](https://github.com/webgme/webgme/tree/v0.13.2) (2015-08-12)
[Full Changelog](https://github.com/webgme/webgme/compare/v0.13.1...v0.13.2)

**Fixed bugs:**

- Trying to delete an inheritance pointer raises TypeError [\#484](https://github.com/webgme/webgme/issues/484)
- Trying to set circular base type causes stack overflow. [\#483](https://github.com/webgme/webgme/issues/483)
- Fix \#459: Revert some changes [\#481](https://github.com/webgme/webgme/pull/481) ([pmeijer](https://github.com/pmeijer))

## [v0.13.1](https://github.com/webgme/webgme/tree/v0.13.1) (2015-08-10)
[Full Changelog](https://github.com/webgme/webgme/compare/v0.13.0...v0.13.1)

**Implemented enhancements:**

- Support --debug flag for workers [\#471](https://github.com/webgme/webgme/pull/471) ([ksmyth](https://github.com/ksmyth))

**Fixed bugs:**

- Fix double base pointer creation [\#472](https://github.com/webgme/webgme/pull/472) ([kecso](https://github.com/kecso))

## [v0.13.0](https://github.com/webgme/webgme/tree/v0.13.0) (2015-08-03)
[Full Changelog](https://github.com/webgme/webgme/compare/v0.12.1...v0.13.0)

**Implemented enhancements:**

- Storage modifications [\#461](https://github.com/webgme/webgme/issues/461)
- Closes \#461 storage modifications [\#470](https://github.com/webgme/webgme/pull/470) ([pmeijer](https://github.com/pmeijer))
- Improve crosscut object browser [\#465](https://github.com/webgme/webgme/pull/465) ([kecso](https://github.com/kecso))
- Improve URL parameter handling and navigator bar [\#459](https://github.com/webgme/webgme/pull/459) ([kecso](https://github.com/kecso))
- Make nodemanager more suitable for tests. Storage makeCommit should work with referenced rootNode. [\#456](https://github.com/webgme/webgme/pull/456) ([pmeijer](https://github.com/pmeijer))
- Improve test coverage for corediff [\#455](https://github.com/webgme/webgme/pull/455) ([kecso](https://github.com/kecso))
- Example merge from plugin [\#454](https://github.com/webgme/webgme/pull/454) ([lattmann](https://github.com/lattmann))
- Improve merge dialog capabilities [\#453](https://github.com/webgme/webgme/pull/453) ([kecso](https://github.com/kecso))
- Improve code style and flow [\#452](https://github.com/webgme/webgme/pull/452) ([kecso](https://github.com/kecso))
- Add tests, remove dead code, fix various bugs. [\#449](https://github.com/webgme/webgme/pull/449) ([lattmann](https://github.com/lattmann))
- Improve coverage for tests and remove dead code [\#442](https://github.com/webgme/webgme/pull/442) ([lattmann](https://github.com/lattmann))

**Fixed bugs:**

- Merge issue [\#462](https://github.com/webgme/webgme/issues/462)
- Fixes \#462 fast-forward merge fail [\#464](https://github.com/webgme/webgme/pull/464) ([kecso](https://github.com/kecso))
- Bump socket.io-client to 1.3.6; fixes build on Windows with node v0.12 [\#457](https://github.com/webgme/webgme/pull/457) ([lattmann](https://github.com/lattmann))
- Add tests, remove dead code, fix various bugs. [\#449](https://github.com/webgme/webgme/pull/449) ([lattmann](https://github.com/lattmann))

**Closed issues:**

- Allow change of base type [\#445](https://github.com/webgme/webgme/issues/445)

**Merged pull requests:**

- Test/seeds and coreplugins [\#469](https://github.com/webgme/webgme/pull/469) ([pmeijer](https://github.com/pmeijer))
- Closes \#445 modify base type [\#448](https://github.com/webgme/webgme/pull/448) ([kecso](https://github.com/kecso))

## [v0.12.1](https://github.com/webgme/webgme/tree/v0.12.1) (2015-07-20)
[Full Changelog](https://github.com/webgme/webgme/compare/v0.12.0...v0.12.1)

**Implemented enhancements:**

- Use default decorator for language to hide ports, when xmp is imported. [\#451](https://github.com/webgme/webgme/pull/451) ([lattmann](https://github.com/lattmann))

**Fixed bugs:**

- Repositioning a child of an instance throws an error [\#443](https://github.com/webgme/webgme/issues/443)
- UI do not react when currently viewed branch is deleted remotely [\#440](https://github.com/webgme/webgme/issues/440)
- Make context sub-menu scrollable [\#450](https://github.com/webgme/webgme/pull/450) ([lattmann](https://github.com/lattmann))
- Fixes \#424 ports stay visible even when node is in hiding [\#446](https://github.com/webgme/webgme/pull/446) ([kecso](https://github.com/kecso))
- Fixes \#443 inherited child modification bug [\#444](https://github.com/webgme/webgme/pull/444) ([kecso](https://github.com/kecso))
- Fixes \#440 project navigator selects last known commit if branch is deleted [\#441](https://github.com/webgme/webgme/pull/441) ([kecso](https://github.com/kecso))

**Closed issues:**

- Ports stay visible [\#424](https://github.com/webgme/webgme/issues/424)

## [v0.12.0](https://github.com/webgme/webgme/tree/v0.12.0) (2015-07-06)
[Full Changelog](https://github.com/webgme/webgme/compare/v0.11.1...v0.12.0)

**Implemented enhancements:**

- Client improvement: be able to open a project with a specific branch [\#434](https://github.com/webgme/webgme/issues/434)
- Refactoring merge related \(core-user\) functions [\#416](https://github.com/webgme/webgme/issues/416)
- Closes \#434 specify branchName on selectProject in client. [\#438](https://github.com/webgme/webgme/pull/438) ([pmeijer](https://github.com/pmeijer))
- Support BlobClient.getSubObject in tests [\#426](https://github.com/webgme/webgme/pull/426) ([ksmyth](https://github.com/ksmyth))
- Issue/416 merge user refactor [\#418](https://github.com/webgme/webgme/pull/418) ([kecso](https://github.com/kecso))
- Tests plugin via client [\#417](https://github.com/webgme/webgme/pull/417) ([pmeijer](https://github.com/pmeijer))
- Upgrade outdated npm packages to latest version. [\#406](https://github.com/webgme/webgme/pull/406) ([lattmann](https://github.com/lattmann))
- Close all projects and branches explicitly on storage.close [\#405](https://github.com/webgme/webgme/pull/405) ([pmeijer](https://github.com/pmeijer))

**Fixed bugs:**

- Autorouter Replay Download not available with Web Worker [\#413](https://github.com/webgme/webgme/issues/413)
- Selecting a specific commitHash does not trigger read-only mode. [\#430](https://github.com/webgme/webgme/issues/430)
- exportLibrary disconnects "socket" when transport layer is polling. [\#429](https://github.com/webgme/webgme/issues/429)
- Inserting an object with the same hash does not stack it during commit. [\#415](https://github.com/webgme/webgme/issues/415)
- Instance of an object doesn't load properly [\#410](https://github.com/webgme/webgme/issues/410)
- Superagent not found [\#409](https://github.com/webgme/webgme/issues/409)
- Autorouter setStartPointPrev is not defined [\#404](https://github.com/webgme/webgme/issues/404)
- PluginConfig not respected during server side execution. [\#402](https://github.com/webgme/webgme/issues/402)
- Autorouter has problems displaying routes for the meta sheet. [\#384](https://github.com/webgme/webgme/issues/384)
- Added tests to corediff, util/\[key,url\], and export script  [\#439](https://github.com/webgme/webgme/pull/439) ([lattmann](https://github.com/lattmann))
- Fixes \#436 overlay info not cleared [\#437](https://github.com/webgme/webgme/pull/437) ([kecso](https://github.com/kecso))
- Issue/429 woker export failure polling [\#435](https://github.com/webgme/webgme/pull/435) ([pmeijer](https://github.com/pmeijer))
- serverworkermanager: handle when a worker exits unexpectedly [\#433](https://github.com/webgme/webgme/pull/433) ([ksmyth](https://github.com/ksmyth))
- Added restart routing to routeAsync. Fixes \#384. [\#428](https://github.com/webgme/webgme/pull/428) ([brollb](https://github.com/brollb))
- Removed getter for startpointPrev. Fixes \#404. [\#427](https://github.com/webgme/webgme/pull/427) ([brollb](https://github.com/brollb))
- Merge UI bug fixes and links [\#425](https://github.com/webgme/webgme/pull/425) ([lattmann](https://github.com/lattmann))
- Fixes \#410 instance loading bug [\#423](https://github.com/webgme/webgme/pull/423) ([kecso](https://github.com/kecso))
- Moved bug replay downloading to CR3. Fixes \#413. [\#421](https://github.com/webgme/webgme/pull/421) ([brollb](https://github.com/brollb))
- Deleting a project through ProjectsDialog raises exception. [\#407](https://github.com/webgme/webgme/pull/407) ([pmeijer](https://github.com/pmeijer))
- Closes \#402 Only pass the pluginConfig for the running one. [\#403](https://github.com/webgme/webgme/pull/403) ([pmeijer](https://github.com/pmeijer))

**Closed issues:**

- Overlay information is not cleaned up if nodes are deleted \(possibly moved too\) [\#436](https://github.com/webgme/webgme/issues/436)
- Initial version of the merge UI. [\#420](https://github.com/webgme/webgme/issues/420)
- Project Ownership and Organization Phase1 [\#419](https://github.com/webgme/webgme/issues/419)
- Create MetaGMEParadigmImporter for importing an xmp file to the meta sheet. [\#388](https://github.com/webgme/webgme/issues/388)

**Merged pull requests:**

- Closes \#419 project ownership phase 1 [\#432](https://github.com/webgme/webgme/pull/432) ([pmeijer](https://github.com/pmeijer))
- Closes \#420 merge UI initial implementation [\#422](https://github.com/webgme/webgme/pull/422) ([lattmann](https://github.com/lattmann))
- MetaGMEParadigmImporter [\#414](https://github.com/webgme/webgme/pull/414) ([pmeijer](https://github.com/pmeijer))
- Tests for client branch status [\#401](https://github.com/webgme/webgme/pull/401) ([pmeijer](https://github.com/pmeijer))

## [v0.11.1](https://github.com/webgme/webgme/tree/v0.11.1) (2015-06-15)
[Full Changelog](https://github.com/webgme/webgme/compare/v0.11.0...v0.11.1)

**Implemented enhancements:**

- Change the branch statuses in client to reveal the hidden state. [\#392](https://github.com/webgme/webgme/issues/392)
- Tests for forking [\#398](https://github.com/webgme/webgme/pull/398) ([pmeijer](https://github.com/pmeijer))
- Closes \#392 Branch status updated [\#395](https://github.com/webgme/webgme/pull/395) ([pmeijer](https://github.com/pmeijer))
- Better malformed hash error message [\#390](https://github.com/webgme/webgme/pull/390) ([ksmyth](https://github.com/ksmyth))

**Fixed bugs:**

- Export branch fails [\#387](https://github.com/webgme/webgme/issues/387)
- Default seed not respected when creating a project. [\#385](https://github.com/webgme/webgme/issues/385)
- \#387 wrong core node cache have been fixed [\#400](https://github.com/webgme/webgme/pull/400) ([kecso](https://github.com/kecso))
- Client.unwatchDatabase is calling watchDatabase. [\#397](https://github.com/webgme/webgme/pull/397) ([pmeijer](https://github.com/pmeijer))
- Client plugins [\#396](https://github.com/webgme/webgme/pull/396) ([pmeijer](https://github.com/pmeijer))
- Return undefined for a null pointer [\#391](https://github.com/webgme/webgme/pull/391) ([ksmyth](https://github.com/ksmyth))

**Closed issues:**

- automerge option to the ui [\#386](https://github.com/webgme/webgme/issues/386)

**Merged pull requests:**

- Closes \#386 automerge [\#389](https://github.com/webgme/webgme/pull/389) ([pmeijer](https://github.com/pmeijer))

## [v0.11.0](https://github.com/webgme/webgme/tree/v0.11.0) (2015-06-09)
[Full Changelog](https://github.com/webgme/webgme/compare/v0.10.2...v0.11.0)

**Implemented enhancements:**

- Simpleworker cannot connect to socketIO when https is enabled with expired certificate. [\#226](https://github.com/webgme/webgme/issues/226)
- Reimplementation of the storage/websocket communication. [\#370](https://github.com/webgme/webgme/issues/370)
- Autorouting in a web worker [\#333](https://github.com/webgme/webgme/issues/333)
- Issue/370 storage websockets [\#380](https://github.com/webgme/webgme/pull/380) ([pmeijer](https://github.com/pmeijer))
- Issue/333 autorouter web worker [\#369](https://github.com/webgme/webgme/pull/369) ([brollb](https://github.com/brollb))
- Blob: send 404 when appropriate. [\#365](https://github.com/webgme/webgme/pull/365) ([ksmyth](https://github.com/ksmyth))

**Fixed bugs:**

- Autorouter fails [\#372](https://github.com/webgme/webgme/issues/372)
- Seeding project fails when authentication is turned on. [\#381](https://github.com/webgme/webgme/issues/381)
- ConnectionRouteManager not being destroyed on panel change [\#363](https://github.com/webgme/webgme/issues/363)
- Creating new project from seed does not notify other clients. [\#350](https://github.com/webgme/webgme/issues/350)
- Unresolved method in client.js [\#335](https://github.com/webgme/webgme/issues/335)
- Client sends message out-of-order [\#274](https://github.com/webgme/webgme/issues/274)
- Fix BlobRunPluginClient for Buffer data [\#383](https://github.com/webgme/webgme/pull/383) ([ksmyth](https://github.com/ksmyth))
- \#381 Make sure to get and pass user-name from [\#382](https://github.com/webgme/webgme/pull/382) ([pmeijer](https://github.com/pmeijer))
- Fix BlobClient on node with string containing non-ASCII [\#375](https://github.com/webgme/webgme/pull/375) ([ksmyth](https://github.com/ksmyth))
- BlobClient: use globalAgent's certificate authorities \(unless the BlobClient user passed a custom list\) [\#367](https://github.com/webgme/webgme/pull/367) ([ksmyth](https://github.com/ksmyth))
- Added destroy\(\) on CRM on panel destroy. Fixes \#363 [\#364](https://github.com/webgme/webgme/pull/364) ([brollb](https://github.com/brollb))

## [v0.10.2](https://github.com/webgme/webgme/tree/v0.10.2) (2015-05-12)
[Full Changelog](https://github.com/webgme/webgme/compare/v0.10.1...v0.10.2)

**Fixed bugs:**

- OSX Safari does not work [\#360](https://github.com/webgme/webgme/issues/360)
- Does not work in Safari [\#344](https://github.com/webgme/webgme/issues/344)
- Fixes \#344 Now it works under Safari again. [\#361](https://github.com/webgme/webgme/pull/361) ([lattmann](https://github.com/lattmann))

## [v0.10.1](https://github.com/webgme/webgme/tree/v0.10.1) (2015-05-11)
[Full Changelog](https://github.com/webgme/webgme/compare/v0.10.0...v0.10.1)

## [v0.10.0](https://github.com/webgme/webgme/tree/v0.10.0) (2015-05-11)
[Full Changelog](https://github.com/webgme/webgme/compare/v0.9.2...v0.10.0)

**Implemented enhancements:**

- ProjectNavigatorController super slow with lots of branches [\#338](https://github.com/webgme/webgme/issues/338)
- Indicate when the main callback is being called multiple times. [\#336](https://github.com/webgme/webgme/issues/336)
- Fixes in webgme.classes.build [\#328](https://github.com/webgme/webgme/issues/328)
- Dividing client.js functionality for higher maintainability... [\#357](https://github.com/webgme/webgme/pull/357) ([kecso](https://github.com/kecso))
- Set timeout in test\_travis [\#355](https://github.com/webgme/webgme/pull/355) ([ksmyth](https://github.com/ksmyth))
- Reformatting of entire repository. [\#349](https://github.com/webgme/webgme/pull/349) ([pmeijer](https://github.com/pmeijer))
- Testing of SimpleWorker [\#346](https://github.com/webgme/webgme/pull/346) ([kecso](https://github.com/kecso))
- Closes \#336 multi plugin cb calls [\#343](https://github.com/webgme/webgme/pull/343) ([pmeijer](https://github.com/pmeijer))
- Fixes \#338 project nav controller calls update only once [\#341](https://github.com/webgme/webgme/pull/341) ([lattmann](https://github.com/lattmann))
- Created tests for ServerWorkerManager [\#340](https://github.com/webgme/webgme/pull/340) ([kecso](https://github.com/kecso))
- Fix/issue 328 build [\#339](https://github.com/webgme/webgme/pull/339) ([pmeijer](https://github.com/pmeijer))
- Add support to store sessions in Mongo or Redis. [\#334](https://github.com/webgme/webgme/pull/334) ([lattmann](https://github.com/lattmann))
- Update sax to requirejs module wrapper. [\#331](https://github.com/webgme/webgme/pull/331) ([pmeijer](https://github.com/pmeijer))
- Closes \#328 build fixes [\#330](https://github.com/webgme/webgme/pull/330) ([pmeijer](https://github.com/pmeijer))

**Fixed bugs:**

- Instances with children raises exception. [\#352](https://github.com/webgme/webgme/issues/352)
- storage/mongo: dont ASSERT on user-provided input [\#359](https://github.com/webgme/webgme/pull/359) ([ksmyth](https://github.com/ksmyth))
- Fix 'uncaughtException: Can't set headers after they are sent.' error [\#358](https://github.com/webgme/webgme/pull/358) ([ksmyth](https://github.com/ksmyth))
- Fixes \#352 Corrected empty, on-demand, inherited child creation. [\#353](https://github.com/webgme/webgme/pull/353) ([kecso](https://github.com/kecso))
- Move user information to navigation bar. [\#342](https://github.com/webgme/webgme/pull/342) ([lattmann](https://github.com/lattmann))
- Fix/issue 328 build [\#339](https://github.com/webgme/webgme/pull/339) ([pmeijer](https://github.com/pmeijer))
- Fixes \#335 [\#337](https://github.com/webgme/webgme/pull/337) ([kecso](https://github.com/kecso))
- Nodekit should work [\#327](https://github.com/webgme/webgme/pull/327) ([pmeijer](https://github.com/pmeijer))
- Fix bug where system.indexes shows up in project list [\#324](https://github.com/webgme/webgme/pull/324) ([ksmyth](https://github.com/ksmyth))

**Closed issues:**

- Leftover "debugger;" statement  [\#345](https://github.com/webgme/webgme/issues/345)

**Merged pull requests:**

- Removal of old REST implementation [\#362](https://github.com/webgme/webgme/pull/362) ([kecso](https://github.com/kecso))
- Add Dockerfile to run webgme in a docker container. [\#356](https://github.com/webgme/webgme/pull/356) ([lattmann](https://github.com/lattmann))

## [v0.9.2](https://github.com/webgme/webgme/tree/v0.9.2) (2015-04-15)
[Full Changelog](https://github.com/webgme/webgme/compare/v0.9.1...v0.9.2)

**Fixed bugs:**

- Property editor is not updated [\#326](https://github.com/webgme/webgme/issues/326)
- New branch isn't visible before reloading the page [\#318](https://github.com/webgme/webgme/issues/318)
- Fixes \#318 project navigator branch/project updates on delete/create [\#332](https://github.com/webgme/webgme/pull/332) ([lattmann](https://github.com/lattmann))
- Closes \#326 Don't rely on order of activeObject and activeSelection. [\#329](https://github.com/webgme/webgme/pull/329) ([pmeijer](https://github.com/pmeijer))

## [v0.9.1](https://github.com/webgme/webgme/tree/v0.9.1) (2015-04-13)
[Full Changelog](https://github.com/webgme/webgme/compare/v0.9.0...v0.9.1)

**Fixed bugs:**

- Fixes authorization problems with seedProject and seedInfo functions [\#325](https://github.com/webgme/webgme/pull/325) ([kecso](https://github.com/kecso))

## [v0.9.0](https://github.com/webgme/webgme/tree/v0.9.0) (2015-04-13)
[Full Changelog](https://github.com/webgme/webgme/compare/v0.8.2...v0.9.0)

**Implemented enhancements:**

- Add/revise logging in storage and core layer. [\#316](https://github.com/webgme/webgme/issues/316)
- Add tests for Addons. [\#267](https://github.com/webgme/webgme/issues/267)
- Implement utility function for loading a context. [\#251](https://github.com/webgme/webgme/issues/251)
- Use opencontext and make CLIs accessible easier. [\#248](https://github.com/webgme/webgme/issues/248)
- Upgrade superagent [\#225](https://github.com/webgme/webgme/issues/225)
- Use keepalive in BlobClient [\#119](https://github.com/webgme/webgme/issues/119)
- Color picker should show the selected color [\#39](https://github.com/webgme/webgme/issues/39)
- Update page url by adding user state as user navigates in model [\#10](https://github.com/webgme/webgme/issues/10)
- When meta sheet is deleted, prompt the user what they like to do [\#9](https://github.com/webgme/webgme/issues/9)
- Closes \#9 deletes all meta rules, if the object is not in any meta aspect [\#281](https://github.com/webgme/webgme/pull/281) ([lattmann](https://github.com/lattmann))
- Registry name fix: validPanels -\> validVisualizers [\#321](https://github.com/webgme/webgme/pull/321) ([pmeijer](https://github.com/pmeijer))
- Closes \#316 storage and core logging [\#320](https://github.com/webgme/webgme/pull/320) ([pmeijer](https://github.com/pmeijer))
- Fix/resize panel [\#315](https://github.com/webgme/webgme/pull/315) ([pmeijer](https://github.com/pmeijer))
- Issue/304 decorators download [\#312](https://github.com/webgme/webgme/pull/312) ([pmeijer](https://github.com/pmeijer))
- Moving AutoRouter test to client side [\#310](https://github.com/webgme/webgme/pull/310) ([kecso](https://github.com/kecso))
- Add logging and fix tests. [\#301](https://github.com/webgme/webgme/pull/301) ([lattmann](https://github.com/lattmann))
- Upgrade to superagent 1.1.0 \#225 [\#292](https://github.com/webgme/webgme/pull/292) ([lattmann](https://github.com/lattmann))
- The test of issue \#171 have been changed to execute under karma. [\#290](https://github.com/webgme/webgme/pull/290) ([kecso](https://github.com/kecso))
- Do not pass instances of Error to socket.io. It is not serialized properly [\#286](https://github.com/webgme/webgme/pull/286) ([ksmyth](https://github.com/ksmyth))
- Fixes \#119 blob client keep alive under node and node webkit. [\#285](https://github.com/webgme/webgme/pull/285) ([lattmann](https://github.com/lattmann))
- Move common files to server and use node require [\#282](https://github.com/webgme/webgme/pull/282) ([pmeijer](https://github.com/pmeijer))
- Project navigator uses isis-ui-components library and new logger [\#279](https://github.com/webgme/webgme/pull/279) ([lattmann](https://github.com/lattmann))
- Closes \#267 addon tests [\#277](https://github.com/webgme/webgme/pull/277) ([pmeijer](https://github.com/pmeijer))
- Blob Artifact: dont ask the server for the size of an object we just uploaded [\#273](https://github.com/webgme/webgme/pull/273) ([ksmyth](https://github.com/ksmyth))
- Clean up requirejs paths. [\#271](https://github.com/webgme/webgme/pull/271) ([pmeijer](https://github.com/pmeijer))
- Add links to version numbers in the footer. [\#266](https://github.com/webgme/webgme/pull/266) ([lattmann](https://github.com/lattmann))
- Closes \#248 cli opencontext [\#262](https://github.com/webgme/webgme/pull/262) ([pmeijer](https://github.com/pmeijer))
- Expand root in ObjectBrowser after load. Using setTimeout. [\#261](https://github.com/webgme/webgme/pull/261) ([lattmann](https://github.com/lattmann))
- Closes \#251 opencontext [\#259](https://github.com/webgme/webgme/pull/259) ([pmeijer](https://github.com/pmeijer))
- Update to the latest node package, where possible. [\#257](https://github.com/webgme/webgme/pull/257) ([lattmann](https://github.com/lattmann))
- Closes \#10 updates url based on user navigation [\#255](https://github.com/webgme/webgme/pull/255) ([lattmann](https://github.com/lattmann))
- Closes \#225 upgrade superagent 0.18.2 to 0.21.0 [\#253](https://github.com/webgme/webgme/pull/253) ([lattmann](https://github.com/lattmann))
- Closes \#39 show initial color for color picker \(update libraries\) [\#250](https://github.com/webgme/webgme/pull/250) ([lattmann](https://github.com/lattmann))

**Fixed bugs:**

- Double click on a connection adds custom routing point. Autorouter \(ConnectionRouteManager3\) fails to draw the connection [\#288](https://github.com/webgme/webgme/issues/288)
- Use attribute values as they are [\#308](https://github.com/webgme/webgme/issues/308)
- Custom Path Point Ordering [\#306](https://github.com/webgme/webgme/issues/306)
- All decorators not always downloaded at start up. [\#304](https://github.com/webgme/webgme/issues/304)
- Bad custom path port selection [\#297](https://github.com/webgme/webgme/issues/297)
- Numerical attributes without a default value are not shown properly in the property editor. [\#296](https://github.com/webgme/webgme/issues/296)
- Choosing PortSVGIcon blocks the UI [\#289](https://github.com/webgme/webgme/issues/289)
- Blob: use content-disposition library [\#272](https://github.com/webgme/webgme/issues/272)
- Add target="\_blank" for blob download urls [\#269](https://github.com/webgme/webgme/issues/269)
- Client gets confused by cache.js setBranchHash/getBranchHash [\#263](https://github.com/webgme/webgme/issues/263)
- fsync.js does not serialize calls to mongo.js setBranchHash [\#258](https://github.com/webgme/webgme/issues/258)
- Split view can disable project-browser [\#254](https://github.com/webgme/webgme/issues/254)
- Client gets '\*info\*' in list of branches [\#246](https://github.com/webgme/webgme/issues/246)
- 'Plugin save' inserts the unchanged objects [\#222](https://github.com/webgme/webgme/issues/222)
- Removed ArPoint rounding. Fixes \#306 [\#317](https://github.com/webgme/webgme/pull/317) ([brollb](https://github.com/brollb))
- The parsing of a huge json file \(from blob\) will not cause stack overflow [\#313](https://github.com/webgme/webgme/pull/313) ([kecso](https://github.com/kecso))
- Fixes \#308 does not allow innerHTML for dynatree nodes. [\#309](https://github.com/webgme/webgme/pull/309) ([lattmann](https://github.com/lattmann))
- Authorize creating user to the new project [\#307](https://github.com/webgme/webgme/pull/307) ([kecso](https://github.com/kecso))
- Fix on-gme-init [\#302](https://github.com/webgme/webgme/pull/302) ([ksmyth](https://github.com/ksmyth))
- Fix revert timeouts to as before \#287 [\#299](https://github.com/webgme/webgme/pull/299) ([pmeijer](https://github.com/pmeijer))
- Issue/297 custom points port selection [\#298](https://github.com/webgme/webgme/pull/298) ([brollb](https://github.com/brollb))
- Fix/memory leaks and logging [\#293](https://github.com/webgme/webgme/pull/293) ([lattmann](https://github.com/lattmann))
- Activate panel 'p1' after split view is disabled. [\#283](https://github.com/webgme/webgme/pull/283) ([lattmann](https://github.com/lattmann))
- Issue/258 fsync set branch hash [\#265](https://github.com/webgme/webgme/pull/265) ([ksmyth](https://github.com/ksmyth))
- Fixes \#263. Move get,setBranchHash from storage/cache.js to broadcaster.... [\#264](https://github.com/webgme/webgme/pull/264) ([ksmyth](https://github.com/ksmyth))
- Fix generic ui using webgme as a library [\#260](https://github.com/webgme/webgme/pull/260) ([lattmann](https://github.com/lattmann))
- \#222 now the inherited - empty children will not indicate mutation [\#252](https://github.com/webgme/webgme/pull/252) ([kecso](https://github.com/kecso))

**Closed issues:**

- Can't create custom paths [\#268](https://github.com/webgme/webgme/issues/268)
- Add locate in browser to context-menu [\#31](https://github.com/webgme/webgme/issues/31)
- Provide path for easily testing plugins from dsml-repos. [\#300](https://github.com/webgme/webgme/issues/300)
- Tie valid decorators to projects and visualizers to projects and nodes.  [\#287](https://github.com/webgme/webgme/issues/287)
- Logger.js or logger.js not found [\#280](https://github.com/webgme/webgme/issues/280)

**Merged pull requests:**

- Issue/288 custom path points double click bug [\#295](https://github.com/webgme/webgme/pull/295) ([brollb](https://github.com/brollb))
- Fixes \#268 and removed excess functions [\#270](https://github.com/webgme/webgme/pull/270) ([brollb](https://github.com/brollb))
- First version of user management api [\#322](https://github.com/webgme/webgme/pull/322) ([lattmann](https://github.com/lattmann))
- Issue/47 seed project branches [\#319](https://github.com/webgme/webgme/pull/319) ([kecso](https://github.com/kecso))
- Autorouter tests cleanup [\#311](https://github.com/webgme/webgme/pull/311) ([brollb](https://github.com/brollb))
- Issue/47 seed project [\#305](https://github.com/webgme/webgme/pull/305) ([kecso](https://github.com/kecso))
- Closes \#300 Pass Storage class to import and gmeConfig. [\#303](https://github.com/webgme/webgme/pull/303) ([pmeijer](https://github.com/pmeijer))
- Closes \#287 panels decorators in project [\#291](https://github.com/webgme/webgme/pull/291) ([pmeijer](https://github.com/pmeijer))
- Add gmeConfig to global GME when loading webgme.classes. [\#284](https://github.com/webgme/webgme/pull/284) ([pmeijer](https://github.com/pmeijer))
- Add client.js tests using karma [\#276](https://github.com/webgme/webgme/pull/276) ([kecso](https://github.com/kecso))
- New logger [\#275](https://github.com/webgme/webgme/pull/275) ([pmeijer](https://github.com/pmeijer))

## [v0.8.2](https://github.com/webgme/webgme/tree/v0.8.2) (2015-03-19)
[Full Changelog](https://github.com/webgme/webgme/compare/v0.8.1...v0.8.2)

**Fixed bugs:**

- \#163 fix project repository create branch safari bug [\#256](https://github.com/webgme/webgme/pull/256) ([lattmann](https://github.com/lattmann))

## [v0.8.1](https://github.com/webgme/webgme/tree/v0.8.1) (2015-03-16)
[Full Changelog](https://github.com/webgme/webgme/compare/v0.8.0...v0.8.1)

**Fixed bugs:**

- Deployment bugfixes [\#245](https://github.com/webgme/webgme/issues/245)
- Issue/245 deployment issues [\#247](https://github.com/webgme/webgme/pull/247) ([pmeijer](https://github.com/pmeijer))

## [v0.8.0](https://github.com/webgme/webgme/tree/v0.8.0) (2015-03-16)
[Full Changelog](https://github.com/webgme/webgme/compare/v0.7.2...v0.8.0)

**Implemented enhancements:**

- Blocking AddOn execution in case of specific config setting [\#243](https://github.com/webgme/webgme/issues/243)
- Add test for external rest component [\#239](https://github.com/webgme/webgme/issues/239)
- Url query for node to load should be node and it should use the config if defined there. [\#228](https://github.com/webgme/webgme/issues/228)
- Finalizing merge CLI [\#219](https://github.com/webgme/webgme/issues/219)
- Update configuration structure. [\#205](https://github.com/webgme/webgme/issues/205)
- Refactor test cases to make tests more robust [\#197](https://github.com/webgme/webgme/issues/197)
- Increase test coverage for middleware [\#196](https://github.com/webgme/webgme/issues/196)
- Revise coreplugins and add plugin using executor. [\#192](https://github.com/webgme/webgme/issues/192)
- Autorouter: Cannot read property 'id' of undefined [\#186](https://github.com/webgme/webgme/issues/186)
- Add command line interface for user management [\#177](https://github.com/webgme/webgme/issues/177)
- Use bcrypt for authentication credentials [\#168](https://github.com/webgme/webgme/issues/168)
- Use mongo directly for storing authentication credentials [\#167](https://github.com/webgme/webgme/issues/167)
- Shift-\(direction\) should allow for unselect in object browser [\#94](https://github.com/webgme/webgme/issues/94)
- Issue/239 rest components [\#241](https://github.com/webgme/webgme/pull/241) ([pmeijer](https://github.com/pmeijer))
- Issue/219 finalizing merge cli [\#240](https://github.com/webgme/webgme/pull/240) ([kecso](https://github.com/kecso))
- Issue/235 config client [\#238](https://github.com/webgme/webgme/pull/238) ([pmeijer](https://github.com/pmeijer))
- Karma runs client.js tests with a full webgme server stack. [\#237](https://github.com/webgme/webgme/pull/237) ([lattmann](https://github.com/lattmann))
- Disable plugin server exec checkbox on ui based on gmeConfig [\#236](https://github.com/webgme/webgme/pull/236) ([lattmann](https://github.com/lattmann))
- PluginBase: don't read current branch state when committing results [\#233](https://github.com/webgme/webgme/pull/233) ([ksmyth](https://github.com/ksmyth))
- workermanager: keep a spare worker around to handle new requests. Spawni... [\#232](https://github.com/webgme/webgme/pull/232) ([ksmyth](https://github.com/ksmyth))
- Add BlobClient browser tests using karma. [\#231](https://github.com/webgme/webgme/pull/231) ([lattmann](https://github.com/lattmann))
- \#228 update query and use configuration. [\#229](https://github.com/webgme/webgme/pull/229) ([pmeijer](https://github.com/pmeijer))
- New configuration structure \#205 [\#224](https://github.com/webgme/webgme/pull/224) ([lattmann](https://github.com/lattmann))
- Fix socket.io-based server tests [\#217](https://github.com/webgme/webgme/pull/217) ([lattmann](https://github.com/lattmann))
- Improve robustness of tests; style formatting. [\#214](https://github.com/webgme/webgme/pull/214) ([lattmann](https://github.com/lattmann))
- On failed auth, redirect to /login. Also set username and redirect, and ... [\#212](https://github.com/webgme/webgme/pull/212) ([ksmyth](https://github.com/ksmyth))
- Issue/197 server tests [\#211](https://github.com/webgme/webgme/pull/211) ([lattmann](https://github.com/lattmann))
- unused parts and duplicates in core layers were removed [\#210](https://github.com/webgme/webgme/pull/210) ([kecso](https://github.com/kecso))
- Diff fixed [\#200](https://github.com/webgme/webgme/pull/200) ([kecso](https://github.com/kecso))
- Issue/196 test middleware [\#199](https://github.com/webgme/webgme/pull/199) ([pmeijer](https://github.com/pmeijer))
- Issue/192 coreplugins [\#194](https://github.com/webgme/webgme/pull/194) ([pmeijer](https://github.com/pmeijer))
- Issue/187 short path should be a straight line [\#189](https://github.com/webgme/webgme/pull/189) ([brollb](https://github.com/brollb))
- Autorouter style fixes [\#188](https://github.com/webgme/webgme/pull/188) ([brollb](https://github.com/brollb))
- Issue/177 usermanager [\#180](https://github.com/webgme/webgme/pull/180) ([ksmyth](https://github.com/ksmyth))
- Use bcrypt for authentication [\#176](https://github.com/webgme/webgme/pull/176) ([ksmyth](https://github.com/ksmyth))
- Rewrite authentication to use mongodb directly [\#174](https://github.com/webgme/webgme/pull/174) ([ksmyth](https://github.com/ksmyth))

**Fixed bugs:**

- Authentication issues with recent changes. [\#230](https://github.com/webgme/webgme/issues/230)
- Client rejects out-of-order setBranchHash responses \(was: Race in failsafe.js\) [\#221](https://github.com/webgme/webgme/issues/221)
- Constraint manager bugs [\#220](https://github.com/webgme/webgme/issues/220)
- Creating a project kills server. Auth [\#198](https://github.com/webgme/webgme/issues/198)
- Fix blob issues with node 0.11 [\#193](https://github.com/webgme/webgme/issues/193)
- Autorouter should not download files automatically [\#181](https://github.com/webgme/webgme/issues/181)
- Server crashes when trying to switch to non-existing branch [\#171](https://github.com/webgme/webgme/issues/171)
- Remove asmSHA from possible SHA libraries as it is faulty in some cases [\#165](https://github.com/webgme/webgme/issues/165)
- context menu should scroll if too large [\#93](https://github.com/webgme/webgme/issues/93)
- META Decorator attribute not updating [\#88](https://github.com/webgme/webgme/issues/88)
- Issue/220 constraint manager bugs [\#242](https://github.com/webgme/webgme/pull/242) ([kecso](https://github.com/kecso))
- Issue/230 auth bugs [\#234](https://github.com/webgme/webgme/pull/234) ([pmeijer](https://github.com/pmeijer))
- \#93 context menu scrolls in both directions [\#208](https://github.com/webgme/webgme/pull/208) ([lattmann](https://github.com/lattmann))
- \#88 meta editor rm and add all attributes on change [\#207](https://github.com/webgme/webgme/pull/207) ([lattmann](https://github.com/lattmann))
- Issue/94 tree browser keys [\#206](https://github.com/webgme/webgme/pull/206) ([lattmann](https://github.com/lattmann))
- Fixes issue \#186 \(cannot read property 'id' of undefined\) [\#203](https://github.com/webgme/webgme/pull/203) ([brollb](https://github.com/brollb))
- Fix creating project under auth. Fixes \#198 [\#201](https://github.com/webgme/webgme/pull/201) ([ksmyth](https://github.com/ksmyth))
- Addons dont load under authentication [\#179](https://github.com/webgme/webgme/pull/179) ([ksmyth](https://github.com/ksmyth))
- \#165 cosmetic change [\#166](https://github.com/webgme/webgme/pull/166) ([kecso](https://github.com/kecso))

**Closed issues:**

- /gmeConfig.json must have security-sensitive information removed [\#235](https://github.com/webgme/webgme/issues/235)
- ARBox.setRect: r.getWidth\(\) \>= 3 && r.getHeight\(\) \>= 3 assert failure [\#190](https://github.com/webgme/webgme/issues/190)
- Autorouter short path should be a straight line [\#187](https://github.com/webgme/webgme/issues/187)
- Add executor as a configuration option. [\#178](https://github.com/webgme/webgme/issues/178)
- Finish up diff branch [\#162](https://github.com/webgme/webgme/issues/162)

**Merged pull requests:**

- Issue/243 block addon [\#244](https://github.com/webgme/webgme/pull/244) ([kecso](https://github.com/kecso))
- Test/core [\#223](https://github.com/webgme/webgme/pull/223) ([kecso](https://github.com/kecso))
- Updated box creation for tiny boxes. Fixes \#190 [\#204](https://github.com/webgme/webgme/pull/204) ([brollb](https://github.com/brollb))
- Authorization: organization support [\#195](https://github.com/webgme/webgme/pull/195) ([ksmyth](https://github.com/ksmyth))
- Issue/178 executor rest [\#191](https://github.com/webgme/webgme/pull/191) ([pmeijer](https://github.com/pmeijer))
- Issue/181 should not autodownload files [\#185](https://github.com/webgme/webgme/pull/185) ([brollb](https://github.com/brollb))
- Issue/169 autorouter section has blocked edge assert failure [\#184](https://github.com/webgme/webgme/pull/184) ([brollb](https://github.com/brollb))

## [v0.7.2](https://github.com/webgme/webgme/tree/v0.7.2) (2015-03-06)
[Full Changelog](https://github.com/webgme/webgme/compare/v0.7.1...v0.7.2)

**Implemented enhancements:**

- Improve test stability and coverage. \#171 [\#218](https://github.com/webgme/webgme/pull/218) ([lattmann](https://github.com/lattmann))
- Create 'script' for exporting old 0.7.x user database into json [\#215](https://github.com/webgme/webgme/pull/215) ([kecso](https://github.com/kecso))

**Closed issues:**

- Use one blobClient [\#213](https://github.com/webgme/webgme/issues/213)
- Autorouter: section\_HasBlockedEdge assert failure [\#169](https://github.com/webgme/webgme/issues/169)

**Merged pull requests:**

- clean-up outdated and unused files from the project [\#202](https://github.com/webgme/webgme/pull/202) ([kecso](https://github.com/kecso))

## [v0.7.1](https://github.com/webgme/webgme/tree/v0.7.1) (2015-02-25)
[Full Changelog](https://github.com/webgme/webgme/compare/v0.7.0...v0.7.1)

**Implemented enhancements:**

- Improve server code test coverage and fix critical bugs [\#170](https://github.com/webgme/webgme/issues/170)

**Fixed bugs:**

- Logout icon is not shown on the UI [\#182](https://github.com/webgme/webgme/issues/182)
- Check password on auth [\#173](https://github.com/webgme/webgme/issues/173)
- Fix project repository dialog box layout [\#163](https://github.com/webgme/webgme/issues/163)
- \#182 fix logout icon; autofocus on username. [\#183](https://github.com/webgme/webgme/pull/183) ([lattmann](https://github.com/lattmann))
- \#173 fix password checking bug [\#175](https://github.com/webgme/webgme/pull/175) ([lattmann](https://github.com/lattmann))
- Issue/170 critical bug fixes to server code. [\#172](https://github.com/webgme/webgme/pull/172) ([lattmann](https://github.com/lattmann))
- Issue/163 repo dialog [\#164](https://github.com/webgme/webgme/pull/164) ([lattmann](https://github.com/lattmann))

## [v0.7.0](https://github.com/webgme/webgme/tree/v0.7.0) (2015-02-16)
[Full Changelog](https://github.com/webgme/webgme/compare/v0.6.6...v0.7.0)

**Implemented enhancements:**

- Performance issues with Istvan's Resos models [\#87](https://github.com/webgme/webgme/issues/87)
- Rewriting tree browser [\#15](https://github.com/webgme/webgme/issues/15)
- Able to specify handler for GME client initialization [\#148](https://github.com/webgme/webgme/issues/148)
- If branch is specified in the url, activeObject is not opened [\#145](https://github.com/webgme/webgme/issues/145)
- Enforce jshint rules. [\#141](https://github.com/webgme/webgme/issues/141)
- Add documentation and script for setting up DSML repository. [\#132](https://github.com/webgme/webgme/issues/132)
- Remove connect dependency [\#131](https://github.com/webgme/webgme/issues/131)
- Add tests for PluginGenerator. [\#126](https://github.com/webgme/webgme/issues/126)
- Create unit tests for storage/local [\#125](https://github.com/webgme/webgme/issues/125)
- Create a tool to export model metrics from desktop GME [\#121](https://github.com/webgme/webgme/issues/121)
- Migrate webgme-domain-tools functionalities. [\#120](https://github.com/webgme/webgme/issues/120)
- Don't require auth for js [\#81](https://github.com/webgme/webgme/issues/81)
- Redirect to requested page after login [\#78](https://github.com/webgme/webgme/issues/78)

**Fixed bugs:**

- ProjectNavigatorController: race on project load [\#109](https://github.com/webgme/webgme/issues/109)
- Part Browser not loading parts [\#83](https://github.com/webgme/webgme/issues/83)
- Part Browser Items not loaded [\#80](https://github.com/webgme/webgme/issues/80)
- Downloading CyPhyLight crashes WebGME [\#34](https://github.com/webgme/webgme/issues/34)
- Running plugin on server side fails [\#159](https://github.com/webgme/webgme/issues/159)
- Revert socket.io version to 1.3.2 [\#157](https://github.com/webgme/webgme/issues/157)
- UI loading spinners are not aligned [\#155](https://github.com/webgme/webgme/issues/155)
- Autorouter overlapping lines [\#153](https://github.com/webgme/webgme/issues/153)
- If branch is specified in the url, activeObject is not opened [\#145](https://github.com/webgme/webgme/issues/145)
- Create branch and create commit message not working from navigator. [\#143](https://github.com/webgme/webgme/issues/143)
- Cannot drag-n-drop after setting pointer [\#100](https://github.com/webgme/webgme/issues/100)
- GET /doesnotexist returns 400 [\#60](https://github.com/webgme/webgme/issues/60)
- Model editor title not refreshed when switching project [\#11](https://github.com/webgme/webgme/issues/11)
- \#145 GetActive node after branch selection. [\#146](https://github.com/webgme/webgme/pull/146) ([pmeijer](https://github.com/pmeijer))

**Closed issues:**

- Creating a branch then loading it immediately fails with "there is no such branch!" [\#106](https://github.com/webgme/webgme/issues/106)
- Undo and Redo [\#58](https://github.com/webgme/webgme/issues/58)
- Plugin run on server doesn't come back with results [\#161](https://github.com/webgme/webgme/issues/161)
- Socket.io writes log messages that are not stored in the server log. [\#138](https://github.com/webgme/webgme/issues/138)
- Fix tests [\#129](https://github.com/webgme/webgme/issues/129)
- Create unit tests for coretree.js \(part 1\) [\#122](https://github.com/webgme/webgme/issues/122)

**Merged pull requests:**

- Issue/159 socket io [\#160](https://github.com/webgme/webgme/pull/160) ([lattmann](https://github.com/lattmann))
- Issue/157 revert socket.io 1.3.2 [\#158](https://github.com/webgme/webgme/pull/158) ([kecso](https://github.com/kecso))
- \#155 align UI loading spinners [\#156](https://github.com/webgme/webgme/pull/156) ([lattmann](https://github.com/lattmann))
- Fixes \#153 Autorouter overlapping lines [\#154](https://github.com/webgme/webgme/pull/154) ([brollb](https://github.com/brollb))
- Issue \#148 add on gme init [\#152](https://github.com/webgme/webgme/pull/152) ([lattmann](https://github.com/lattmann))
- Issue/143 commit message from navigator bar [\#151](https://github.com/webgme/webgme/pull/151) ([kecso](https://github.com/kecso))
- \#78 test changes have been left out from previous commit [\#150](https://github.com/webgme/webgme/pull/150) ([kecso](https://github.com/kecso))
- Issue/81 access js files without authentication [\#149](https://github.com/webgme/webgme/pull/149) ([kecso](https://github.com/kecso))
- \#78 login redirection have been implemented differently [\#147](https://github.com/webgme/webgme/pull/147) ([kecso](https://github.com/kecso))
- Issue/131 remove connect dependency [\#144](https://github.com/webgme/webgme/pull/144) ([kecso](https://github.com/kecso))
- \#141 jshint rules checked in. Example in PluginGenerator. [\#142](https://github.com/webgme/webgme/pull/142) ([pmeijer](https://github.com/pmeijer))
- \#100 Fixes the issue, but brings up canvas menu, [\#140](https://github.com/webgme/webgme/pull/140) ([ksmyth](https://github.com/ksmyth))
- Issue/125 storage local tests [\#139](https://github.com/webgme/webgme/pull/139) ([kecso](https://github.com/kecso))
- Issue/121 gme model stat exporter [\#137](https://github.com/webgme/webgme/pull/137) ([pmeijer](https://github.com/pmeijer))
- Issue/132 dsml repo doc [\#136](https://github.com/webgme/webgme/pull/136) ([pmeijer](https://github.com/pmeijer))
- Issue/129 fix tests [\#135](https://github.com/webgme/webgme/pull/135) ([lattmann](https://github.com/lattmann))
- Snap [\#134](https://github.com/webgme/webgme/pull/134) ([brollb](https://github.com/brollb))
- Autorouter clean up [\#133](https://github.com/webgme/webgme/pull/133) ([brollb](https://github.com/brollb))
- Upgrade socket.io [\#130](https://github.com/webgme/webgme/pull/130) ([ksmyth](https://github.com/ksmyth))
- Issue \#60 server returns 404 for resources that does not exist [\#128](https://github.com/webgme/webgme/pull/128) ([lattmann](https://github.com/lattmann))
- Issue/126 plugin tests [\#127](https://github.com/webgme/webgme/pull/127) ([pmeijer](https://github.com/pmeijer))
- Issue/122 coretree tests [\#124](https://github.com/webgme/webgme/pull/124) ([lattmann](https://github.com/lattmann))
- \#120 domain tools migration [\#123](https://github.com/webgme/webgme/pull/123) ([pmeijer](https://github.com/pmeijer))

## [v0.6.6](https://github.com/webgme/webgme/tree/v0.6.6) (2015-02-09)
[Full Changelog](https://github.com/webgme/webgme/compare/webgme_0.6.5...v0.6.6)

**Implemented enhancements:**

- Add branch switching to header next to project name [\#26](https://github.com/webgme/webgme/issues/26)
- If project not specified in query string, show project open dialog [\#25](https://github.com/webgme/webgme/issues/25)
- Forms should submit on ctrl-enter [\#23](https://github.com/webgme/webgme/issues/23)
- Dialog windows should close/cancel on escape [\#22](https://github.com/webgme/webgme/issues/22)
- Add mouse over tooltip \(title\) to ago formatted datetime displayed [\#21](https://github.com/webgme/webgme/issues/21)

**Fixed bugs:**

- Executing plugin from the command line [\#112](https://github.com/webgme/webgme/issues/112)
- Loading meta nodes fails due to race [\#103](https://github.com/webgme/webgme/issues/103)
- title position is dependent upon "w-tabs" class of parent [\#95](https://github.com/webgme/webgme/issues/95)
- Unwanted Project Change [\#92](https://github.com/webgme/webgme/issues/92)
- Constraints not running [\#91](https://github.com/webgme/webgme/issues/91)
- Background text hiding pointer labels [\#89](https://github.com/webgme/webgme/issues/89)
- login screen outdated [\#84](https://github.com/webgme/webgme/issues/84)
- UI pieces are missing and sometimes invisible [\#76](https://github.com/webgme/webgme/issues/76)
- Incorrect Cursor Placement when creating Ptrs [\#75](https://github.com/webgme/webgme/issues/75)
- Selected Box Outline Incorrect Positioning [\#74](https://github.com/webgme/webgme/issues/74)
- SVGIcon and SVG port icon cannot be set [\#70](https://github.com/webgme/webgme/issues/70)
- If the an object has no name, the tree browser does not show its name [\#68](https://github.com/webgme/webgme/issues/68)
- Map files are not downloaded [\#64](https://github.com/webgme/webgme/issues/64)
- "Bad Request" on Export [\#44](https://github.com/webgme/webgme/issues/44)

**Closed issues:**

- fsyncDatabase must be serialized [\#118](https://github.com/webgme/webgme/issues/118)
- WebGMEGlobal not defined under ng-gme [\#115](https://github.com/webgme/webgme/issues/115)
- Mongodb username/password options [\#114](https://github.com/webgme/webgme/issues/114)
- Broken Branch export [\#110](https://github.com/webgme/webgme/issues/110)
- Trying to export non-existent project crashes WebGME [\#105](https://github.com/webgme/webgme/issues/105)
- Exporting project results in "RangeError: Maximum call stack size exceeded" [\#104](https://github.com/webgme/webgme/issues/104)
- Crash when using a db with \>630 projects/collections [\#102](https://github.com/webgme/webgme/issues/102)
- Export to json fails [\#98](https://github.com/webgme/webgme/issues/98)
- Let there be undo! [\#97](https://github.com/webgme/webgme/issues/97)
- Enable CORS for REST services. [\#96](https://github.com/webgme/webgme/issues/96)
- Active Object not loading [\#90](https://github.com/webgme/webgme/issues/90)
- Delete Project Prompt [\#86](https://github.com/webgme/webgme/issues/86)
- Can not delete objects in META [\#85](https://github.com/webgme/webgme/issues/85)
- Enable travis [\#82](https://github.com/webgme/webgme/issues/82)
- Reorganize code [\#79](https://github.com/webgme/webgme/issues/79)
- Project Breadcrumb Component [\#73](https://github.com/webgme/webgme/issues/73)
- FCO deletion only prohibited in the root, not in models [\#72](https://github.com/webgme/webgme/issues/72)
- Import dialog redesign [\#71](https://github.com/webgme/webgme/issues/71)
- Connection not working correctly [\#69](https://github.com/webgme/webgme/issues/69)
- Ctrl + mouse scroll causes Browser to zoom, distorts WebGME objects [\#33](https://github.com/webgme/webgme/issues/33)
- Tree auto-expand on project open [\#18](https://github.com/webgme/webgme/issues/18)

**Merged pull requests:**

- corerel: optimize overlayInsert perf [\#101](https://github.com/webgme/webgme/pull/101) ([ksmyth](https://github.com/ksmyth))
- Fix createEmptyProject and createProjectAsync [\#99](https://github.com/webgme/webgme/pull/99) ([ksmyth](https://github.com/ksmyth))

## [webgme_0.6.5](https://github.com/webgme/webgme/tree/webgme_0.6.5) (2014-06-30)
[Full Changelog](https://github.com/webgme/webgme/compare/webgme_0.6.3...webgme_0.6.5)

**Fixed bugs:**

- webgme uses too much memory and crashes [\#66](https://github.com/webgme/webgme/issues/66)
- Loading objects within a territory creates multiple events. [\#65](https://github.com/webgme/webgme/issues/65)
- Failing to load a rextrast module should be a fatal error [\#59](https://github.com/webgme/webgme/pull/59) ([ksmyth](https://github.com/ksmyth))

## [webgme_0.6.3](https://github.com/webgme/webgme/tree/webgme_0.6.3) (2014-06-26)
[Full Changelog](https://github.com/webgme/webgme/compare/webgme_0.5.12...webgme_0.6.3)

**Implemented enhancements:**

- Provide custom message optional parameter on client API [\#62](https://github.com/webgme/webgme/issues/62)

**Fixed bugs:**

- Active object setting sometimes lost. [\#63](https://github.com/webgme/webgme/issues/63)
- Cannot delete item from crosscut [\#56](https://github.com/webgme/webgme/issues/56)
- direction of inheritance relation on crosscut view is wrong [\#53](https://github.com/webgme/webgme/issues/53)

**Closed issues:**

- Crosscut view should show the containment as a relation among elements [\#54](https://github.com/webgme/webgme/issues/54)

## [webgme_0.5.12](https://github.com/webgme/webgme/tree/webgme_0.5.12) (2014-05-29)
[Full Changelog](https://github.com/webgme/webgme/compare/webgme_0.4.4...webgme_0.5.12)

**Implemented enhancements:**

- Go to the previous page\(s\) [\#49](https://github.com/webgme/webgme/issues/49)
- Resize bugs [\#28](https://github.com/webgme/webgme/issues/28)

**Fixed bugs:**

- The default branch should be 'master' if no branch specified in the url [\#52](https://github.com/webgme/webgme/issues/52)
- Connection reset kills server [\#50](https://github.com/webgme/webgme/issues/50)
- "Bad request" for font files [\#43](https://github.com/webgme/webgme/issues/43)
- Requesting html template from client while WebGME is initializing crashes server [\#42](https://github.com/webgme/webgme/issues/42)
- Status code logged is wrong for some requests [\#40](https://github.com/webgme/webgme/issues/40)
- Tree-browser string handling [\#29](https://github.com/webgme/webgme/issues/29)
- Fix status code logging of many successful requests, e.g. GET / [\#41](https://github.com/webgme/webgme/pull/41) ([ksmyth](https://github.com/ksmyth))

**Closed issues:**

- Using certain characters in branch names crashes server [\#46](https://github.com/webgme/webgme/issues/46)
- Sometimes the mongo object is null and it stops the webserver [\#14](https://github.com/webgme/webgme/issues/14)
- Self containment issue [\#8](https://github.com/webgme/webgme/issues/8)
- Create UI wireframes and mockups [\#1](https://github.com/webgme/webgme/issues/1)

**Merged pull requests:**

- Add jszip, filesaver, and PluginFSClient. [\#7](https://github.com/webgme/webgme/pull/7) ([lattmann](https://github.com/lattmann))

## [webgme_0.4.4](https://github.com/webgme/webgme/tree/webgme_0.4.4) (2014-02-05)
**Closed issues:**

- DiagramDesigner - remove item from selection when clicked with CTRL key down [\#4](https://github.com/webgme/webgme/issues/4)
- DiagramDesigner - ReadOnly mode [\#3](https://github.com/webgme/webgme/issues/3)
- DiagramDesigner - mousedown / mouseup should distinguish between Left and Right button [\#2](https://github.com/webgme/webgme/issues/2)



\* *This Change Log was automatically generated by [github_changelog_generator](https://github.com/skywinder/Github-Changelog-Generator)*