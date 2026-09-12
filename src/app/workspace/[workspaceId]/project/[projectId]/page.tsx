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

import { supabase } from "../../../../../lib/supabase";


// =========================================
// TYPES
// =========================================

type TaskStatus =
  | "todo"
  | "in_progress"
  | "done";


type TaskPriority =
  | "low"
  | "medium"
  | "high";


type Project = {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  created_at: string;
};


type Task = {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assigned_to: string | null;
  due_date: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};


type Member = {
  user_id: string;
  role: string;
  name: string;
  email: string;
};


// =========================================
// PAGE
// =========================================

export default function ProjectPage() {
  const router = useRouter();

  const params =
    useParams<{
      workspaceId: string;
      projectId: string;
    }>();


  const workspaceId =
    params.workspaceId;

  const projectId =
    params.projectId;


  // =========================================
  // DATA
  // =========================================

  const [project, setProject] =
    useState<Project | null>(null);

  const [tasks, setTasks] =
    useState<Task[]>([]);

  const [members, setMembers] =
    useState<Member[]>([]);


  // =========================================
  // CREATE TASK
  // =========================================

  const [title, setTitle] =
    useState("");

  const [description, setDescription] =
    useState("");

  const [priority, setPriority] =
    useState<TaskPriority>("medium");

  const [assignedTo, setAssignedTo] =
    useState("");

  const [dueDate, setDueDate] =
    useState("");

  const [creating, setCreating] =
    useState(false);


  // =========================================
  // FILTERS
  // =========================================

  const [searchText, setSearchText] =
    useState("");

  const [
    priorityFilter,
    setPriorityFilter,
  ] =
    useState<
      "all" | TaskPriority
    >("all");

  const [
    assigneeFilter,
    setAssigneeFilter,
  ] =
    useState("all");

  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState<
      "all" | TaskStatus
    >("all");


  // =========================================
  // PAGE STATE
  // =========================================

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");


  // =========================================
  // LOAD + REALTIME
  // =========================================

  useEffect(() => {
    if (
      !workspaceId ||
      !projectId
    ) {
      return;
    }

    loadProject();

    const taskChannel =
      supabase
        .channel(
          `project-tasks-${projectId}`
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "tasks",
            filter:
              `project_id=eq.${projectId}`,
          },
          () => {
            loadProject();
          }
        )
        .subscribe();


    return () => {
      supabase.removeChannel(
        taskChannel
      );
    };

  }, [
    workspaceId,
    projectId,
  ]);


  // =========================================
  // LOAD PROJECT
  // =========================================

  async function loadProject() {
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
    // CHECK WORKSPACE MEMBERSHIP
    // -----------------------------------------

    const {
      data: membership,
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
      !membership
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


    // -----------------------------------------
    // PROJECT
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
          "id",
          projectId
        )
        .eq(
          "workspace_id",
          workspaceId
        )
        .single();


    if (
      projectError ||
      !projectData
    ) {
      console.error(
        projectError
      );

      setError(
        "Project not found or access denied."
      );

      setLoading(false);

      return;
    }


    setProject(
      projectData as Project
    );


    // -----------------------------------------
    // TASKS
    // -----------------------------------------

    const {
      data: taskData,
      error: taskError,
    } =
      await supabase
        .from("tasks")
        .select(
          "id, project_id, title, description, status, priority, assigned_to, due_date, created_by, created_at, updated_at"
        )
        .eq(
          "project_id",
          projectId
        )
        .order(
          "created_at",
          {
            ascending: false,
          }
        );


    if (taskError) {
      console.error(
        taskError
      );

      setError(
        "Failed to load tasks."
      );

      setLoading(false);

      return;
    }


    const taskList =
      (taskData ?? []) as Task[];

    setTasks(
      taskList
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


    const memberIds =
      rawMembers.map(
        (member) =>
          member.user_id
      );


    if (
      memberIds.length > 0
    ) {
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
      } else {
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
                  member.role,

                name:
                  profile?.name ??
                  "Unknown User",

                email:
                  profile?.email ??
                  "",
              };
            }
          );


        setMembers(
          combinedMembers
        );
      }
    } else {
      setMembers([]);
    }


    setLoading(false);
  }


  // =========================================
  // CREATE TASK
  // =========================================

  async function handleCreateTask(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");


    if (!title.trim()) {
      setError(
        "Task title is required."
      );

      return;
    }


    setCreating(true);


    const {
      error: createError,
    } =
      await supabase.rpc(
        "create_task",
        {
          target_project_id:
            projectId,

          task_title:
            title.trim(),

          task_description:
            description.trim()
              || null,

          task_priority:
            priority,

          task_assigned_to:
            assignedTo
              || null,

          task_due_date:
            dueDate
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


    setTitle("");
    setDescription("");
    setPriority("medium");
    setAssignedTo("");
    setDueDate("");

    await loadProject();
  }


  // =========================================
  // CHANGE STATUS
  // =========================================

  async function changeStatus(
    taskId: string,
    status: TaskStatus
  ) {
    setError("");


    const {
      error: updateError,
    } =
      await supabase.rpc(
        "update_task_status",
        {
          target_task_id:
            taskId,

          new_status:
            status,
        }
      );


    if (updateError) {
      console.error(
        updateError
      );

      setError(
        updateError.message
      );

      return;
    }


    await loadProject();
  }


  // =========================================
  // LOADING
  // =========================================

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50">

        <div className="mx-auto max-w-7xl px-6 py-10">

          <div className="animate-pulse">

            <div className="h-4 w-36 rounded bg-slate-200" />

            <div className="mt-8 h-10 w-80 rounded bg-slate-200" />

            <div className="mt-3 h-5 w-96 max-w-full rounded bg-slate-200" />


            <div className="mt-10 h-72 rounded-2xl bg-white shadow-sm" />


            <div className="mt-8 grid gap-6 lg:grid-cols-3">

              <div className="h-96 rounded-2xl bg-slate-200" />
              <div className="h-96 rounded-2xl bg-slate-200" />
              <div className="h-96 rounded-2xl bg-slate-200" />

            </div>

          </div>

        </div>

      </main>
    );
  }


  // =========================================
  // PROJECT ERROR
  // =========================================

  if (!project) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">

        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">

          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-xl">
            !
          </div>


          <h1 className="mt-4 text-xl font-bold text-slate-900">
            Project unavailable
          </h1>


          <p className="mt-2 text-sm text-slate-500">
            {error ||
              "The project could not be loaded."}
          </p>


          <button
            type="button"
            onClick={() =>
              router.push(
                `/workspace/${workspaceId}`
              )
            }
            className="mt-6 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
          >
            Back to Workspace
          </button>

        </div>

      </main>
    );
  }


  // =========================================
  // FILTER
  // =========================================

  const normalizedSearch =
    searchText
      .trim()
      .toLowerCase();


  const filteredTasks =
    tasks.filter(
      (task) => {

        const matchesSearch =
          normalizedSearch === "" ||
          task.title
            .toLowerCase()
            .includes(
              normalizedSearch
            ) ||
          (
            task.description ??
            ""
          )
            .toLowerCase()
            .includes(
              normalizedSearch
            );


        const matchesPriority =
          priorityFilter ===
            "all" ||
          task.priority ===
            priorityFilter;


        const matchesAssignee =
          assigneeFilter ===
            "all" ||
          (
            assigneeFilter ===
              "unassigned"
              ? task.assigned_to ===
                null
              : task.assigned_to ===
                assigneeFilter
          );


        const matchesStatus =
          statusFilter ===
            "all" ||
          task.status ===
            statusFilter;


        return (
          matchesSearch &&
          matchesPriority &&
          matchesAssignee &&
          matchesStatus
        );
      }
    );


  const todoTasks =
    filteredTasks.filter(
      (task) =>
        task.status === "todo"
    );


  const progressTasks =
    filteredTasks.filter(
      (task) =>
        task.status ===
        "in_progress"
    );


  const doneTasks =
    filteredTasks.filter(
      (task) =>
        task.status === "done"
    );


  const filtersActive =
    searchText !== "" ||
    priorityFilter !== "all" ||
    assigneeFilter !== "all" ||
    statusFilter !== "all";


  // =========================================
  // PAGE
  // =========================================

  return (
    <main className="min-h-screen bg-slate-50">

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">


        {/* =====================================
            NAVIGATION
        ===================================== */}

        <button
          type="button"
          onClick={() =>
            router.push(
              `/workspace/${workspaceId}`
            )
          }
          className="group flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
        >
          <span className="transition group-hover:-translate-x-1">
            ←
          </span>

          Back to Workspace
        </button>


        {/* =====================================
            PROJECT HEADER
        ===================================== */}

        <header className="mt-7 flex flex-col gap-5 border-b border-slate-200 pb-8 sm:flex-row sm:items-end sm:justify-between">

          <div>

            <div className="flex items-center gap-3">

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-lg font-bold text-white shadow-sm">
                {project.name
                  .charAt(0)
                  .toUpperCase()}
              </div>


              <div>

                <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                  Project
                </p>

                <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                  {project.name}
                </h1>

              </div>

            </div>


            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-500">
              {project.description ||
                "No project description has been added yet."}
            </p>

          </div>


          <div className="flex gap-3">

            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">

              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Tasks
              </p>

              <p className="mt-1 text-xl font-bold text-slate-900">
                {tasks.length}
              </p>

            </div>


            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">

              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Done
              </p>

              <p className="mt-1 text-xl font-bold text-slate-900">
                {
                  tasks.filter(
                    (task) =>
                      task.status ===
                      "done"
                  ).length
                }
              </p>

            </div>

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
            CREATE TASK
        ===================================== */}

        <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="border-b border-slate-100 px-6 py-5">

            <h2 className="text-lg font-semibold text-slate-900">
              Create Task
            </h2>


            <p className="mt-1 text-sm text-slate-500">
              Add a task and assign it to a workspace member.
            </p>

          </div>


          <form
            onSubmit={
              handleCreateTask
            }
            className="space-y-5 p-6"
          >

            <div className="grid gap-5 lg:grid-cols-2">

              <div>

                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Task title
                </label>

                <input
                  value={title}
                  onChange={(event) =>
                    setTitle(
                      event.target.value
                    )
                  }
                  placeholder="e.g. Build dashboard interface"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                />

              </div>


              <div>

                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Due date
                </label>

                <input
                  type="date"
                  value={dueDate}
                  onChange={(event) =>
                    setDueDate(
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                />

              </div>

            </div>


            <div>

              <label className="mb-2 block text-sm font-medium text-slate-700">
                Description
              </label>

              <textarea
                value={description}
                onChange={(event) =>
                  setDescription(
                    event.target.value
                  )
                }
                placeholder="Describe what needs to be completed..."
                rows={3}
                className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
              />

            </div>


            <div className="grid gap-5 md:grid-cols-2">

              <div>

                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Priority
                </label>

                <select
                  value={priority}
                  onChange={(event) =>
                    setPriority(
                      event.target.value as TaskPriority
                    )
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-blue-500"
                >
                  <option value="low">
                    Low
                  </option>

                  <option value="medium">
                    Medium
                  </option>

                  <option value="high">
                    High
                  </option>
                </select>

              </div>


              <div>

                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Assignee
                </label>

                <select
                  value={assignedTo}
                  onChange={(event) =>
                    setAssignedTo(
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-blue-500"
                >

                  <option value="">
                    Unassigned
                  </option>


                  {members.map(
                    (member) => (

                      <option
                        key={
                          member.user_id
                        }
                        value={
                          member.user_id
                        }
                      >
                        {member.name}
                        {" — "}
                        {member.role}
                      </option>

                    )
                  )}

                </select>

              </div>

            </div>


            <div className="flex justify-end">

              <button
                type="submit"
                disabled={creating}
                className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {creating
                  ? "Creating..."
                  : "+ Create Task"}
              </button>

            </div>

          </form>

        </section>


        {/* =====================================
            FILTER TOOLBAR
        ===================================== */}

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

          <div className="flex flex-col gap-3 xl:flex-row">


            {/* SEARCH */}

            <div className="relative flex-1">

              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                ⌕
              </span>

              <input
                type="text"
                value={searchText}
                onChange={(event) =>
                  setSearchText(
                    event.target.value
                  )
                }
                placeholder="Search tasks by title or description..."
                className="w-full rounded-xl border border-slate-300 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
              />

            </div>


            {/* PRIORITY */}

            <select
              value={
                priorityFilter
              }
              onChange={(event) =>
                setPriorityFilter(
                  event.target.value as "all" | TaskPriority
                )
              }
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-600 outline-none focus:border-blue-500"
            >

              <option value="all">
                All priorities
              </option>

              <option value="low">
                Low priority
              </option>

              <option value="medium">
                Medium priority
              </option>

              <option value="high">
                High priority
              </option>

            </select>


            {/* ASSIGNEE */}

            <select
              value={
                assigneeFilter
              }
              onChange={(event) =>
                setAssigneeFilter(
                  event.target.value
                )
              }
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-600 outline-none focus:border-blue-500"
            >

              <option value="all">
                All assignees
              </option>

              <option value="unassigned">
                Unassigned
              </option>


              {members.map(
                (member) => (

                  <option
                    key={
                      member.user_id
                    }
                    value={
                      member.user_id
                    }
                  >
                    {member.name}
                  </option>

                )
              )}

            </select>


            {/* STATUS */}

            <select
              value={
                statusFilter
              }
              onChange={(event) =>
                setStatusFilter(
                  event.target.value as "all" | TaskStatus
                )
              }
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-600 outline-none focus:border-blue-500"
            >

              <option value="all">
                All statuses
              </option>

              <option value="todo">
                Todo
              </option>

              <option value="in_progress">
                In Progress
              </option>

              <option value="done">
                Done
              </option>

            </select>


            {/* RESET */}

            <button
              type="button"
              disabled={!filtersActive}
              onClick={() => {
                setSearchText("");
                setPriorityFilter(
                  "all"
                );
                setAssigneeFilter(
                  "all"
                );
                setStatusFilter(
                  "all"
                );
              }}
              className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Reset
            </button>

          </div>


          <div className="mt-3 flex items-center justify-between px-1">

            <p className="text-xs text-slate-400">
              Showing{" "}
              <span className="font-semibold text-slate-600">
                {filteredTasks.length}
              </span>
              {" "}of{" "}
              <span className="font-semibold text-slate-600">
                {tasks.length}
              </span>
              {" "}tasks
            </p>


            {filtersActive && (

              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-600">
                Filters active
              </span>

            )}

          </div>

        </section>


        {/* =====================================
            KANBAN BOARD
        ===================================== */}

        <section className="mt-8 grid items-start gap-6 lg:grid-cols-3">

          <TaskColumn
            title="Todo"
            description="Tasks waiting to be started"
            status="todo"
            tasks={todoTasks}
            members={members}
            workspaceId={
              workspaceId
            }
            projectId={
              projectId
            }
            onStatusChange={
              changeStatus
            }
          />


          <TaskColumn
            title="In Progress"
            description="Tasks currently being worked on"
            status="in_progress"
            tasks={
              progressTasks
            }
            members={members}
            workspaceId={
              workspaceId
            }
            projectId={
              projectId
            }
            onStatusChange={
              changeStatus
            }
          />


          <TaskColumn
            title="Done"
            description="Completed tasks"
            status="done"
            tasks={doneTasks}
            members={members}
            workspaceId={
              workspaceId
            }
            projectId={
              projectId
            }
            onStatusChange={
              changeStatus
            }
          />

        </section>

      </div>

    </main>
  );
}


// =========================================
// TASK COLUMN
// =========================================

type TaskColumnProps = {
  title: string;
  description: string;
  status: TaskStatus;
  tasks: Task[];
  members: Member[];
  workspaceId: string;
  projectId: string;

  onStatusChange: (
    taskId: string,
    status: TaskStatus
  ) => void;
};


function TaskColumn({
  title,
  description,
  status,
  tasks,
  members,
  workspaceId,
  projectId,
  onStatusChange,
}: TaskColumnProps) {
  const router =
    useRouter();


  function memberName(
    userId: string | null
  ) {
    if (!userId) {
      return "Unassigned";
    }


    return (
      members.find(
        (member) =>
          member.user_id ===
          userId
      )?.name ??
      "Unknown User"
    );
  }


  function memberInitial(
    userId: string | null
  ) {
    if (!userId) {
      return "?";
    }


    const name =
      memberName(userId);


    return (
      name
        .charAt(0)
        .toUpperCase()
    );
  }


  function priorityClasses(
    priority: TaskPriority
  ) {
    if (
      priority === "high"
    ) {
      return "bg-red-50 text-red-700 ring-red-100";
    }


    if (
      priority === "medium"
    ) {
      return "bg-amber-50 text-amber-700 ring-amber-100";
    }


    return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  }


  function priorityDot(
    priority: TaskPriority
  ) {
    if (
      priority === "high"
    ) {
      return "bg-red-500";
    }


    if (
      priority === "medium"
    ) {
      return "bg-amber-500";
    }


    return "bg-emerald-500";
  }


  function columnAccent() {
    if (
      status === "todo"
    ) {
      return "bg-slate-500";
    }


    if (
      status ===
      "in_progress"
    ) {
      return "bg-blue-500";
    }


    return "bg-emerald-500";
  }


  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100/70">


      {/* COLUMN HEADER */}

      <div className="border-b border-slate-200 bg-white px-5 py-4">

        <div className="flex items-center justify-between gap-3">

          <div className="flex items-center gap-3">

            <span
              className={`h-2.5 w-2.5 rounded-full ${columnAccent()}`}
            />

            <h2 className="font-semibold text-slate-900">
              {title}
            </h2>

          </div>


          <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-slate-100 px-2 text-xs font-semibold text-slate-600">
            {tasks.length}
          </span>

        </div>


        <p className="mt-2 text-xs text-slate-400">
          {description}
        </p>

      </div>


      {/* CARDS */}

      <div className="min-h-[240px] space-y-4 p-4">

        {tasks.length ===
          0 && (

          <div className="flex min-h-40 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white/70 p-6 text-center">

            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              ✓
            </div>


            <p className="mt-3 text-sm font-medium text-slate-500">
              No tasks here
            </p>


            <p className="mt-1 text-xs text-slate-400">
              Tasks matching your filters will appear here.
            </p>

          </div>

        )}


        {tasks.map(
          (task) => (

            <article
              key={task.id}
              className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
            >


              {/* TITLE */}

              <button
                type="button"
                onClick={() =>
                  router.push(
                    `/workspace/${workspaceId}/project/${projectId}/task/${task.id}`
                  )
                }
                className="block w-full text-left"
              >

                <div className="flex items-start justify-between gap-3">

                  <h3 className="font-semibold leading-6 text-slate-900 transition group-hover:text-blue-600">
                    {task.title}
                  </h3>


                  <span
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium capitalize ring-1 ring-inset ${priorityClasses(
                      task.priority
                    )}`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${priorityDot(
                        task.priority
                      )}`}
                    />

                    {task.priority}
                  </span>

                </div>


                {task.description && (

                  <p className="mt-3 line-clamp-2 text-sm leading-5 text-slate-500">
                    {task.description}
                  </p>

                )}

              </button>


              {/* META */}

              <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">

                <div className="flex items-center gap-2">

                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                    {memberInitial(
                      task.assigned_to
                    )}
                  </div>


                  <span className="max-w-28 truncate text-xs text-slate-500">
                    {memberName(
                      task.assigned_to
                    )}
                  </span>

                </div>


                <span className="text-slate-300">
                  •
                </span>


                <span className="text-xs text-slate-500">
                  {task.due_date
                    ? `Due ${new Date(
                        `${task.due_date}T00:00:00`
                      ).toLocaleDateString()}`
                    : "No due date"}
                </span>

              </div>


              {/* ACTIONS */}

              <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">

                <select
                  value={
                    task.status
                  }
                  onChange={(event) =>
                    onStatusChange(
                      task.id,
                      event.target.value as TaskStatus
                    )
                  }
                  className="min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-600 outline-none transition focus:border-blue-500"
                >

                  <option value="todo">
                    Todo
                  </option>

                  <option value="in_progress">
                    In Progress
                  </option>

                  <option value="done">
                    Done
                  </option>

                </select>


                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      `/workspace/${workspaceId}/project/${projectId}/task/${task.id}`
                    )
                  }
                  className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                >
                  Details
                </button>

              </div>

            </article>

          )
        )}

      </div>

    </div>
  );
}