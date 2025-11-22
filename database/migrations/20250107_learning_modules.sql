-- Módulo de Cursos — Módulos e vínculo de aulas

create table if not exists public.course_modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  ordem integer not null default 1,
  created_at timestamptz not null default now()
);

create index if not exists idx_course_modules_course_order on public.course_modules(course_id, ordem);

alter table if exists public.lessons
  add column if not exists module_id uuid references public.course_modules(id) on delete set null;

create index if not exists idx_lessons_module on public.lessons(module_id);

alter table public.course_modules enable row level security;

drop policy if exists modules_select on public.course_modules;
create policy modules_select on public.course_modules for select using (
  exists (
    select 1 from public.courses c
    where c.id = course_modules.course_id
    and exists (select 1 from public.org_members om where om.user_id = auth.uid() and om.org_id = c.org_id)
  )
);

drop policy if exists modules_insert on public.course_modules;
create policy modules_insert on public.course_modules for insert with check (
  exists (
    select 1 from public.courses c
    join public.org_members om on om.org_id = c.org_id and om.user_id = auth.uid()
    where c.id = course_modules.course_id and om.role in ('org_admin','org_master','unit_master')
  )
);

drop policy if exists modules_update on public.course_modules;
create policy modules_update on public.course_modules for update using (
  exists (
    select 1 from public.courses c
    join public.org_members om on om.org_id = c.org_id and om.user_id = auth.uid()
    where c.id = course_modules.course_id and om.role in ('org_admin','org_master','unit_master')
  )
);

drop policy if exists modules_delete on public.course_modules;
create policy modules_delete on public.course_modules for delete using (
  exists (
    select 1 from public.courses c
    join public.org_members om on om.org_id = c.org_id and om.user_id = auth.uid()
    where c.id = course_modules.course_id and om.role in ('org_admin','org_master','unit_master')
  )
);
