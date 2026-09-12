"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import { supabase } from "../../lib/supabase";


export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [checkingSession, setCheckingSession] =
    useState(true);

  const [error, setError] =
    useState("");


  useEffect(() => {
    checkSession();
  }, []);


  async function checkSession() {
    const {
      data: { user },
    } =
      await supabase.auth.getUser();

    if (user) {
      router.replace(
        "/dashboard"
      );

      return;
    }

    setCheckingSession(false);
  }


  async function handleLogin(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");


    if (
      !email.trim() ||
      !password
    ) {
      setError(
        "Please enter your email and password."
      );

      return;
    }


    setLoading(true);


    const {
      error: loginError,
    } =
      await supabase.auth
        .signInWithPassword({
          email:
            email.trim(),
          password,
        });


    setLoading(false);


    if (loginError) {
      console.error(
        loginError
      );

      setError(
        loginError.message
      );

      return;
    }


    router.push(
      "/dashboard"
    );
  }


  if (checkingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">

        <div className="flex items-center gap-3 text-sm text-slate-500">

          <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />

          Checking session...

        </div>

      </main>
    );
  }


  return (
    <main className="min-h-screen bg-slate-50">

      <div className="grid min-h-screen lg:grid-cols-2">


        {/* LEFT */}

        <section className="hidden bg-slate-950 lg:flex lg:flex-col lg:justify-between lg:p-12">

          <div>

            <div className="flex items-center gap-3">

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-lg font-bold text-white">
                F
              </div>


              <span className="text-xl font-bold text-white">
                FlowBoard
              </span>

            </div>

          </div>


          <div className="max-w-xl">

            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-400">
              Team collaboration
            </p>


            <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight text-white">
              Organize work.
              <br />
              Collaborate in real time.
            </h1>


            <p className="mt-5 max-w-lg text-base leading-7 text-slate-400">
              Manage workspaces,
              projects, tasks,
              team roles and
              conversations from one
              collaborative board.
            </p>


            <div className="mt-10 grid gap-4 sm:grid-cols-3">

              <FeatureCard
                title="Realtime"
                text="Task and comment updates"
              />

              <FeatureCard
                title="RBAC"
                text="Owner, admin and member roles"
              />

              <FeatureCard
                title="Kanban"
                text="Simple visual task workflow"
              />

            </div>

          </div>


          <p className="text-xs text-slate-600">
            FlowBoard · Team Task Management
          </p>

        </section>


        {/* RIGHT */}

        <section className="flex items-center justify-center px-5 py-12 sm:px-8">

          <div className="w-full max-w-md">


            <div className="lg:hidden">

              <div className="flex items-center gap-3">

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 font-bold text-white">
                  F
                </div>

                <span className="text-xl font-bold text-slate-950">
                  FlowBoard
                </span>

              </div>

            </div>


            <div className="mt-10 lg:mt-0">

              <p className="text-sm font-semibold text-blue-600">
                Welcome back
              </p>


              <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
                Sign in to your account
              </h2>


              <p className="mt-3 text-sm leading-6 text-slate-500">
                Continue managing your
                workspaces, projects and
                tasks.
              </p>

            </div>


            {error && (

              <div className="mt-6 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>

            )}


            <form
              onSubmit={
                handleLogin
              }
              className="mt-8 space-y-5"
            >

              <div>

                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Email
                </label>


                <input
                  type="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(
                      event.target.value
                    )
                  }
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                />

              </div>


              <div>

                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Password
                </label>


                <input
                  type="password"
                  value={password}
                  onChange={(event) =>
                    setPassword(
                      event.target.value
                    )
                  }
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                />

              </div>


              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >

                {loading
                  ? "Signing in..."
                  : "Sign In"}

              </button>

            </form>


            <div className="mt-8 border-t border-slate-200 pt-6 text-center">

              <p className="text-sm text-slate-500">

                Don&apos;t have an account?{" "}

                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      "/register"
                    )
                  }
                  className="font-semibold text-blue-600 hover:text-blue-700"
                >
                  Create account
                </button>

              </p>

            </div>

          </div>

        </section>

      </div>

    </main>
  );
}


function FeatureCard({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">

      <p className="text-sm font-semibold text-white">
        {title}
      </p>


      <p className="mt-1 text-xs leading-5 text-slate-500">
        {text}
      </p>

    </div>
  );
}