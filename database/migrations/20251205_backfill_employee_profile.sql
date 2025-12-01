-- Preenche employee_profile para todos os membros existentes.
insert into public.employee_profile (org_id, user_id, cargo, data_entrada, time_principal_id)
select
  om.org_id,
  om.user_id,
  null as cargo,
  now()::date as data_entrada,
  null as time_principal_id
from public.org_members om
left join public.employee_profile ep
  on ep.org_id = om.org_id
 and ep.user_id = om.user_id
where ep.id is null;
