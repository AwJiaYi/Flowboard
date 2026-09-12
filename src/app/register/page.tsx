"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import { supabase } from "../../lib/supabase";


export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] =
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


  async function handleRegister(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");


    if (
      !name.trim() ||
      !email.trim() ||
      !password ||
      !confirmPassword
    ) {
      setError(
        "Please complete all fields."
      );

      return;
    }


    if (
      password !==
      confirmPassword
    ) {
      setError(
        "Passwords do not match."
      );

      return;
    }


    if (
      password.length < 6
    ) {
      setError(
        "Password must contain at least 6 characters."
      );

      return;
    }


    setLoading(true);


    const {
      data,
      error:
        registerError,
    } =
      await supabase.auth
        .signUp({
          email:
            email.trim(),

          password,

          options: {
            data: {
              name:
                name.trim(),
            },
          },
        });


    setLoading(false);


    if (registerError) {
      console.error(
        registerError
      );

      setError(
        registerError.message
      );

      return;
    }


    if (data.session) {
      router.push(
        "/dashboard"
      );

      return;
    }


    router.push(
      "/login"
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
              Build together
            </p>


            <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight text-white">
              One workspace for
              your team&apos;s work.
            </h1>


            <p className="mt-5 max-w-lg text-base leading-7 text-slate-400">
              Create projects,
              organize tasks,
              collaborate through
              comments and keep every
              update synchronized in
              real time.
            </p>


            <div className="mt-10 space-y-4">

              <RegisterPoint
                number="01"
                title="Create a workspace"
                text="Set up your team space in seconds."
              />

              <RegisterPoint
                number="02"
                title="Invite your team"
                text="Assign owner, admin and member roles."
              />

              <RegisterPoint
                number="03"
                title="Work in real time"
                text="Updates are synchronized across active users."
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
                Get started
              </p>


              <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
                Create your account
              </h2>


              <p className="mt-3 text-sm leading-6 text-slate-500">
                Start managing projects
                and collaborating with
                your team.
              </p>

            </div>


            {error && (

              <div className="mt-6 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>

            )}


            <form
              onSubmit={
                handleRegister
              }
              className="mt-8 space-y-5"
            >

              <div>

                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Name
                </label>


                <input
                  type="text"
                  value={name}
                  onChange={(event) =>
                    setName(
                      event.target.value
                    )
                  }
                  placeholder="Your name"
                  autoComplete="name"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                />

              </div>


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
                  placeholder="At least 6 characters"
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                />

              </div>


              <div>

                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Confirm Password
                </label>


                <input
                  type="password"
                  value={
                    confirmPassword
                  }
                  onChange={(event) =>
                    setConfirmPassword(
                      event.target.value
                    )
                  }
                  placeholder="Repeat your password"
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                />

              </div>


              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >

                {loading
                  ? "Creating account..."
                  : "Create Account"}

              </button>

            </form>


            <div className="mt-8 border-t border-slate-200 pt-6 text-center">

              <p className="text-sm text-slate-500">

                Already have an account?{" "}

                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      "/login"
                    )
                  }
                  className="font-semibold text-blue-600 hover:text-blue-700"
                >
                  Sign in
                </button>

              </p>

            </div>

          </div>

        </section>

      </div>

    </main>
  );
}


function RegisterPoint({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <div className="flex gap-4">

      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600/10 text-xs font-bold text-blue-400">
        {number}
      </div>


      <div>

        <p className="text-sm font-semibold text-white">
          {title}
        </p>


        <p className="mt-1 text-sm text-slate-500">
          {text}
        </p>

      </div>

    </div>
  );
}