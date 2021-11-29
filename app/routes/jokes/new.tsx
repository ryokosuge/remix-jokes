import { ActionFunction, Form, Link, LoaderFunction, useCatch, useTransition } from "remix";
import { useActionData, redirect } from "remix";
import { db } from "~/utils/db.server";
import { getUserId, requiredUserId } from "~/utils/session.server";
import { JokeDisplay } from "~/components/JokeDisplay";

export const loader: LoaderFunction = async ({ request }) => {
  const userID = await getUserId(request);
  if (userID == null) {
    throw new Response("Unauthrorized", { status: 401 });
  }
  return {};
}

const validateJokeContent = (content: string) => {
  if (content.length < 10) {
    return `That joke is too short`;
  }
}

const validateJokeName = (name: string) => {
  if (name.length < 2) {
    return `That joke's name is too short`;
  }
}

type ActionData = {
  formError?: string;
  fieldErrors?: {
    name: string | undefined;
    content: string | undefined;
  };
  fields?: {
    name: string;
    content: string;
  }
}

export const action: ActionFunction = async ({ request }): Promise<Response | ActionData> => {
  const userId = await requiredUserId(request);
  const form = await request.formData();
  const name = form.get("name");
  const content = form.get("content");

  // we do this type check to be extra sure and to make TypeScript happy
  // we'll explore validation next!!
  if (
    typeof name !== "string" || typeof content !== "string"
  ) {
    return {
      formError: `Formnot submitted correctly.`
    };
  }

  const fieldErrors = {
    name: validateJokeName(name),
    content: validateJokeContent(content),
  };

  const fields = { name, content };
  if (Object.values(fieldErrors).some(Boolean)) {
    return {
      fieldErrors,
      fields
    }
  }

  const joke = await db.joke.create({ data: { ...fields, jokesterId: userId } });
  return redirect(`/jokes/${joke.id}`);
}

const NewJokesRoute = () => {
  const actionData = useActionData<ActionData | undefined>();
  const transition = useTransition();

  if (transition.submission) {
    const name = transition.submission.formData.get("name");
    const content = transition.submission.formData.get("content");

    if (
      typeof name === "string" &&
      typeof content === "string" &&
      !validateJokeName(name) &&
      !validateJokeContent(content)
    ) {
      return (
        <JokeDisplay joke={{ name, content }} isOwner={true} canDelete={false} />
      )
    }
  }

  return (
    <div>
      <p>Add your own hilarious joke</p>
      <Form method="post">
        <div>
          <label>
            Name: {" "}
            <input
              type="text"
              defaultValue={actionData?.fields?.name}
              name="name"
              aria-describedby={actionData?.fieldErrors?.name ? "name-error" : undefined}
              aria-invalid={Boolean(actionData?.fieldErrors?.name) || undefined}
            />
          </label>
          {actionData?.fieldErrors?.name && (
            <p
              className="form-validation-error"
              role="alert"
              id="name-error"
            >
              {actionData?.fieldErrors?.name}
            </p>
          )}
        </div>
        <div>
          <label>
            Content: {" "}
            <textarea
              defaultValue={actionData?.fields?.content}
              name="content"
              aria-describedby={actionData?.fieldErrors?.content ? "content-error" : undefined}
              aria-invalid={Boolean(actionData?.fieldErrors?.content) || undefined}
            />
          </label>
          {actionData?.fieldErrors?.content && (
            <p
              className="form-validation-error"
              role="alert"
              id="content-error"
            >
              {actionData?.fieldErrors?.content}
            </p>
          )}
        </div>
        <div>
          <button type="submit" className="button">
            Add
          </button>
        </div>
      </Form>
    </div>
  );
}

export default NewJokesRoute;

export const CatchBoundary = () => {
  const caught = useCatch();

  if (caught.status === 401) {
    const searchParams = new URLSearchParams([["redirectTo", "/jokes/new"]])
    return (
      <div className="error-container">
        <p>You must be logged in to create a joke.</p>
        <Link to={`/login?${searchParams}`}>Login</Link>
      </div>
    );
  }
}

export const ErrorBoundary = () => {
  return (
    <div className="error-container">
      Something unexpected went wrong. Sorry about that.
    </div>
  );
}
