-- Módulo de Cursos (learning)

-- Cursos
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  unit_id uuid null references public.units(id) on delete set null,
  title text not null,
  description text,
  cover_url text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  tags text[] not null default '{}',
  carga_horaria integer,
  avaliacao_media numeric(3,2) not null default 0,
  quantidade_avaliacoes integer not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_courses_org_status on public.courses(org_id, status, updated_at desc);
create index if not exists idx_courses_unit on public.courses(unit_id);

-- Aulas
create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  description text,
  ordem integer not null default 1,
  content_html text,
  video_url text,
  liberada boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_lessons_course_order on public.lessons(course_id, ordem);

-- Anexos
create table if not exists public.lesson_attachments (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  file_name text not null,
  file_url text not null,
  mime_type text,
  size bigint,
  created_at timestamptz not null default now()
);

create index if not exists idx_attachments_lesson on public.lesson_attachments(lesson_id);

-- Quizzes
create table if not exists public.lesson_quizzes (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  question text not null,
  alternatives text[] not null,
  correct_index integer not null,
  ordem integer not null default 1,
  created_at timestamptz not null default now()
);

do $$
begin
  alter table public.lesson_quizzes
    add constraint lesson_quizzes_correct_index check (correct_index >= 0);
exception
  when duplicate_object then null;
end $$;

create index if not exists idx_quizzes_lesson on public.lesson_quizzes(lesson_id, ordem);

-- Provas finais
create table if not exists public.exams (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  nota_minima_aprovacao numeric(4,2) not null default 0,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_exams_course_unique on public.exams(course_id);

create table if not exists public.exam_questions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  question text not null,
  alternatives text[] not null,
  correct_index integer not null,
  ordem integer not null default 1,
  created_at timestamptz not null default now()
);

do $$
begin
  alter table public.exam_questions
    add constraint exam_questions_correct_index check (correct_index >= 0);
exception
  when duplicate_object then null;
end $$;

create index if not exists idx_exam_questions_exam on public.exam_questions(exam_id, ordem);

-- Progresso
create table if not exists public.course_progress (
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  status text not null default 'nao_iniciado' check (status in ('nao_iniciado','em_andamento','concluido')),
  nota_quiz numeric(4,2),
  nota_prova_final numeric(4,2),
  data_conclusao timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint course_progress_pk primary key (user_id, lesson_id)
);

create index if not exists idx_course_progress_course_user on public.course_progress(course_id, user_id);

-- Avaliações de curso
create table if not exists public.course_reviews (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

create index if not exists idx_course_reviews_course on public.course_reviews(course_id);
create unique index if not exists idx_course_reviews_unique_per_user on public.course_reviews(course_id, user_id);

-- RLS
alter table public.courses enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_attachments enable row level security;
alter table public.lesson_quizzes enable row level security;
alter table public.exams enable row level security;
alter table public.exam_questions enable row level security;
alter table public.course_progress enable row level security;
alter table public.course_reviews enable row level security;

-- Helper expressions
-- Org membership
drop policy if exists courses_select_org on public.courses;
create policy courses_select_org on public.courses for select using (
  exists (
    select 1 from public.org_members om
    where om.user_id = auth.uid() and om.org_id = courses.org_id
  )
  and (
    status = 'published' or
    exists (
      select 1 from public.org_members om2
      where om2.user_id = auth.uid()
      and om2.org_id = courses.org_id
      and om2.role in ('org_admin','org_master','unit_master')
    )
  )
  and (
    courses.unit_id is null or
    exists (
      select 1 from public.unit_members um
      where um.user_id = auth.uid() and um.unit_id = courses.unit_id
    ) or
    exists (
      select 1 from public.org_members om3
      where om3.user_id = auth.uid() and om3.org_id = courses.org_id and om3.role in ('org_admin','org_master')
    )
  )
);

drop policy if exists courses_insert_admin on public.courses;
create policy courses_insert_admin on public.courses for insert with check (
  exists (
    select 1 from public.org_members om
    where om.user_id = auth.uid()
    and om.org_id = courses.org_id
    and om.role in ('org_admin','org_master','unit_master')
  )
);

drop policy if exists courses_update_admin on public.courses;
create policy courses_update_admin on public.courses for update using (
  exists (
    select 1 from public.org_members om
    where om.user_id = auth.uid()
    and om.org_id = courses.org_id
    and om.role in ('org_admin','org_master','unit_master')
  )
);

drop policy if exists courses_delete_admin on public.courses;
create policy courses_delete_admin on public.courses for delete using (
  exists (
    select 1 from public.org_members om
    where om.user_id = auth.uid()
    and om.org_id = courses.org_id
    and om.role in ('org_admin','org_master','unit_master')
  )
);

-- Lessons and related follow course permissions
drop policy if exists lessons_select on public.lessons;
create policy lessons_select on public.lessons for select using (
  exists (
    select 1 from public.courses c
    where c.id = lessons.course_id
    and exists (
      select 1 from public.org_members om
      where om.user_id = auth.uid() and om.org_id = c.org_id
    )
    and (
      c.status = 'published' or
      exists (
        select 1 from public.org_members om2
        where om2.user_id = auth.uid() and om2.org_id = c.org_id and om2.role in ('org_admin','org_master','unit_master')
      )
    )
  )
);

drop policy if exists lessons_write on public.lessons;
create policy lessons_write on public.lessons for insert with check (
  exists (
    select 1 from public.courses c
    join public.org_members om on om.org_id = c.org_id and om.user_id = auth.uid()
    where c.id = lessons.course_id and om.role in ('org_admin','org_master','unit_master')
  )
);
drop policy if exists lessons_update on public.lessons;
create policy lessons_update on public.lessons for update using (
  exists (
    select 1 from public.courses c
    join public.org_members om on om.org_id = c.org_id and om.user_id = auth.uid()
    where c.id = lessons.course_id and om.role in ('org_admin','org_master','unit_master')
  )
);
drop policy if exists lessons_delete on public.lessons;
create policy lessons_delete on public.lessons for delete using (
  exists (
    select 1 from public.courses c
    join public.org_members om on om.org_id = c.org_id and om.user_id = auth.uid()
    where c.id = lessons.course_id and om.role in ('org_admin','org_master','unit_master')
  )
);

-- Attachments
drop policy if exists attachments_select on public.lesson_attachments;
create policy attachments_select on public.lesson_attachments for select using (
  exists (
    select 1 from public.lessons l
    join public.courses c on c.id = l.course_id
    where l.id = lesson_attachments.lesson_id
    and exists (select 1 from public.org_members om where om.user_id = auth.uid() and om.org_id = c.org_id)
  )
);
drop policy if exists attachments_write on public.lesson_attachments;
create policy attachments_write on public.lesson_attachments for insert with check (
  exists (
    select 1 from public.lessons l
    join public.courses c on c.id = l.course_id
    join public.org_members om on om.org_id = c.org_id and om.user_id = auth.uid()
    where l.id = lesson_attachments.lesson_id and om.role in ('org_admin','org_master','unit_master')
  )
);
drop policy if exists attachments_delete on public.lesson_attachments;
create policy attachments_delete on public.lesson_attachments for delete using (
  exists (
    select 1 from public.lessons l
    join public.courses c on c.id = l.course_id
    join public.org_members om on om.org_id = c.org_id and om.user_id = auth.uid()
    where l.id = lesson_attachments.lesson_id and om.role in ('org_admin','org_master','unit_master')
  )
);

-- Quizzes
drop policy if exists quizzes_select on public.lesson_quizzes;
create policy quizzes_select on public.lesson_quizzes for select using (
  exists (
    select 1 from public.lessons l
    join public.courses c on c.id = l.course_id
    where l.id = lesson_quizzes.lesson_id
    and exists (select 1 from public.org_members om where om.user_id = auth.uid() and om.org_id = c.org_id)
  )
);
drop policy if exists quizzes_write on public.lesson_quizzes;
create policy quizzes_write on public.lesson_quizzes for insert with check (
  exists (
    select 1 from public.lessons l
    join public.courses c on c.id = l.course_id
    join public.org_members om on om.org_id = c.org_id and om.user_id = auth.uid()
    where l.id = lesson_quizzes.lesson_id and om.role in ('org_admin','org_master','unit_master')
  )
);
drop policy if exists quizzes_update on public.lesson_quizzes;
create policy quizzes_update on public.lesson_quizzes for update using (
  exists (
    select 1 from public.lessons l
    join public.courses c on c.id = l.course_id
    join public.org_members om on om.org_id = c.org_id and om.user_id = auth.uid()
    where l.id = lesson_quizzes.lesson_id and om.role in ('org_admin','org_master','unit_master')
  )
);
drop policy if exists quizzes_delete on public.lesson_quizzes;
create policy quizzes_delete on public.lesson_quizzes for delete using (
  exists (
    select 1 from public.lessons l
    join public.courses c on c.id = l.course_id
    join public.org_members om on om.org_id = c.org_id and om.user_id = auth.uid()
    where l.id = lesson_quizzes.lesson_id and om.role in ('org_admin','org_master','unit_master')
  )
);

-- Exams
drop policy if exists exams_select on public.exams;
create policy exams_select on public.exams for select using (
  exists (
    select 1 from public.courses c
    where c.id = exams.course_id
    and exists (select 1 from public.org_members om where om.user_id = auth.uid() and om.org_id = c.org_id)
  )
);
drop policy if exists exams_write on public.exams;
create policy exams_write on public.exams for insert with check (
  exists (
    select 1 from public.courses c
    join public.org_members om on om.org_id = c.org_id and om.user_id = auth.uid()
    where c.id = exams.course_id and om.role in ('org_admin','org_master','unit_master')
  )
);
drop policy if exists exams_update on public.exams;
create policy exams_update on public.exams for update using (
  exists (
    select 1 from public.courses c
    join public.org_members om on om.org_id = c.org_id and om.user_id = auth.uid()
    where c.id = exams.course_id and om.role in ('org_admin','org_master','unit_master')
  )
);
drop policy if exists exams_delete on public.exams;
create policy exams_delete on public.exams for delete using (
  exists (
    select 1 from public.courses c
    join public.org_members om on om.org_id = c.org_id and om.user_id = auth.uid()
    where c.id = exams.course_id and om.role in ('org_admin','org_master','unit_master')
  )
);

-- Exam questions
drop policy if exists exam_questions_select on public.exam_questions;
create policy exam_questions_select on public.exam_questions for select using (
  exists (
    select 1 from public.exams e
    join public.courses c on c.id = e.course_id
    where e.id = exam_questions.exam_id
    and exists (select 1 from public.org_members om where om.user_id = auth.uid() and om.org_id = c.org_id)
  )
);
drop policy if exists exam_questions_write on public.exam_questions;
create policy exam_questions_write on public.exam_questions for insert with check (
  exists (
    select 1 from public.exams e
    join public.courses c on c.id = e.course_id
    join public.org_members om on om.org_id = c.org_id and om.user_id = auth.uid()
    where e.id = exam_questions.exam_id and om.role in ('org_admin','org_master','unit_master')
  )
);
drop policy if exists exam_questions_update on public.exam_questions;
create policy exam_questions_update on public.exam_questions for update using (
  exists (
    select 1 from public.exams e
    join public.courses c on c.id = e.course_id
    join public.org_members om on om.org_id = c.org_id and om.user_id = auth.uid()
    where e.id = exam_questions.exam_id and om.role in ('org_admin','org_master','unit_master')
  )
);
drop policy if exists exam_questions_delete on public.exam_questions;
create policy exam_questions_delete on public.exam_questions for delete using (
  exists (
    select 1 from public.exams e
    join public.courses c on c.id = e.course_id
    join public.org_members om on om.org_id = c.org_id and om.user_id = auth.uid()
    where e.id = exam_questions.exam_id and om.role in ('org_admin','org_master','unit_master')
  )
);

-- Course progress
drop policy if exists progress_select on public.course_progress;
create policy progress_select on public.course_progress for select using (
  user_id = auth.uid() or exists (
    select 1 from public.org_members om
    join public.courses c on c.id = course_progress.course_id and c.org_id = om.org_id
    where om.user_id = auth.uid() and om.role in ('org_admin','org_master','unit_master')
  )
);
drop policy if exists progress_insert on public.course_progress;
create policy progress_insert on public.course_progress for insert with check (
  user_id = auth.uid()
);
drop policy if exists progress_update on public.course_progress;
create policy progress_update on public.course_progress for update using (
  user_id = auth.uid() or exists (
    select 1 from public.org_members om
    join public.courses c on c.id = course_progress.course_id and c.org_id = om.org_id
    where om.user_id = auth.uid() and om.role in ('org_admin','org_master','unit_master')
  )
);

-- Course reviews
drop policy if exists reviews_select on public.course_reviews;
create policy reviews_select on public.course_reviews for select using (
  exists (
    select 1 from public.courses c
    where c.id = course_reviews.course_id
    and exists (select 1 from public.org_members om where om.user_id = auth.uid() and om.org_id = c.org_id)
  )
);
drop policy if exists reviews_insert on public.course_reviews;
create policy reviews_insert on public.course_reviews for insert with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.courses c
    where c.id = course_reviews.course_id
    and c.status = 'published'
    and exists (select 1 from public.org_members om where om.user_id = auth.uid() and om.org_id = c.org_id)
  )
);
drop policy if exists reviews_delete_admin on public.course_reviews;
create policy reviews_delete_admin on public.course_reviews for delete using (
  exists (
    select 1 from public.courses c
    join public.org_members om on om.org_id = c.org_id and om.user_id = auth.uid()
    where c.id = course_reviews.course_id and om.role in ('org_admin','org_master','unit_master')
  )
);
