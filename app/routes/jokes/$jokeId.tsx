import { LoaderFunction, ActionFunction, MetaFunction } from "remix";
import { Link, useLoaderData, useParams, useCatch, redirect } from "remix";
import type { Joke } from "@prisma/client";
import { db } from "~/utils/db.server"
import { getUserId, requiredUserId } from "~/utils/session.server";

type LoaderData = {
  joke: Joke;
  isOwner: boolean;
};

export const loader: LoaderFunction = async ({ request, params }) => {
  const userId = await getUserId(request);
  const joke = await db.joke.findUnique({
    where: { id: params.jokeId }
  });
  if (joke == null) {
    throw new Response("What a joke! Not found.", {
      status: 404
    });
  }

  const data: LoaderData = {
    joke,
    isOwner: userId === joke.jokesterId
  }
  return data;
}

export const action: ActionFunction = async ({ request, params }) => {
  const form = await request.formData();
  if (form.get("_method") !== "delete") {
    return;
  }

  const { jokeId } = params;
  const userID = await requiredUserId(request);
  const joke = await db.joke.findUnique({ where: { id: jokeId } });
  if (joke == null) {
    throw new Response(
      "Can't delete what does not exist",
      { status: 404 }
    );
  }

  if (joke.jokesterId !== userID) {
    throw new Response("Pssh, nice try. That's not your joke", { status: 401 });
  }

  await db.joke.delete({ where: { id: jokeId } });
  return redirect("/jokes");
}

export const meta: MetaFunction = ({ data }: { data?: LoaderData }) => {
  if (data == null) {
    return {
      title: "No joke",
      description: "No joke found"
    };
  }

  return {
    title: `"${data.joke.name}" joke`,
    description: `Enjoy the "${data.joke.name}" joke and much more`
  };
}

export const ErrorBoundary = () => {
  const { jokeId } = useParams();
  return (
    <div className="error-container">{`There was an error loading joke by the id ${jokeId}. Sorry.`}</div>
  );
}

export const CatchBoundary = () => {
  const caught = useCatch();
  const { jokeId } = useParams();
  switch (caught.status) {
    case 404: {
      return (
        <div className="error-container">
          Huh? What the heck is "{jokeId}"?
        </div>
      );
    }
    case 401: {
      return (
        <div className="error-container">
          Sorry, but {jokeId} is not your joke.
        </div>
      );
    }
    default: {
      throw new Error(`Unhandled error: ${caught.status}`);
    }
  }
}

const JokeRoute = () => {
  const data = useLoaderData<LoaderData>();
  return (
    <div>
      <p>Here's your hilarious joke:</p>
      <p>{data.joke.content}</p>
      <Link to=".">{data.joke.name} Permalink</Link>
      {data.isOwner && (
        <form method="post">
          <input
            type="hidden"
            name="_method"
            value="delete"
          />
          <button type="submit" className="button">
            Delete
          </button>
        </form>
      )}
    </div>
  );
}

export default JokeRoute;
