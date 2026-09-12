"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import {
  useParams,
  useRouter,
} from "next/navigation";

import { supabase } from "../../../lib/supabase";


// =========================================
// TYPES
// =========================================

type Workspace = {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
};


type Project = {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  created_at: string;
};


type WorkspaceRole =
  | "owner"
  | "admin"
  | "member";


type Member = {
  user_id: string;
  role: WorkspaceRole;
  name: string;
  email: string;
};


// =========================================
// PAGE
// =========================================

export default function WorkspacePage() {
  const router = useRouter();

  const params =
    useParams<{
      workspaceId: string;
    }>();

  const workspaceId =
    params.workspaceId;


  // =========================================
  // DATA
  // =========================================

  const [workspace, setWorkspace] =
    useState<Workspace | null>(null);

  const [projects, setProjects] =
    useState<Project[]>([]);

  const [members, setMembers] =
    useState<Member[]>([]);

  const [role, setRole] =
    useState<WorkspaceRole | null>(
      null
    );


  // =========================================
  // CREATE PROJECT
  // =========================================

  const [
    projectName,
    setProjectName,
  ] =
    useState("");

  const [
    projectDescription,
    setProjectDescription,
  ] =
    useState("");

  const [creating, setCreating] =
    useState(false);


  // =========================================
  // MEMBER MANAGEMENT
  // =========================================

  const [
    memberEmail,
    setMemberEmail,
  ] =
    useState("");

  const [
    addingMember,
    setAddingMember,
  ] =
    useState(false);


  // =========================================
  // PAGE STATE
  // =========================================

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");


  // =========================================
  // LOAD
  // =========================================

  useEffect(() => {
    if (workspaceId) {
      loadWorkspace();
    }
  }, [workspaceId]);


  async function loadWorkspace() {
    setLoading(true);
    setError("");


    // -----------------------------------------
    // AUTH
    // -----------------------------------------

    const {
      data: { user },
      error: userError,
    } =
      await supabase.auth.getUser();


    if (
      userError ||
      !user
    ) {
      router.push("/login");
      return;
    }


    // -----------------------------------------
    // CURRENT USER MEMBERSHIP
    // -----------------------------------------

    const {
      data: membershipData,
      error: membershipError,
    } =
      await supabase
        .from("workspace_members")
        .select("role")
        .eq(
          "workspace_id",
          workspaceId
        )
        .eq(
          "user_id",
          user.id
        )
        .single();


    if (
      membershipError ||
      !membershipData
    ) {
      console.error(
        membershipError
      );

      setError(
        "You do not have access to this workspace."
      );

      setLoading(false);

      return;
    }


    const currentRole =
      membershipData.role as WorkspaceRole;

    setRole(
      currentRole
    );


    // -----------------------------------------
    // WORKSPACE
    // -----------------------------------------

    const {
      data: workspaceData,
      error: workspaceError,
    } =
      await supabase
        .from("workspaces")
        .select(
          "id, name, owner_id, created_at"
        )
        .eq(
          "id",
          workspaceId
        )
        .single();


    if (
      workspaceError ||
      !workspaceData
    ) {
      console.error(
        workspaceError
      );

      setError(
        "Failed to load workspace."
      );

      setLoading(false);

      return;
    }


    setWorkspace(
      workspaceData as Workspace
    );


    // -----------------------------------------
    // PROJECTS
    // -----------------------------------------

    const {
      data: projectData,
      error: projectError,
    } =
      await supabase
        .from("projects")
        .select(
          "id, workspace_id, name, description, created_at"
        )
        .eq(
          "workspace_id",
          workspaceId
        )
        .order(
          "created_at",
          {
            ascending: false,
          }
        );


    if (projectError) {
      console.error(
        projectError
      );

      setError(
        "Failed to load projects."
      );

      setLoading(false);

      return;
    }


    const projectList =
      (projectData ?? []) as Project[];

    setProjects(
      projectList
    );


    // -----------------------------------------
    // MEMBERS
    // -----------------------------------------

    const {
      data: memberData,
      error: memberError,
    } =
      await supabase
        .from("workspace_members")
        .select(
          "user_id, role"
        )
        .eq(
          "workspace_id",
          workspaceId
        );


    if (memberError) {
      console.error(
        memberError
      );

      setError(
        "Failed to load workspace members."
      );

      setLoading(false);

      return;
    }


    const rawMembers =
      memberData ?? [];


    if (
      rawMembers.length === 0
    ) {
      setMembers([]);
      setLoading(false);
      return;
    }


    const memberIds =
      rawMembers.map(
        (member) =>
          member.user_id
      );


    const {
      data: profileData,
      error: profileError,
    } =
      await supabase
        .from("profiles")
        .select(
          "id, name, email"
        )
        .in(
          "id",
          memberIds
        );


    if (profileError) {
      console.error(
        profileError
      );

      setError(
        "Failed to load member profiles."
      );

      setLoading(false);

      return;
    }


    const combinedMembers: Member[] =
      rawMembers.map(
        (member) => {
          const profile =
            (profileData ?? [])
              .find(
                (item) =>
                  item.id ===
                  member.user_id
              );


          return {
            user_id:
              member.user_id,

            role:
              member.role as WorkspaceRole,

            name:
              profile?.name ??
              "Unknown User",

            email:
              profile?.email ??
              "",
          };
        }
      );


    const roleOrder: Record<
      WorkspaceRole,
      number
    > = {
      owner: 0,
      admin: 1,
      member: 2,
    };


    combinedMembers.sort(
      (a, b) =>
        roleOrder[a.role] -
        roleOrder[b.role]
    );


    setMembers(
      combinedMembers
    );

    setLoading(false);
  }


  // =========================================
  // CREATE PROJECT
  // =========================================

  async function handleCreateProject(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");


    if (
      !projectName.trim()
    ) {
      setError(
        "Please enter a project name."
      );

      return;
    }


    setCreating(true);


    const {
      error: createError,
    } =
      await supabase.rpc(
        "create_project",
        {
          target_workspace_id:
            workspaceId,

          project_name:
            projectName.trim(),

          project_description:
            projectDescription.trim()
              || null,
        }
      );


    setCreating(false);


    if (createError) {
      console.error(
        createError
      );

      setError(
        createError.message
      );

      return;
    }


    setProjectName("");
    setProjectDescription("");

    await loadWorkspace();
  }


  // =========================================
  // ADD MEMBER
  // =========================================

  async function handleAddMember(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");


    if (
      !memberEmail.trim()
    ) {
      setError(
        "Please enter a member email."
      );

      return;
    }


    setAddingMember(true);


    const {
      error: addError,
    } =
      await supabase.rpc(
        "add_workspace_member",
        {
          target_workspace_id:
            workspaceId,

          member_email:
            memberEmail.trim(),
        }
      );


    setAddingMember(false);


    if (addError) {
      console.error(
        addError
      );

      setError(
        addError.message
      );

      return;
    }


    setMemberEmail("");

    await loadWorkspace();
  }


  // =========================================
  // CHANGE ROLE
  // =========================================

  async function handleRoleChange(
    userId: string,
    newRole:
      | "admin"
      | "member"
  ) {
    setError("");


    const {
      error: roleError,
    } =
      await supabase.rpc(
        "update_workspace_member_role",
        {
          target_workspace_id:
            workspaceId,

          target_user_id:
            userId,

          new_role:
            newRole,
        }
      );


    if (roleError) {
      console.error(
        roleError
      );

      setError(
        roleError.message
      );

      return;
    }


    await loadWorkspace();
  }


  // =========================================
  // REMOVE MEMBER
  // =========================================

  async function handleRemoveMember(
    userId: string
  ) {
    const confirmed =
      window.confirm(
        "Remove this member from the workspace?"
      );


    if (!confirmed) {
      return;
    }


    setError("");


    const {
      error: removeError,
    } =
      await supabase.rpc(
        "remove_workspace_member",
        {
          target_workspace_id:
            workspaceId,

          target_user_id:
            userId,
        }
      );


    if (removeError) {
      console.error(
        removeError
      );

      setError(
        removeError.message
      );

      return;
    }


    await loadWorkspace();
  }


  // =========================================
  // LOADING
  // =========================================

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50">

        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

          <div className="animate-pulse">

            <div className="h-4 w-36 rounded bg-slate-200" />


            <div className="mt-8 flex items-center gap-4">

              <div className="h-12 w-12 rounded-xl bg-slate-200" />

              <div>

                <div className="h-8 w-64 rounded bg-slate-200" />

                <div className="mt-3 h-4 w-80 rounded bg-slate-200" />

              </div>

            </div>


            <div className="mt-10 h-64 rounded-2xl bg-white shadow-sm" />


            <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">

              <div className="h-44 rounded-2xl bg-white shadow-sm" />

              <div className="h-44 rounded-2xl bg-white shadow-sm" />

            </div>


            <div className="mt-10 h-72 rounded-2xl bg-white shadow-sm" />

          </div>

        </div>

      </main>
    );
  }


  // =========================================
  // ACCESS ERROR
  // =========================================

  if (!workspace) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">

        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">

          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-xl font-bold text-red-600">
            !
          </div>


          <h1 className="mt-4 text-xl font-bold text-slate-900">
            Workspace unavailable
          </h1>


          <p className="mt-2 text-sm text-slate-500">
            {error ||
              "The workspace could not be loaded."}
          </p>


          <button
            type="button"
            onClick={() =>
              router.push(
                "/dashboard"
              )
            }
            className="mt-6 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Back to Dashboard
          </button>

        </div>

      </main>
    );
  }


  // =========================================
  // PERMISSIONS
  // =========================================

  const canManageProjects =
    role === "owner" ||
    role === "admin";


  const canAddMembers =
    role === "owner" ||
    role === "admin";


  const canManageRoles =
    role === "owner";


  const adminCount =
    members.filter(
      (member) =>
        member.role === "admin"
    ).length;


  // =========================================
  // PAGE
  // =========================================

  return (
    <main className="min-h-screen bg-slate-50">

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">


        {/* =====================================
            BACK
        ===================================== */}

        <button
          type="button"
          onClick={() =>
            router.push(
              "/dashboard"
            )
          }
          className="group flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
        >

          <span className="transition group-hover:-translate-x-1">
            ←
          </span>

          Back to Dashboard

        </button>


        {/* =====================================
            WORKSPACE HEADER
        ===================================== */}

        <header className="mt-7 flex flex-col gap-5 border-b border-slate-200 pb-8 sm:flex-row sm:items-end sm:justify-between">

          <div>

            <div className="flex items-center gap-3">

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-xl font-bold text-white shadow-sm">

                {workspace.name
                  .charAt(0)
                  .toUpperCase()}

              </div>


              <div>

                <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                  Workspace
                </p>


                <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                  {workspace.name}
                </h1>

              </div>

            </div>


            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-500">
              Manage projects, team members and
              collaboration from one workspace.
            </p>

          </div>


          <RoleBadge
            role={
              role ??
              "member"
            }
          />

        </header>


        {/* =====================================
            ERROR
        ===================================== */}

        {error && (

          <div className="mt-6 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>

        )}


        {/* =====================================
            OVERVIEW
        ===================================== */}

        <section className="mt-8 grid gap-4 sm:grid-cols-3">

          <StatCard
            label="Projects"
            value={
              projects.length
            }
            description="Projects in this workspace"
          />


          <StatCard
            label="Members"
            value={
              members.length
            }
            description="People with workspace access"
          />


          <StatCard
            label="Admins"
            value={
              adminCount
            }
            description="Members with admin access"
          />

        </section>


        {/* =====================================
            CREATE PROJECT
        ===================================== */}

        {canManageProjects && (

          <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

            <div className="border-b border-slate-100 px-6 py-5">

              <h2 className="text-lg font-semibold text-slate-900">
                Create Project
              </h2>


              <p className="mt-1 text-sm text-slate-500">
                Add a new project inside this workspace.
              </p>

            </div>


            <form
              onSubmit={
                handleCreateProject
              }
              className="space-y-5 p-6"
            >

              <div>

                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Project name
                </label>


                <input
                  type="text"
                  value={
                    projectName
                  }
                  onChange={(event) =>
                    setProjectName(
                      event.target.value
                    )
                  }
                  placeholder="e.g. FlowBoard Development"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                />

              </div>


              <div>

                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Description
                </label>


                <textarea
                  value={
                    projectDescription
                  }
                  onChange={(event) =>
                    setProjectDescription(
                      event.target.value
                    )
                  }
                  placeholder="Describe the purpose of this project..."
                  rows={3}
                  className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                />

              </div>


              <div className="flex justify-end">

                <button
                  type="submit"
                  disabled={
                    creating
                  }
                  className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >

                  {creating
                    ? "Creating..."
                    : "+ Create Project"}

                </button>

              </div>

            </form>

          </section>

        )}


        {/* =====================================
            PROJECTS
        ===================================== */}

        <section className="mt-10">

          <div className="flex items-end justify-between">

            <div>

              <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                Work
              </p>


              <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
                Projects
              </h2>


              <p className="mt-2 text-sm text-slate-500">
                Open a project to manage its tasks and board.
              </p>

            </div>


            <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-600">
              {projects.length}
            </span>

          </div>


          {projects.length === 0 ? (

            <div className="mt-6 flex min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-xl font-bold text-blue-600">
                +
              </div>


              <h3 className="mt-4 font-semibold text-slate-900">
                No projects yet
              </h3>


              <p className="mt-2 text-sm text-slate-500">

                {canManageProjects
                  ? "Create the first project above."
                  : "An owner or admin has not created a project yet."}

              </p>

            </div>

          ) : (

            <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">

              {projects.map(
                (project) => (

                  <button
                    key={
                      project.id
                    }
                    type="button"
                    onClick={() =>
                      router.push(
                        `/workspace/${workspaceId}/project/${project.id}`
                      )
                    }
                    className="group rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-md"
                  >

                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-sm font-bold text-white transition group-hover:bg-blue-600">

                      {project.name
                        .charAt(0)
                        .toUpperCase()}

                    </div>


                    <h3 className="mt-5 text-lg font-semibold text-slate-900 transition group-hover:text-blue-600">
                      {project.name}
                    </h3>


                    <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-slate-500">

                      {project.description ||
                        "No description"}

                    </p>


                    <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">

                      <span className="text-xs text-slate-400">

                        {new Date(
                          project.created_at
                        ).toLocaleDateString()}

                      </span>


                      <span className="text-sm font-semibold text-blue-600 opacity-0 transition group-hover:opacity-100">
                        Open →
                      </span>

                    </div>

                  </button>

                )
              )}

            </div>

          )}

        </section>


        {/* =====================================
            MEMBERS
        ===================================== */}

        <section className="mt-10 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="flex flex-col gap-4 border-b border-slate-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">

            <div>

              <h2 className="text-lg font-semibold text-slate-900">
                Workspace Members
              </h2>


              <p className="mt-1 text-sm text-slate-500">
                Manage team access and workspace roles.
              </p>

            </div>


            <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">

              {members.length}{" "}

              {members.length === 1
                ? "member"
                : "members"}

            </span>

          </div>


          {/* ADD MEMBER */}

          {canAddMembers && (

            <form
              onSubmit={
                handleAddMember
              }
              className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/60 p-6 sm:flex-row"
            >

              <input
                type="email"
                value={
                  memberEmail
                }
                onChange={(event) =>
                  setMemberEmail(
                    event.target.value
                  )
                }
                placeholder="Registered FlowBoard user email"
                className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
              />


              <button
                type="submit"
                disabled={
                  addingMember
                }
                className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >

                {addingMember
                  ? "Adding..."
                  : "+ Add Member"}

              </button>

            </form>

          )}


          {/* MEMBER LIST */}

          <div className="divide-y divide-slate-100">

            {members.map(
              (member) => (

                <div
                  key={
                    member.user_id
                  }
                  className="flex flex-col gap-4 px-6 py-5 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
                >

                  <div className="flex items-center gap-4">

                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">

                      {member.name
                        .charAt(0)
                        .toUpperCase()}

                    </div>


                    <div>

                      <div className="flex flex-wrap items-center gap-2">

                        <p className="font-semibold text-slate-900">
                          {member.name}
                        </p>


                        <RoleBadge
                          role={
                            member.role
                          }
                        />

                      </div>


                      <p className="mt-1 text-sm text-slate-500">
                        {member.email}
                      </p>

                    </div>

                  </div>


                  {/* OWNER CONTROLS */}

                  {member.role !==
                    "owner" &&
                    canManageRoles && (

                    <div className="flex items-center gap-2">

                      <select
                        value={
                          member.role
                        }
                        onChange={(event) =>
                          handleRoleChange(
                            member.user_id,
                            event.target.value as "admin" | "member"
                          )
                        }
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-600 outline-none focus:border-blue-500"
                      >

                        <option value="member">
                          Member
                        </option>

                        <option value="admin">
                          Admin
                        </option>

                      </select>


                      <button
                        type="button"
                        onClick={() =>
                          handleRemoveMember(
                            member.user_id
                          )
                        }
                        className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100"
                      >
                        Remove
                      </button>

                    </div>

                  )}

                </div>

              )
            )}

          </div>

        </section>

      </div>

    </main>
  );
}


// =========================================
// STAT CARD
// =========================================

type StatCardProps = {
  label: string;
  value: number;
  description: string;
};


function StatCard({
  label,
  value,
  description,
}: StatCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>


      <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
        {value}
      </p>


      <p className="mt-1 text-sm text-slate-500">
        {description}
      </p>

    </div>
  );
}


// =========================================
// ROLE BADGE
// =========================================

type RoleBadgeProps = {
  role: WorkspaceRole;
};


function RoleBadge({
  role,
}: RoleBadgeProps) {

  if (
    role === "owner"
  ) {
    return (
      <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold capitalize text-purple-700 ring-1 ring-inset ring-purple-100">
        Owner
      </span>
    );
  }


  if (
    role === "admin"
  ) {
    return (
      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold capitalize text-blue-700 ring-1 ring-inset ring-blue-100">
        Admin
      </span>
    );
  }


  return (
    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-600 ring-1 ring-inset ring-slate-200">
      Member
    </span>
  );
}