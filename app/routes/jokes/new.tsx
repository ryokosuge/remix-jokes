import type { ActionFunction } from "remix";
import { useActionData, redirect } from "remix";
import { db } from "~/utils/db.server";
import { requiredUserId } from "~/utils/session.server";

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

export const ErrorBoundary = () => {
  return (
    <div className="error-container">
      I did a whoopsies.
    </div>
  )
}

const NewJokesRoute = () => {
  const actionData = useActionData<ActionData | undefined>();
  return (
    <div>
      <p>Add your own hilarious joke</p>
      <form method="post">
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
      </form>
    </div>
  );
}

export default NewJokesRoute;
