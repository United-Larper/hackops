// The standard task list a hackathon gets when it moves to Registered (spec §5).
// Due dates count back from the submission deadline; without one, tasks have no due date.

export const TASK_TEMPLATE: { title: string; hoursBeforeSubmission: number }[] = [
  { title: "Form the team and pick roles", hoursBeforeSubmission: 72 },
  { title: "Pick the idea and prize tracks", hoursBeforeSubmission: 60 },
  { title: "Create the repo", hoursBeforeSubmission: 48 },
  { title: "Build the MVP", hoursBeforeSubmission: 12 },
  { title: "Record the demo video", hoursBeforeSubmission: 6 },
  { title: "Write the README", hoursBeforeSubmission: 4 },
  { title: "Submit", hoursBeforeSubmission: 1 },
];

export function templateTasks(submissionDueAt: Date | null, now = new Date()) {
  return TASK_TEMPLATE.map((t, order) => {
    if (!submissionDueAt) return { title: t.title, order, dueAt: null };
    const due = new Date(submissionDueAt.getTime() - t.hoursBeforeSubmission * 3_600_000);
    // A due date already in the past is clamped to now, so a late registration still gets a usable list.
    return { title: t.title, order, dueAt: due < now ? now : due };
  });
}
