"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import { supabase } from "../../lib/supabase";


// =========================================
// TYPES
// =========================================

type Profile = {
  id: string;
  name: string;
  email: string;
};


type Membership = {
  workspace_id: string;
  role:
    | "owner"
    | "admin"
    | "member";
};


type Workspace = {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
};


type WorkspaceWithRole =
  Workspace & {
    role:
      | "owner"
      | "admin"
      | "member";
  };


// =========================================
// PAGE
// =========================================

export default function DashboardPage() {
  const router =
    useRouter();


  // =========================================
  // STATE
  // =========================================

  const [profile, setProfile] =
    useState<Profile | null>(null);

  const [
    workspaces,
    setWorkspaces,
  ] =
    useState<
      WorkspaceWithRole[]
    >([]);


  const [
    workspaceName,
    setWorkspaceName,
  ] =
    useState("");


  const [loading, setLoading] =
    useState(true);

  const [creating, setCreating] =
    useState(false);

  const [error, setError] =
    useState("");


  // =========================================
  // LOAD
  // =========================================

  useEffect(() => {
    loadDashboard();
  }, []);


  async function loadDashboard() {
    setLoading(true);
    setError("");


    // -----------------------------------------
    // AUTH USER
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
    // PROFILE
    // -----------------------------------------

    const {
      data: profileData,
      error: profileError,
    } =
      await supabase
        .from("profiles")
        .select(
          "id, name, email"
        )
        .eq(
          "id",
          user.id
        )
        .single();


    if (
      profileError ||
      !profileData
    ) {
      console.error(
        profileError
      );

      setError(
        "Failed to load your profile."
      );

      setLoading(false);

      return;
    }


    setProfile(
      profileData as Profile
    );


    // -----------------------------------------
    // MEMBERSHIPS
    // -----------------------------------------

    const {
      data: membershipData,
      error: membershipError,
    } =
      await supabase
        .from(
          "workspace_members"
        )
        .select(
          "workspace_id, role"
        )
        .eq(
          "user_id",
          user.id
        );


    if (membershipError) {
      console.error(
        membershipError
      );

      setError(
        "Failed to load workspace memberships."
      );

      setLoading(false);

      return;
    }


    const memberships =
      (membershipData ??
        []) as Membership[];


    if (
      memberships.length === 0
    ) {
      setWorkspaces([]);
      setLoading(false);
      return;
    }


    // -----------------------------------------
    // WORKSPACES
    // -----------------------------------------

    const workspaceIds =
      memberships.map(
        (membership) =>
          membership.workspace_id
      );


    const {
      data: workspaceData,
      error: workspaceError,
    } =
      await supabase
        .from("workspaces")
        .select(
          "id, name, owner_id, created_at"
        )
        .in(
          "id",
          workspaceIds
        )
        .order(
          "created_at",
          {
            ascending: false,
          }
        );


    if (workspaceError) {
      console.error(
        workspaceError
      );

      setError(
        "Failed to load workspaces."
      );

      setLoading(false);

      return;
    }


    const combined: WorkspaceWithRole[] =
      (
        (workspaceData ??
          []) as Workspace[]
      ).map(
        (
          workspace:
            Workspace
        ) => {
          const membership =
            memberships.find(
              (
                item:
                  Membership
              ) =>
                item.workspace_id ===
                workspace.id
            );


          return {
            ...workspace,

            role:
              membership?.role ??
              "member",
          };
        }
      );


    setWorkspaces(
      combined
    );

    setLoading(false);
  }


  // =========================================
  // CREATE WORKSPACE
  // =========================================

  async function handleCreateWorkspace(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");


    if (
      !workspaceName.trim()
    ) {
      setError(
        "Please enter a workspace name."
      );

      return;
    }


    setCreating(true);


    const {
      error: createError,
    } =
      await supabase.rpc(
        "create_workspace",
        {
          workspace_name:
            workspaceName.trim(),
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


    setWorkspaceName("");

    await loadDashboard();
  }


  // =========================================
  // LOGOUT
  // =========================================

  async function handleLogout() {
    await supabase.auth.signOut();

    router.push("/login");
  }


  // =========================================
  // LOADING
  // =========================================

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50">

        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

          <div className="animate-pulse">

            <div className="flex items-center justify-between">

              <div>

                <div className="h-8 w-40 rounded bg-slate-200" />

                <div className="mt-3 h-4 w-56 rounded bg-slate-200" />

              </div>


              <div className="h-10 w-24 rounded-xl bg-slate-200" />

            </div>


            <div className="mt-10 h-56 rounded-2xl bg-white shadow-sm" />


            <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">

              <div className="h-44 rounded-2xl bg-white shadow-sm" />

              <div className="h-44 rounded-2xl bg-white shadow-sm" />

              <div className="h-44 rounded-2xl bg-white shadow-sm" />

            </div>

          </div>

        </div>

      </main>
    );
  }


  // =========================================
  // PAGE
  // =========================================

  return (
    <main className="min-h-screen bg-slate-50">

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">


        {/* =====================================
            HEADER
        ===================================== */}

        <header className="flex flex-col gap-5 border-b border-slate-200 pb-8 sm:flex-row sm:items-center sm:justify-between">

          <div>

            <div className="flex items-center gap-3">

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-lg font-bold text-white shadow-sm">
                F
              </div>


              <div>

                <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                  Workspace Dashboard
                </p>


                <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                  FlowBoard
                </h1>

              </div>

            </div>


            <p className="mt-4 text-sm text-slate-500">
              Welcome back,{" "}
              <span className="font-medium text-slate-700">
                {profile?.name ??
                  "User"}
              </span>
              .
            </p>

          </div>


          <div className="flex items-center gap-3">

            <div className="hidden rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-right shadow-sm sm:block">

              <p className="text-xs text-slate-400">
                Signed in as
              </p>


              <p className="max-w-52 truncate text-sm font-medium text-slate-700">
                {profile?.email}
              </p>

            </div>


            <button
              type="button"
              onClick={
                handleLogout
              }
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-100 hover:text-slate-900"
            >
              Logout
            </button>

          </div>

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

        <section className="mt-8 grid gap-4 sm:grid-cols-2">

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Workspaces
            </p>


            <p className="mt-2 text-3xl font-bold text-slate-950">
              {workspaces.length}
            </p>


            <p className="mt-1 text-sm text-slate-500">
              Teams and projects you can access.
            </p>

          </div>


          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Owned
            </p>


            <p className="mt-2 text-3xl font-bold text-slate-950">
              {
                workspaces.filter(
                  (workspace) =>
                    workspace.role ===
                    "owner"
                ).length
              }
            </p>


            <p className="mt-1 text-sm text-slate-500">
              Workspaces where you are the owner.
            </p>

          </div>

        </section>


        {/* =====================================
            CREATE WORKSPACE
        ===================================== */}

        <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="border-b border-slate-100 px-6 py-5">

            <h2 className="text-lg font-semibold text-slate-900">
              Create Workspace
            </h2>


            <p className="mt-1 text-sm text-slate-500">
              Start a new workspace for your team or project.
            </p>

          </div>


          <form
            onSubmit={
              handleCreateWorkspace
            }
            className="flex flex-col gap-3 p-6 sm:flex-row"
          >

            <input
              type="text"
              value={
                workspaceName
              }
              onChange={(event) =>
                setWorkspaceName(
                  event.target.value
                )
              }
              placeholder="e.g. Software Engineering Team"
              className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
            />


            <button
              type="submit"
              disabled={
                creating
              }
              className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {creating
                ? "Creating..."
                : "+ Create Workspace"}
            </button>

          </form>

        </section>


        {/* =====================================
            WORKSPACES
        ===================================== */}

        <section className="mt-10">

          <div className="flex items-end justify-between gap-4">

            <div>

              <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                Collaboration
              </p>


              <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
                Your Workspaces
              </h2>


              <p className="mt-2 text-sm text-slate-500">
                Open a workspace to manage projects,
                tasks and members.
              </p>

            </div>


            <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-600">
              {workspaces.length}
            </span>

          </div>


          {workspaces.length ===
          0 ? (

            <div className="mt-6 flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">

              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl font-bold text-blue-600">
                +
              </div>


              <h3 className="mt-5 text-lg font-semibold text-slate-900">
                No workspaces yet
              </h3>


              <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
                Create your first workspace above
                and start organizing projects with
                your team.
              </p>

            </div>

          ) : (

            <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">

              {workspaces.map(
                (workspace) => (

                  <button
                    key={
                      workspace.id
                    }
                    type="button"
                    onClick={() =>
                      router.push(
                        `/workspace/${workspace.id}`
                      )
                    }
                    className="group rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-md"
                  >

                    <div className="flex items-start justify-between gap-4">

                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-base font-bold text-white transition group-hover:bg-blue-600">

                        {workspace.name
                          .charAt(0)
                          .toUpperCase()}

                      </div>


                      <RoleBadge
                        role={
                          workspace.role
                        }
                      />

                    </div>


                    <h3 className="mt-5 text-lg font-semibold text-slate-900 transition group-hover:text-blue-600">
                      {workspace.name}
                    </h3>


                    <p className="mt-2 text-sm text-slate-500">
                      Open workspace to manage
                      projects, members and tasks.
                    </p>


                    <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">

                      <span className="text-xs text-slate-400">

                        Created{" "}

                        {new Date(
                          workspace.created_at
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

      </div>

    </main>
  );
}


// =========================================
// ROLE BADGE
// =========================================

type RoleBadgeProps = {
  role:
    | "owner"
    | "admin"
    | "member";
};


function RoleBadge({
  role,
}: RoleBadgeProps) {

  if (
    role === "owner"
  ) {
    return (
      <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold capitalize text-purple-700 ring-1 ring-inset ring-purple-100">
        owner
      </span>
    );
  }


  if (
    role === "admin"
  ) {
    return (
      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold capitalize text-blue-700 ring-1 ring-inset ring-blue-100">
        admin
      </span>
    );
  }


  return (
    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-600 ring-1 ring-inset ring-slate-200">
      member
    </span>
  );
}