# Graph Report - studio-comunication  (2026-05-30)

## Corpus Check
- 382 files · ~161,637 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 905 nodes · 1253 edges · 27 communities detected
- Extraction: 66% EXTRACTED · 34% INFERRED · 0% AMBIGUOUS · INFERRED: 420 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 36|Community 36]]

## God Nodes (most connected - your core abstractions)
1. `GET()` - 95 edges
2. `POST()` - 80 edges
3. `DELETE()` - 57 edges
4. `createClient()` - 49 edges
5. `createServiceClient()` - 48 edges
6. `PATCH()` - 37 edges
7. `getAuthContext()` - 32 edges
8. `json()` - 31 edges
9. `toast()` - 24 edges
10. `PUT()` - 22 edges

## Surprising Connections (you probably didn't know these)
- `GET()` --calls--> `listReactionActorsForTarget()`  [INFERRED]
  C:\Users\enzos\Documents\DEV\studio-comunication\src\app\auth\recovery\route.ts → C:\Users\enzos\Documents\DEV\studio-comunication\src\lib\reactions\core.ts
- `GET()` --calls--> `countUnreadNotifications()`  [INFERRED]
  C:\Users\enzos\Documents\DEV\studio-comunication\src\app\auth\recovery\route.ts → C:\Users\enzos\Documents\DEV\studio-comunication\src\lib\notifications\queries.ts
- `updateProfileSelfRPC()` --calls--> `createClient()`  [INFERRED]
  C:\Users\enzos\Documents\DEV\studio-comunication\src\lib\supabase\rpc.ts → C:\Users\enzos\Documents\DEV\studio-comunication\src\lib\supabase\server.ts
- `CalendarPage()` --calls--> `getAuthContext()`  [INFERRED]
  C:\Users\enzos\Documents\DEV\studio-comunication\src\app\(app)\calendar\page.tsx → C:\Users\enzos\Documents\DEV\studio-comunication\src\lib\messages\auth-context.ts
- `loadCommunitiesPageContext()` --calls--> `createClient()`  [INFERRED]
  src\app\(app)\comunidades\page-helpers.ts → C:\Users\enzos\Documents\DEV\studio-comunication\src\lib\supabase\server.ts

## Communities

### Community 0 - "Community 0"
Cohesion: 0.03
Nodes (73): createGroupAction(), createOrgAndGo(), extractFirstImageUrlFromHtml(), resolveAnnouncementMediaFields(), buildSegmentMap(), errorResponse(), handleRouteError(), parsePagination() (+65 more)

### Community 1 - "Community 1"
Cohesion: 0.04
Nodes (34): handleSave(), searchUsers(), handleAddMembers(), handleAdvance(), handleCreate(), submit(), onConfirm(), onConfirm() (+26 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (36): getActiveOrgForSidebar(), getAuthContext(), ComunidadeDetailPage(), ComunidadeSpacePage(), ComunidadesPage(), loadCommunitiesPageContext(), resolveCreateCommunityPermission(), resolveManagePermission() (+28 more)

### Community 3 - "Community 3"
Cohesion: 0.06
Nodes (40): canManageAnnouncement(), getAnnouncementIfRecipient(), getAnnouncementViewAccess(), isAnnouncementRecipient(), enrichOrgUsersWithAuthMetadata(), fetchAnnouncementDetail(), fetchAnnouncementItems(), fetchAuthoredAnnouncements() (+32 more)

### Community 4 - "Community 4"
Cohesion: 0.07
Nodes (41): buildBuckets(), getAnnouncementMetrics(), isPlatformAdmin(), requireAuthAndPasswordGuard(), createOrg(), deleteOrg(), getOrg(), getOrgAdmins() (+33 more)

### Community 5 - "Community 5"
Cohesion: 0.07
Nodes (14): EmailCopy(), FormDialog(), InviteMagicLink(), NewUserModal(), OrgConfigForm(), SpaceFormDialog(), UnitDetailsForm(), useCommunitiesData() (+6 more)

### Community 6 - "Community 6"
Cohesion: 0.15
Nodes (21): announcementActionUrl(), calendarEventActionUrl(), inboxFallbackUrl(), resolveActionUrl(), baseDraft(), buildAnnouncementDraft(), buildCalendarDraft(), buildChatMentionDraft() (+13 more)

### Community 7 - "Community 7"
Cohesion: 0.14
Nodes (15): EditUserPage(), UsersPage(), buildFilePath(), UploadAdapter, assertCanManageOrg(), getAdminClient(), getAllProfiles(), getMyOrgMembership() (+7 more)

### Community 8 - "Community 8"
Cohesion: 0.19
Nodes (8): createAdminClient(), inviteUserWithOrgContext(), logError(), logInfo(), normalizeSupabaseLike(), toLoggableError(), ProfilePage(), getLoggedUserProfile()

### Community 10 - "Community 10"
Cohesion: 0.42
Nodes (8): combineDateAndTime(), endOfDay(), handleSave(), pad(), splitHHmm(), startOfDay(), TimeSelect(), toHHmm()

### Community 11 - "Community 11"
Cohesion: 0.42
Nodes (8): combineDateAndTime(), endOfDay(), handleSubmit(), pad(), splitHHmm(), startOfDay(), TimeSelect(), toHHmm()

### Community 12 - "Community 12"
Cohesion: 0.22
Nodes (4): CKEditorComponent(), StartPage(), useAuthContext(), UsersHeader()

### Community 13 - "Community 13"
Cohesion: 0.25
Nodes (7): buildReactionSummaryByTargetIds(), createEmptyReactionSummary(), getEmptyReactionSummary(), listReactionActorsForTarget(), toggleTargetReaction(), buildCommunityPostReactionSummaryByPost(), getCommunityPostReactionTarget()

### Community 15 - "Community 15"
Cohesion: 0.25
Nodes (1): canManageUnit()

### Community 16 - "Community 16"
Cohesion: 0.32
Nodes (4): isOrgAdmin(), isOrgAdminEffective(), isUnitMaster(), isUnitMasterOf()

### Community 17 - "Community 17"
Cohesion: 0.38
Nodes (4): centerAspectCrop(), getCroppedImg(), handleCrop(), onImageLoad()

### Community 18 - "Community 18"
Cohesion: 0.29
Nodes (2): NavProjects(), useSidebar()

### Community 19 - "Community 19"
Cohesion: 0.33
Nodes (2): CalendarClient(), useCalendarEvents()

### Community 20 - "Community 20"
Cohesion: 0.33
Nodes (2): clsx(), cn()

### Community 22 - "Community 22"
Cohesion: 0.5
Nodes (2): makeDeleteChain(), makeSupabase()

### Community 23 - "Community 23"
Cohesion: 0.4
Nodes (1): MockSupabase

### Community 24 - "Community 24"
Cohesion: 0.5
Nodes (2): makeRequest(), req()

### Community 25 - "Community 25"
Cohesion: 0.4
Nodes (1): MockSupabase

### Community 26 - "Community 26"
Cohesion: 0.4
Nodes (1): MockSupabase

### Community 28 - "Community 28"
Cohesion: 0.5
Nodes (2): exec(), sanitizeHtml()

### Community 32 - "Community 32"
Cohesion: 0.5
Nodes (1): MockSupabase

### Community 36 - "Community 36"
Cohesion: 1.0
Nodes (2): DatePicker(), safeParseDate()

## Knowledge Gaps
- **Thin community `Community 15`** (8 nodes): `role-helpers.ts`, `canManageOrg()`, `canManageUnit()`, `canViewUnitContent()`, `isOrgAdmin()`, `isOrgMaster()`, `isUnitMaster()`, `isUnitUser()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 18`** (7 nodes): `nav-projects.tsx`, `sidebar.tsx`, `NavProjects()`, `cn()`, `handleKeyDown()`, `renderButton()`, `useSidebar()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 19`** (6 nodes): `CalendarClient.tsx`, `useCalendarEvents.ts`, `CalendarClient()`, `buildQuery()`, `toISO()`, `useCalendarEvents()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 20`** (6 nodes): `editable-text.tsx`, `utils.ts`, `clsx()`, `handleCancel()`, `handleSave()`, `cn()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 22`** (5 nodes): `makeCtx()`, `makeDeleteChain()`, `makeRequest()`, `makeSupabase()`, `delete-member.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 23`** (5 nodes): `MockSupabase`, `.constructor()`, `.setResponses()`, `.then()`, `management.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 24`** (5 nodes): `makeCtx()`, `makeRequest()`, `makeSupabase()`, `req()`, `members-role-check.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 25`** (5 nodes): `MockSupabase`, `.constructor()`, `.setResponses()`, `.then()`, `invite.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 26`** (5 nodes): `MockSupabase`, `.constructor()`, `.setResponses()`, `.then()`, `lifecycle-by-id.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 28`** (4 nodes): `sanitize.ts`, `exec()`, `sanitizeHtml()`, `RichTextEditor.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 32`** (4 nodes): `notifications.test.ts`, `MockSupabase`, `.constructor()`, `.then()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 36`** (3 nodes): `date-picker.tsx`, `DatePicker()`, `safeParseDate()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `json()` connect `Community 1` to `Community 0`, `Community 2`, `Community 6`, `Community 10`, `Community 11`?**
  _High betweenness centrality (0.099) - this node is a cross-community bridge._
- **Why does `GET()` connect `Community 0` to `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 7`, `Community 8`, `Community 13`?**
  _High betweenness centrality (0.086) - this node is a cross-community bridge._
- **Why does `POST()` connect `Community 0` to `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 6`, `Community 7`, `Community 8`, `Community 13`, `Community 15`?**
  _High betweenness centrality (0.074) - this node is a cross-community bridge._
- **Are the 43 inferred relationships involving `GET()` (e.g. with `createOrgAndGo()` and `updateUnitDetailsAction()`) actually correct?**
  _`GET()` has 43 INFERRED edges - model-reasoned connections that need verification._
- **Are the 36 inferred relationships involving `POST()` (e.g. with `createClient()` and `json()`) actually correct?**
  _`POST()` has 36 INFERRED edges - model-reasoned connections that need verification._
- **Are the 26 inferred relationships involving `DELETE()` (e.g. with `getAuthContext()` and `createServiceClient()`) actually correct?**
  _`DELETE()` has 26 INFERRED edges - model-reasoned connections that need verification._
- **Are the 47 inferred relationships involving `createClient()` (e.g. with `CalendarPage()` and `loadCommunitiesPageContext()`) actually correct?**
  _`createClient()` has 47 INFERRED edges - model-reasoned connections that need verification._