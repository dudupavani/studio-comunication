# Graph Report - studio-comunication  (2026-04-24)

## Corpus Check
- 364 files · ~142,235 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 830 nodes · 1098 edges · 25 communities detected
- Extraction: 67% EXTRACTED · 33% INFERRED · 0% AMBIGUOUS · INFERRED: 358 edges (avg confidence: 0.8)
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
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 32|Community 32]]

## God Nodes (most connected - your core abstractions)
1. `GET()` - 91 edges
2. `POST()` - 70 edges
3. `DELETE()` - 53 edges
4. `createClient()` - 49 edges
5. `createServiceClient()` - 44 edges
6. `PATCH()` - 33 edges
7. `json()` - 26 edges
8. `getAuthContext()` - 25 edges
9. `toast()` - 19 edges
10. `PUT()` - 16 edges

## Surprising Connections (you probably didn't know these)
- `GET()` --calls--> `countUnreadNotifications()`  [INFERRED]
  src\app\auth\recovery\route.ts → src\lib\notifications\queries.ts
- `parsePagination()` --calls--> `GET()`  [INFERRED]
  src\lib\messages\api-helpers.ts → src\app\auth\recovery\route.ts
- `fetchChatMembers()` --calls--> `createServiceClient()`  [INFERRED]
  src\lib\messages\queries.ts → src\lib\supabase\service.ts
- `updateProfileSelfRPC()` --calls--> `createClient()`  [INFERRED]
  src\lib\supabase\rpc.ts → src\lib\supabase\server.ts
- `loadCommunitiesPageContext()` --calls--> `getAuthContext()`  [INFERRED]
  src\app\(app)\comunidades\page-helpers.ts → src\lib\messages\auth-context.ts

## Communities

### Community 0 - "Community 0"
Cohesion: 0.03
Nodes (50): createOrgAndGo(), extractFirstImageUrlFromHtml(), resolveAnnouncementMediaFields(), buildSegmentMap(), loadMembershipSets(), normalizeUniqueViolation(), buildReactionSummaryByTargetIds(), createEmptyReactionSummary() (+42 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (48): getActiveOrgForSidebar(), getAuthContext(), isPlatformAdmin(), requireAuthAndPasswordGuard(), createOrg(), deleteOrg(), getOrg(), getOrgAdmins() (+40 more)

### Community 2 - "Community 2"
Cohesion: 0.04
Nodes (27): handleSave(), searchUsers(), handleAddMembers(), handleAdvance(), handleCreate(), submit(), onConfirm(), onConfirm() (+19 more)

### Community 3 - "Community 3"
Cohesion: 0.08
Nodes (31): canManageAnnouncement(), getAnnouncementIfRecipient(), getAnnouncementViewAccess(), isAnnouncementRecipient(), enrichOrgUsersWithAuthMetadata(), fetchAnnouncementDetail(), fetchAnnouncementItems(), fetchAuthoredAnnouncements() (+23 more)

### Community 4 - "Community 4"
Cohesion: 0.09
Nodes (25): errorResponse(), handleRouteError(), parsePagination(), jsonError(), inviteUserWithOrgContext(), logError(), logInfo(), normalizeSupabaseLike() (+17 more)

### Community 5 - "Community 5"
Cohesion: 0.08
Nodes (13): EmailCopy(), FormDialog(), InviteMagicLink(), NewUserModal(), OrgConfigForm(), SpaceFormDialog(), UnitDetailsForm(), useCommunitiesData() (+5 more)

### Community 6 - "Community 6"
Cohesion: 0.13
Nodes (17): createAdminClient(), EditUserPage(), UsersPage(), canManageUsers(), safeDeleteUser(), assertCanManageOrg(), deleteUser(), getAdminClient() (+9 more)

### Community 7 - "Community 7"
Cohesion: 0.15
Nodes (18): announcementActionUrl(), calendarEventActionUrl(), inboxFallbackUrl(), resolveActionUrl(), baseDraft(), buildAnnouncementDraft(), buildCalendarDraft(), chunk() (+10 more)

### Community 8 - "Community 8"
Cohesion: 0.2
Nodes (6): canManageTeams(), getTeamContext(), jsonError(), PUT(), buildFilePath(), UploadAdapter

### Community 9 - "Community 9"
Cohesion: 0.17
Nodes (11): createGroupAction(), buildBuckets(), getAnnouncementMetrics(), sendPasswordResetEmail(), signIn(), signOut(), updatePassword(), onSubmit() (+3 more)

### Community 10 - "Community 10"
Cohesion: 0.24
Nodes (7): countUnreadNotifications(), decodeCursor(), encodeCursor(), fetchChatMembers(), fetchChatMessages(), fetchChats(), listNotifications()

### Community 11 - "Community 11"
Cohesion: 0.24
Nodes (6): ComunidadeDetailPage(), ComunidadeSpacePage(), ComunidadesPage(), loadCommunitiesPageContext(), resolveCreateCommunityPermission(), resolveManagePermission()

### Community 13 - "Community 13"
Cohesion: 0.22
Nodes (4): CKEditorComponent(), StartPage(), useAuthContext(), UsersHeader()

### Community 14 - "Community 14"
Cohesion: 0.42
Nodes (8): combineDateAndTime(), endOfDay(), handleSave(), pad(), splitHHmm(), startOfDay(), TimeSelect(), toHHmm()

### Community 15 - "Community 15"
Cohesion: 0.42
Nodes (8): combineDateAndTime(), endOfDay(), handleSubmit(), pad(), splitHHmm(), startOfDay(), TimeSelect(), toHHmm()

### Community 17 - "Community 17"
Cohesion: 0.32
Nodes (4): isOrgAdmin(), isOrgAdminEffective(), isUnitMaster(), isUnitMasterOf()

### Community 19 - "Community 19"
Cohesion: 0.38
Nodes (4): centerAspectCrop(), getCroppedImg(), handleCrop(), onImageLoad()

### Community 20 - "Community 20"
Cohesion: 0.29
Nodes (2): NavProjects(), useSidebar()

### Community 21 - "Community 21"
Cohesion: 0.33
Nodes (2): clsx(), cn()

### Community 22 - "Community 22"
Cohesion: 0.33
Nodes (2): CalendarClient(), useCalendarEvents()

### Community 23 - "Community 23"
Cohesion: 0.4
Nodes (1): MockSupabase

### Community 24 - "Community 24"
Cohesion: 0.4
Nodes (1): MockSupabase

### Community 25 - "Community 25"
Cohesion: 0.4
Nodes (1): MockSupabase

### Community 28 - "Community 28"
Cohesion: 0.5
Nodes (1): MockSupabase

### Community 32 - "Community 32"
Cohesion: 1.0
Nodes (2): DatePicker(), safeParseDate()

## Knowledge Gaps
- **Thin community `Community 20`** (7 nodes): `NavProjects()`, `cn()`, `handleKeyDown()`, `renderButton()`, `useSidebar()`, `nav-projects.tsx`, `sidebar.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 21`** (6 nodes): `clsx()`, `handleCancel()`, `handleSave()`, `editable-text.tsx`, `utils.ts`, `cn()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 22`** (6 nodes): `CalendarClient()`, `CalendarClient.tsx`, `useCalendarEvents.ts`, `buildQuery()`, `toISO()`, `useCalendarEvents()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 23`** (5 nodes): `MockSupabase`, `.constructor()`, `.setResponses()`, `.then()`, `management.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 24`** (5 nodes): `MockSupabase`, `.constructor()`, `.setResponses()`, `.then()`, `invite.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 25`** (5 nodes): `MockSupabase`, `.constructor()`, `.setResponses()`, `.then()`, `lifecycle-by-id.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 28`** (4 nodes): `MockSupabase`, `.constructor()`, `.then()`, `notifications.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 32`** (3 nodes): `DatePicker()`, `safeParseDate()`, `date-picker.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `json()` connect `Community 2` to `Community 0`, `Community 4`, `Community 7`, `Community 8`, `Community 14`, `Community 15`?**
  _High betweenness centrality (0.099) - this node is a cross-community bridge._
- **Why does `GET()` connect `Community 0` to `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 6`, `Community 8`, `Community 9`, `Community 10`?**
  _High betweenness centrality (0.093) - this node is a cross-community bridge._
- **Why does `createClient()` connect `Community 1` to `Community 0`, `Community 3`, `Community 4`, `Community 6`, `Community 9`, `Community 11`?**
  _High betweenness centrality (0.070) - this node is a cross-community bridge._
- **Are the 41 inferred relationships involving `GET()` (e.g. with `createOrgAndGo()` and `updateUnitDetailsAction()`) actually correct?**
  _`GET()` has 41 INFERRED edges - model-reasoned connections that need verification._
- **Are the 31 inferred relationships involving `POST()` (e.g. with `createClient()` and `json()`) actually correct?**
  _`POST()` has 31 INFERRED edges - model-reasoned connections that need verification._
- **Are the 25 inferred relationships involving `DELETE()` (e.g. with `getAuthContext()` and `createServiceClient()`) actually correct?**
  _`DELETE()` has 25 INFERRED edges - model-reasoned connections that need verification._
- **Are the 47 inferred relationships involving `createClient()` (e.g. with `CalendarPage()` and `loadCommunitiesPageContext()`) actually correct?**
  _`createClient()` has 47 INFERRED edges - model-reasoned connections that need verification._