import type { LoaderFunction } from "remix";
import { Link, useLoaderData, useParams } from "remix";
import type { Joke } from "@prisma/client";
import { db } from "~/utils/db.server"

type LoaderData = {
  joke: Joke
};

export const loader: LoaderFunction = async ({ params }) => {
  const joke = await db.joke.findUnique({
    where: { id: params.jokeId }
  });
  if (joke == null) {
    throw new Error("Joke not found!")
  }

  return { joke }
}

const ErrorBoundary = () => {
  const { jokeId } = useParams();
  return (
    <div className="error-container">{`There was an error loading joke by the id ${jokeId}. Sorry.`}</div>
  );
}

const JokeRoute = () => {
  const data = useLoaderData<LoaderData>();
  return (
    <div>
      <p>Here's your hilarious joke:</p>
      <p>{data.joke.content}</p>
      <Link to=".">{data.joke.name} Permalink</Link>
    </div>
  );
}

export default JokeRoute;
