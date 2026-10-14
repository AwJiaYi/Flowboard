-- FlowBoard: owner-only workspace deletion
-- Run this script in Supabase SQL Editor before using the Delete Workspace button.

create or replace function public.delete_workspace(target_workspace_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only the authenticated workspace owner may delete it.
  if not exists (
    select 1
    from public.workspaces
    where id = target_workspace_id
      and owner_id = auth.uid()
  ) then
    raise exception 'Only the workspace owner can delete this workspace.';
  end if;

  -- Delete child records explicitly so this works even if every FK is not ON DELETE CASCADE.
  delete from public.comments
  where task_id in (
    select t.id
    from public.tasks t
    join public.projects p on p.id = t.project_id
    where p.workspace_id = target_workspace_id
  );

  delete from public.activity_logs
  where workspace_id = target_workspace_id;

  delete from public.tasks
  where project_id in (
    select id
    from public.projects
    where workspace_id = target_workspace_id
  );

  delete from public.projects
  where workspace_id = target_workspace_id;

  delete from public.workspace_members
  where workspace_id = target_workspace_id;

  delete from public.workspaces
  where id = target_workspace_id
    and owner_id = auth.uid();
end;
$$;

revoke all on function public.delete_workspace(uuid) from public;
grant execute on function public.delete_workspace(uuid) to authenticated;
