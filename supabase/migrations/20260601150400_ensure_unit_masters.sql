-- Backfill demo/customer data so each staffed unit has an active unit_master.
-- The effective unit role is stored in org_members.role; unit_members only links
-- users to units.

WITH units_without_active_master AS (
  SELECT u.id AS unit_id, u.org_id
  FROM public.units u
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.unit_members um
    JOIN public.org_members om
      ON om.org_id = u.org_id
     AND om.user_id = um.user_id
    JOIN public.profiles p
      ON p.id = um.user_id
    WHERE um.unit_id = u.id
      AND om.role = 'unit_master'::public.app_role
      AND COALESCE(p.disabled, false) = false
  )
),
ranked_candidates AS (
  SELECT
    uwam.unit_id,
    uwam.org_id,
    um.user_id,
    ROW_NUMBER() OVER (
      PARTITION BY uwam.unit_id
      ORDER BY p.full_name NULLS LAST, um.user_id
    ) AS candidate_rank
  FROM units_without_active_master uwam
  JOIN public.unit_members um
    ON um.unit_id = uwam.unit_id
  JOIN public.org_members om
    ON om.org_id = uwam.org_id
   AND om.user_id = um.user_id
  JOIN public.profiles p
    ON p.id = um.user_id
  WHERE om.role = 'unit_user'::public.app_role
    AND COALESCE(p.disabled, false) = false
),
selected_unit_managers AS (
  SELECT org_id, unit_id, user_id
  FROM ranked_candidates
  WHERE candidate_rank = 1
)
UPDATE public.org_members om
SET role = 'unit_master'::public.app_role
FROM selected_unit_managers manager
WHERE om.org_id = manager.org_id
  AND om.user_id = manager.user_id
  AND om.role = 'unit_user'::public.app_role;

WITH active_unit_managers AS (
  SELECT DISTINCT u.org_id, um.user_id
  FROM public.unit_members um
  JOIN public.units u
    ON u.id = um.unit_id
  JOIN public.org_members om
    ON om.org_id = u.org_id
   AND om.user_id = um.user_id
  JOIN public.profiles p
    ON p.id = um.user_id
  WHERE om.role = 'unit_master'::public.app_role
    AND COALESCE(p.disabled, false) = false
)
UPDATE public.employee_profile ep
SET
  cargo = 'Gerente de unidade',
  updated_at = now()
FROM active_unit_managers manager
WHERE ep.org_id = manager.org_id
  AND ep.user_id = manager.user_id
  AND COALESCE(BTRIM(ep.cargo), '') <> 'Gerente de unidade';

WITH active_unit_managers AS (
  SELECT DISTINCT u.org_id, um.user_id
  FROM public.unit_members um
  JOIN public.units u
    ON u.id = um.unit_id
  JOIN public.org_members om
    ON om.org_id = u.org_id
   AND om.user_id = um.user_id
  JOIN public.profiles p
    ON p.id = um.user_id
  WHERE om.role = 'unit_master'::public.app_role
    AND COALESCE(p.disabled, false) = false
)
INSERT INTO public.employee_profile (org_id, user_id, cargo)
SELECT manager.org_id, manager.user_id, 'Gerente de unidade'
FROM active_unit_managers manager
WHERE NOT EXISTS (
  SELECT 1
  FROM public.employee_profile ep
  WHERE ep.org_id = manager.org_id
    AND ep.user_id = manager.user_id
);
