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

import { supabase } from "../../../../../../../lib/supabase";


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


type Comment = {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  created_at: string;
};


type ActivityLog = {
  id: string;
  workspace_id: string;
  user_id: string | null;
  action: string;
  created_at: string;
};


// =========================================
// PAGE
// =========================================

export default function TaskDetailsPage() {
  const router = useRouter();

  const params =
    useParams<{
      workspaceId: string;
      projectId: string;
      taskId: string;
    }>();


  const workspaceId =
    params.workspaceId;

  const projectId =
    params.projectId;

  const taskId =
    params.taskId;


  // =========================================
  // DATA
  // =========================================

  const [task, setTask] =
    useState<Task | null>(null);

  const [members, setMembers] =
    useState<Member[]>([]);

  const [comments, setComments] =
    useState<Comment[]>([]);

  const [
    activityLogs,
    setActivityLogs,
  ] =
    useState<ActivityLog[]>([]);


  // =========================================
  // EDIT TASK
  // =========================================

  const [
    editTitle,
    setEditTitle,
  ] =
    useState("");

  const [
    editDescription,
    setEditDescription,
  ] =
    useState("");

  const [
    editPriority,
    setEditPriority,
  ] =
    useState<TaskPriority>(
      "medium"
    );

  const [
    editAssignedTo,
    setEditAssignedTo,
  ] =
    useState("");

  const [
    editDueDate,
    setEditDueDate,
  ] =
    useState("");

  const [saving, setSaving] =
    useState(false);


  // =========================================
  // COMMENT
  // =========================================

  const [
    commentText,
    setCommentText,
  ] =
    useState("");

  const [
    postingComment,
    setPostingComment,
  ] =
    useState(false);


  // =========================================
  // PAGE
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
      !projectId ||
      !taskId
    ) {
      return;
    }


    loadTaskDetails();


    const realtimeChannel =
      supabase
        .channel(
          `task-details-${taskId}`
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "tasks",
            filter:
              `id=eq.${taskId}`,
          },
          () => {
            refreshTaskDetails();
          }
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "comments",
            filter:
              `task_id=eq.${taskId}`,
          },
          () => {
            refreshTaskDetails();
          }
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table:
              "activity_logs",
            filter:
              `workspace_id=eq.${workspaceId}`,
          },
          () => {
            refreshTaskDetails();
          }
        )
        .subscribe();


    return () => {
      supabase.removeChannel(
        realtimeChannel
      );
    };

  }, [
    workspaceId,
    projectId,
    taskId,
  ]);


  // =========================================
  // INITIAL LOAD
  // =========================================

  async function loadTaskDetails() {
    setLoading(true);
    setError("");

    await fetchTaskDetails();

    setLoading(false);
  }


  // Realtime refresh without flashing
  // the whole page loading skeleton.

  async function refreshTaskDetails() {
    await fetchTaskDetails();
  }


  // =========================================
  // FETCH DATA
  // =========================================

  async function fetchTaskDetails() {
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
    // MEMBERSHIP
    // -----------------------------------------

    const {
      data: membership,
      error: membershipError,
    } =
      await supabase
        .from(
          "workspace_members"
        )
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

      return;
    }


    // -----------------------------------------
    // TASK
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
          "id",
          taskId
        )
        .eq(
          "project_id",
          projectId
        )
        .single();


    if (
      taskError ||
      !taskData
    ) {
      console.error(
        taskError
      );

      setError(
        "Task not found or access denied."
      );

      setTask(null);

      return;
    }


    const loadedTask =
      taskData as Task;

    setTask(
      loadedTask
    );


    setEditTitle(
      loadedTask.title
    );

    setEditDescription(
      loadedTask.description ??
      ""
    );

    setEditPriority(
      loadedTask.priority
    );

    setEditAssignedTo(
      loadedTask.assigned_to ??
      ""
    );

    setEditDueDate(
      loadedTask.due_date ??
      ""
    );


    // -----------------------------------------
    // MEMBERS
    // -----------------------------------------

    const {
      data: memberData,
      error: memberError,
    } =
      await supabase
        .from(
          "workspace_members"
        )
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
    } else {
      const rawMembers =
        memberData ?? [];


      const memberIds =
        rawMembers.map(
          (member) =>
            member.user_id
        );


      if (
        memberIds.length >
        0
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


        if (
          profileError
        ) {
          console.error(
            profileError
          );
        } else {
          const combinedMembers: Member[] =
            rawMembers.map(
              (member) => {
                const profile =
                  (
                    profileData ??
                    []
                  ).find(
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
    }


    // -----------------------------------------
    // COMMENTS
    // -----------------------------------------

    const {
      data: commentData,
      error: commentError,
    } =
      await supabase
        .from("comments")
        .select(
          "id, task_id, user_id, content, created_at"
        )
        .eq(
          "task_id",
          taskId
        )
        .order(
          "created_at",
          {
            ascending: true,
          }
        );


    if (commentError) {
      console.error(
        commentError
      );
    } else {
      setComments(
        (commentData ??
          []) as Comment[]
      );
    }


    // -----------------------------------------
    // ACTIVITY LOGS
    // -----------------------------------------

    const {
      data: activityData,
      error: activityError,
    } =
      await supabase
        .from(
          "activity_logs"
        )
        .select(
          "id, workspace_id, user_id, action, created_at"
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
        )
        .limit(20);


    if (activityError) {
      console.error(
        activityError
      );
    } else {
      setActivityLogs(
        (activityData ??
          []) as ActivityLog[]
      );
    }
  }


  // =========================================
  // UPDATE TASK
  // =========================================

  async function handleUpdateTask(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");


    if (
      !editTitle.trim()
    ) {
      setError(
        "Task title is required."
      );

      return;
    }


    setSaving(true);


    const {
      error: updateError,
    } =
      await supabase.rpc(
        "update_task_details",
        {
          target_task_id:
            taskId,

          task_title:
            editTitle.trim(),

          task_description:
            editDescription.trim()
              || null,

          task_priority:
            editPriority,

          task_assigned_to:
            editAssignedTo
              || null,

          task_due_date:
            editDueDate
              || null,
        }
      );


    setSaving(false);


    if (updateError) {
      console.error(
        updateError
      );

      setError(
        updateError.message
      );

      return;
    }


    await refreshTaskDetails();
  }


  // =========================================
  // ADD COMMENT
  // =========================================

  async function handleAddComment(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");


    if (
      !commentText.trim()
    ) {
      setError(
        "Comment cannot be empty."
      );

      return;
    }


    setPostingComment(true);


    const {
      error: commentError,
    } =
      await supabase.rpc(
        "add_task_comment",
        {
          target_task_id:
            taskId,

          comment_content:
            commentText.trim(),
        }
      );


    setPostingComment(false);


    if (commentError) {
      console.error(
        commentError
      );

      setError(
        commentError.message
      );

      return;
    }


    setCommentText("");

    await refreshTaskDetails();
  }


  // =========================================
  // HELPERS
  // =========================================

  function getMember(
    userId:
      | string
      | null
  ) {
    if (!userId) {
      return null;
    }


    return (
      members.find(
        (member) =>
          member.user_id ===
          userId
      ) ??
      null
    );
  }


  function memberName(
    userId:
      | string
      | null
  ) {
    if (!userId) {
      return "Unassigned";
    }


    return (
      getMember(userId)
        ?.name ??
      "Unknown User"
    );
  }


  function memberInitial(
    userId:
      | string
      | null
  ) {
    return memberName(
      userId
    )
      .charAt(0)
      .toUpperCase();
  }


  function formatDate(
    date: string
  ) {
    return new Date(
      date
    ).toLocaleString();
  }


  // =========================================
  // LOADING
  // =========================================

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50">

        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

          <div className="animate-pulse">

            <div className="h-4 w-44 rounded bg-slate-200" />


            <div className="mt-8 h-10 w-80 rounded bg-slate-200" />


            <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">

              <div className="h-[520px] rounded-2xl bg-white shadow-sm" />

              <div className="h-[520px] rounded-2xl bg-white shadow-sm" />

            </div>

          </div>

        </div>

      </main>
    );
  }


  // =========================================
  // ERROR
  // =========================================

  if (!task) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">

        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">

          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-xl font-bold text-red-600">
            !
          </div>


          <h1 className="mt-4 text-xl font-bold text-slate-900">
            Task unavailable
          </h1>


          <p className="mt-2 text-sm text-slate-500">
            {error ||
              "This task could not be loaded."}
          </p>


          <button
            type="button"
            onClick={() =>
              router.push(
                `/workspace/${workspaceId}/project/${projectId}`
              )
            }
            className="mt-6 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Back to Project
          </button>

        </div>

      </main>
    );
  }


  const assignee =
    getMember(
      task.assigned_to
    );


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
              `/workspace/${workspaceId}/project/${projectId}`
            )
          }
          className="group flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
        >

          <span className="transition group-hover:-translate-x-1">
            ←
          </span>

          Back to Project Board

        </button>


        {/* =====================================
            HEADER
        ===================================== */}

        <header className="mt-7 flex flex-col gap-5 border-b border-slate-200 pb-8 sm:flex-row sm:items-end sm:justify-between">

          <div>

            <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
              Task Details
            </p>


            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
              {task.title}
            </h1>


            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
              {task.description ||
                "No description has been added to this task."}
            </p>

          </div>


          <div className="flex flex-wrap items-center gap-2">

            <StatusBadge
              status={
                task.status
              }
            />

            <PriorityBadge
              priority={
                task.priority
              }
            />

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
            MAIN GRID
        ===================================== */}

        <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">


          {/* ===================================
              LEFT
          =================================== */}

          <div className="space-y-6">


            {/* EDIT TASK */}

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

              <div className="border-b border-slate-100 px-6 py-5">

                <h2 className="text-lg font-semibold text-slate-900">
                  Edit Task
                </h2>


                <p className="mt-1 text-sm text-slate-500">
                  Update task details,
                  assignment and due date.
                </p>

              </div>


              <form
                onSubmit={
                  handleUpdateTask
                }
                className="space-y-5 p-6"
              >

                <div>

                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Title
                  </label>


                  <input
                    type="text"
                    value={
                      editTitle
                    }
                    onChange={(event) =>
                      setEditTitle(
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                  />

                </div>


                <div>

                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Description
                  </label>


                  <textarea
                    value={
                      editDescription
                    }
                    onChange={(event) =>
                      setEditDescription(
                        event.target.value
                      )
                    }
                    rows={5}
                    placeholder="Add task description..."
                    className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                  />

                </div>


                <div className="grid gap-5 md:grid-cols-2">

                  <div>

                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Priority
                    </label>


                    <select
                      value={
                        editPriority
                      }
                      onChange={(event) =>
                        setEditPriority(
                          event.target.value as TaskPriority
                        )
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
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
                      value={
                        editAssignedTo
                      }
                      onChange={(event) =>
                        setEditAssignedTo(
                          event.target.value
                        )
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
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


                <div>

                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Due Date
                  </label>


                  <input
                    type="date"
                    value={
                      editDueDate
                    }
                    onChange={(event) =>
                      setEditDueDate(
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
                  />

                </div>


                <div className="flex justify-end">

                  <button
                    type="submit"
                    disabled={
                      saving
                    }
                    className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving
                      ? "Saving..."
                      : "Save Changes"}
                  </button>

                </div>

              </form>

            </section>


            {/* COMMENTS */}

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">

                <div>

                  <h2 className="text-lg font-semibold text-slate-900">
                    Comments
                  </h2>


                  <p className="mt-1 text-sm text-slate-500">
                    Discuss this task with your team.
                  </p>

                </div>


                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {comments.length}
                </span>

              </div>


              <div className="p-6">

                {/* COMMENT FORM */}

                <form
                  onSubmit={
                    handleAddComment
                  }
                >

                  <textarea
                    value={
                      commentText
                    }
                    onChange={(event) =>
                      setCommentText(
                        event.target.value
                      )
                    }
                    rows={3}
                    placeholder="Write a comment..."
                    className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                  />


                  <div className="mt-3 flex justify-end">

                    <button
                      type="submit"
                      disabled={
                        postingComment
                      }
                      className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
                    >
                      {postingComment
                        ? "Posting..."
                        : "Post Comment"}
                    </button>

                  </div>

                </form>


                {/* COMMENT LIST */}

                <div className="mt-8 space-y-5">

                  {comments.length ===
                    0 && (

                    <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center">

                      <p className="text-sm font-medium text-slate-500">
                        No comments yet
                      </p>


                      <p className="mt-1 text-xs text-slate-400">
                        Start the conversation above.
                      </p>

                    </div>

                  )}


                  {comments.map(
                    (comment) => {

                      const author =
                        getMember(
                          comment.user_id
                        );


                      return (
                        <div
                          key={
                            comment.id
                          }
                          className="flex gap-3"
                        >

                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">

                            {memberInitial(
                              comment.user_id
                            )}

                          </div>


                          <div className="min-w-0 flex-1">

                            <div className="flex flex-wrap items-center gap-2">

                              <p className="text-sm font-semibold text-slate-900">

                                {author?.name ??
                                  "Unknown User"}

                              </p>


                              <span className="text-xs text-slate-400">
                                {formatDate(
                                  comment.created_at
                                )}
                              </span>

                            </div>


                            <div className="mt-2 rounded-xl bg-slate-50 px-4 py-3">

                              <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
                                {comment.content}
                              </p>

                            </div>

                          </div>

                        </div>
                      );
                    }
                  )}

                </div>

              </div>

            </section>

          </div>


          {/* ===================================
              RIGHT
          =================================== */}

          <aside className="space-y-6">


            {/* TASK INFO */}

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

              <div className="border-b border-slate-100 px-5 py-4">

                <h2 className="font-semibold text-slate-900">
                  Task Overview
                </h2>

              </div>


              <div className="space-y-5 p-5">


                <InfoRow
                  label="Status"
                >
                  <StatusBadge
                    status={
                      task.status
                    }
                  />
                </InfoRow>


                <InfoRow
                  label="Priority"
                >
                  <PriorityBadge
                    priority={
                      task.priority
                    }
                  />
                </InfoRow>


                <InfoRow
                  label="Assignee"
                >

                  <div className="flex items-center gap-2">

                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">

                      {memberInitial(
                        task.assigned_to
                      )}

                    </div>


                    <div>

                      <p className="text-sm font-medium text-slate-700">
                        {assignee?.name ??
                          "Unassigned"}
                      </p>


                      {assignee && (

                        <p className="text-xs text-slate-400">
                          {assignee.email}
                        </p>

                      )}

                    </div>

                  </div>

                </InfoRow>


                <InfoRow
                  label="Due Date"
                >

                  <span className="text-sm font-medium text-slate-700">

                    {task.due_date
                      ? new Date(
                          `${task.due_date}T00:00:00`
                        ).toLocaleDateString()
                      : "No due date"}

                  </span>

                </InfoRow>


                <InfoRow
                  label="Created"
                >

                  <span className="text-sm text-slate-600">
                    {formatDate(
                      task.created_at
                    )}
                  </span>

                </InfoRow>


                <InfoRow
                  label="Last Updated"
                >

                  <span className="text-sm text-slate-600">
                    {formatDate(
                      task.updated_at
                    )}
                  </span>

                </InfoRow>

              </div>

            </section>


            {/* ACTIVITY */}

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">

                <h2 className="font-semibold text-slate-900">
                  Activity
                </h2>


                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
                  {activityLogs.length}
                </span>

              </div>


              <div className="max-h-[520px] overflow-y-auto p-5">

                {activityLogs.length ===
                  0 ? (

                  <div className="py-8 text-center">

                    <p className="text-sm text-slate-500">
                      No activity yet.
                    </p>

                  </div>

                ) : (

                  <div className="space-y-5">

                    {activityLogs.map(
                      (
                        log,
                        index
                      ) => {

                        const logUser =
                          getMember(
                            log.user_id
                          );


                        return (
                          <div
                            key={
                              log.id
                            }
                            className="relative flex gap-3"
                          >

                            {index !==
                              activityLogs.length -
                                1 && (

                              <div className="absolute left-[15px] top-8 h-[calc(100%+8px)] w-px bg-slate-200" />

                            )}


                            <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-600">

                              {log.user_id
                                ? memberInitial(
                                    log.user_id
                                  )
                                : "•"}

                            </div>


                            <div className="min-w-0 pb-1">

                              <p className="text-sm leading-5 text-slate-700">

                                <span className="font-semibold text-slate-900">

                                  {logUser?.name ??
                                    "System"}

                                </span>

                                {" "}

                                {log.action}

                              </p>


                              <p className="mt-1 text-xs text-slate-400">

                                {formatDate(
                                  log.created_at
                                )}

                              </p>

                            </div>

                          </div>
                        );
                      }
                    )}

                  </div>

                )}

              </div>

            </section>

          </aside>

        </div>

      </div>

    </main>
  );
}


// =========================================
// INFO ROW
// =========================================

type InfoRowProps = {
  label: string;
  children:
    React.ReactNode;
};


function InfoRow({
  label,
  children,
}: InfoRowProps) {
  return (
    <div>

      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      {children}

    </div>
  );
}


// =========================================
// STATUS BADGE
// =========================================

function StatusBadge({
  status,
}: {
  status: TaskStatus;
}) {

  if (
    status ===
    "in_progress"
  ) {
    return (
      <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-100">
        In Progress
      </span>
    );
  }


  if (
    status === "done"
  ) {
    return (
      <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-100">
        Done
      </span>
    );
  }


  return (
    <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-inset ring-slate-200">
      Todo
    </span>
  );
}


// =========================================
// PRIORITY BADGE
// =========================================

function PriorityBadge({
  priority,
}: {
  priority: TaskPriority;
}) {

  if (
    priority === "high"
  ) {
    return (
      <span className="inline-flex rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 ring-1 ring-inset ring-red-100">
        High
      </span>
    );
  }


  if (
    priority ===
    "medium"
  ) {
    return (
      <span className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-100">
        Medium
      </span>
    );
  }


  return (
    <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-100">
      Low
    </span>
  );
}