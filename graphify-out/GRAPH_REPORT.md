# Graph Report - studio-comunication  (2026-05-30)

## Corpus Check
- 387 files · ~163,859 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 924 nodes · 1275 edges · 27 communities detected
- Extraction: 66% EXTRACTED · 34% INFERRED · 0% AMBIGUOUS · INFERRED: 429 edges (avg confidence: 0.8)
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
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 37|Community 37]]

## God Nodes (most connected - your core abstractions)
1. `GET()` - 97 edges
2. `POST()` - 83 edges
3. `DELETE()` - 61 edges
4. `createClient()` - 50 edges
5. `createServiceClient()` - 48 edges
6. `PATCH()` - 40 edges
7. `json()` - 31 edges
8. `getAuthContext()` - 30 edges
9. `toast()` - 24 edges
10. `PUT()` - 22 edges

## Surprising Connections (you probably didn't know these)
- `parseJson()` --calls--> `json()`  [INFERRED]
  C:\Users\enzos\Documents\DEV\studio-comunication\src\app\(app)\comunidades\components\publication-composer-utils.ts → src\app\api\admin\users\[id]\route.ts
- `buildPageUrl()` --calls--> `DELETE()`  [INFERRED]
  src\app\(app)\units\page.tsx → src\app\api\users\[id]\route.ts
- `GET()` --calls--> `validateQuery()`  [INFERRED]
  C:\Users\enzos\Documents\DEV\studio-comunication\src\app\auth\recovery\route.ts → C:\Users\enzos\Documents\DEV\studio-comunication\src\lib\http\validate.ts
- `GET()` --calls--> `countUnreadNotifications()`  [INFERRED]
  C:\Users\enzos\Documents\DEV\studio-comunication\src\app\auth\recovery\route.ts → C:\Users\enzos\Documents\DEV\studio-comunication\src\lib\notifications\queries.ts
- `updateProfileSelfRPC()` --calls--> `createClient()`  [INFERRED]
  C:\Users\enzos\Documents\DEV\studio-comunication\src\lib\supabase\rpc.ts → C:\Users\enzos\Documents\DEV\studio-comunication\src\lib\supabase\server.ts

## Communities

### Community 0 - "Community 0"
Cohesion: 0.04
Nodes (54): extractFirstImageUrlFromHtml(), resolveAnnouncementMediaFields(), buildSegmentMap(), errorResponse(), handleRouteError(), isSameOriginRequest(), jsonError(), loadMembershipSets() (+46 more)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (51): getActiveOrgForSidebar(), getAuthContext(), isPlatformAdmin(), requireAuthAndPasswordGuard(), createOrg(), deleteOrg(), getOrg(), getOrgAdmins() (+43 more)

### Community 2 - "Community 2"
Cohesion: 0.04
Nodes (35): createGroupAction(), createOrgAndGo(), buildBuckets(), getAnnouncementMetrics(), parsePagination(), sendPasswordResetEmail(), signIn(), signOut() (+27 more)

### Community 3 - "Community 3"
Cohesion: 0.05
Nodes (31): handleSave(), searchUsers(), handleAddMembers(), handleAdvance(), handleCreate(), submit(), onConfirm(), onConfirm() (+23 more)

### Community 4 - "Community 4"
Cohesion: 0.06
Nodes (39): canManageAnnouncement(), getAnnouncementIfRecipient(), getAnnouncementViewAccess(), isAnnouncementRecipient(), enrichOrgUsersWithAuthMetadata(), fetchAnnouncementDetail(), fetchAnnouncementItems(), fetchAuthoredAnnouncements() (+31 more)

### Community 5 - "Community 5"
Cohesion: 0.08
Nodes (25): ComunidadeDetailPage(), ComunidadeSpacePage(), ComunidadesPage(), loadCommunitiesPageContext(), resolveCreateCommunityPermission(), resolveManagePermission(), canManageUnit(), canManageUsers() (+17 more)

### Community 6 - "Community 6"
Cohesion: 0.07
Nodes (15): EmailCopy(), FormDialog(), InviteMagicLink(), NewUserModal(), OrgConfigForm(), SpaceFormDialog(), CopyButton(), UnitDetailsForm() (+7 more)

### Community 7 - "Community 7"
Cohesion: 0.15
Nodes (21): announcementActionUrl(), calendarEventActionUrl(), inboxFallbackUrl(), resolveActionUrl(), baseDraft(), buildAnnouncementDraft(), buildCalendarDraft(), buildChatMentionDraft() (+13 more)

### Community 8 - "Community 8"
Cohesion: 0.16
Nodes (14): EditUserPage(), buildFilePath(), UploadAdapter, assertCanManageOrg(), getAdminClient(), getAllProfiles(), getMyOrgMembership(), getSessionUserId() (+6 more)

### Community 9 - "Community 9"
Cohesion: 0.17
Nodes (9): createAdminClient(), inviteUserWithOrgContext(), AppLayout(), logError(), logInfo(), normalizeSupabaseLike(), toLoggableError(), ProfilePage() (+1 more)

### Community 11 - "Community 11"
Cohesion: 0.22
Nodes (4): CKEditorComponent(), StartPage(), useAuthContext(), UsersHeader()

### Community 12 - "Community 12"
Cohesion: 0.42
Nodes (8): combineDateAndTime(), endOfDay(), handleSave(), pad(), splitHHmm(), startOfDay(), TimeSelect(), toHHmm()

### Community 13 - "Community 13"
Cohesion: 0.42
Nodes (8): combineDateAndTime(), endOfDay(), handleSubmit(), pad(), splitHHmm(), startOfDay(), TimeSelect(), toHHmm()

### Community 15 - "Community 15"
Cohesion: 0.32
Nodes (4): isOrgAdmin(), isOrgAdminEffective(), isUnitMaster(), isUnitMasterOf()

### Community 16 - "Community 16"
Cohesion: 0.33
Nodes (3): extractFileExtension(), isBlockedAttachment(), parseJson()

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

### Community 23 - "Community 23"
Cohesion: 0.5
Nodes (2): makeDeleteChain(), makeSupabase()

### Community 24 - "Community 24"
Cohesion: 0.4
Nodes (1): MockSupabase

### Community 25 - "Community 25"
Cohesion: 0.5
Nodes (2): makeRequest(), req()

### Community 26 - "Community 26"
Cohesion: 0.4
Nodes (1): MockSupabase

### Community 27 - "Community 27"
Cohesion: 0.4
Nodes (1): MockSupabase

### Community 30 - "Community 30"
Cohesion: 0.5
Nodes (2): exec(), sanitizeHtml()

### Community 33 - "Community 33"
Cohesion: 0.5
Nodes (1): MockSupabase

### Community 37 - "Community 37"
Cohesion: 1.0
Nodes (2): DatePicker(), safeParseDate()

## Knowledge Gaps
- **Thin community `Community 18`** (7 nodes): `nav-projects.tsx`, `sidebar.tsx`, `NavProjects()`, `cn()`, `handleKeyDown()`, `renderButton()`, `useSidebar()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 19`** (6 nodes): `CalendarClient.tsx`, `useCalendarEvents.ts`, `CalendarClient()`, `buildQuery()`, `toISO()`, `useCalendarEvents()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 20`** (6 nodes): `editable-text.tsx`, `utils.ts`, `clsx()`, `handleCancel()`, `handleSave()`, `cn()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 23`** (5 nodes): `makeCtx()`, `makeDeleteChain()`, `makeRequest()`, `makeSupabase()`, `delete-member.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 24`** (5 nodes): `MockSupabase`, `.constructor()`, `.setResponses()`, `.then()`, `management.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 25`** (5 nodes): `makeCtx()`, `makeRequest()`, `makeSupabase()`, `req()`, `members-role-check.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 26`** (5 nodes): `MockSupabase`, `.constructor()`, `.setResponses()`, `.then()`, `invite.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 27`** (5 nodes): `MockSupabase`, `.constructor()`, `.setResponses()`, `.then()`, `lifecycle-by-id.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 30`** (4 nodes): `sanitize.ts`, `exec()`, `sanitizeHtml()`, `RichTextEditor.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 33`** (4 nodes): `notifications.test.ts`, `MockSupabase`, `.constructor()`, `.then()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 37`** (3 nodes): `date-picker.tsx`, `DatePicker()`, `safeParseDate()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `json()` connect `Community 3` to `Community 0`, `Community 2`, `Community 5`, `Community 7`, `Community 12`, `Community 13`, `Community 16`?**
  _High betweenness centrality (0.098) - this node is a cross-community bridge._
- **Why does `GET()` connect `Community 2` to `Community 0`, `Community 1`, `Community 3`, `Community 4`, `Community 5`, `Community 8`, `Community 9`?**
  _High betweenness centrality (0.085) - this node is a cross-community bridge._
- **Why does `POST()` connect `Community 0` to `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 7`, `Community 8`, `Community 9`?**
  _High betweenness centrality (0.074) - this node is a cross-community bridge._
- **Are the 45 inferred relationships involving `GET()` (e.g. with `createOrgAndGo()` and `createUnitFormAction()`) actually correct?**
  _`GET()` has 45 INFERRED edges - model-reasoned connections that need verification._
- **Are the 39 inferred relationships involving `POST()` (e.g. with `createClient()` and `json()`) actually correct?**
  _`POST()` has 39 INFERRED edges - model-reasoned connections that need verification._
- **Are the 31 inferred relationships involving `DELETE()` (e.g. with `buildPageUrl()` and `getAuthContext()`) actually correct?**
  _`DELETE()` has 31 INFERRED edges - model-reasoned connections that need verification._
- **Are the 48 inferred relationships involving `createClient()` (e.g. with `AppLayout()` and `CalendarPage()`) actually correct?**
  _`createClient()` has 48 INFERRED edges - model-reasoned connections that need verification._