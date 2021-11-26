import bcrypt from "bcrypt";
import { createCookieSessionStorage, redirect } from "remix";
import { db } from "./db.server";

type LoginForm = {
  username: string;
  password: string;
};

export const register = async ({ username, password }: LoginForm) => {
  const passwordHash = await bcrypt.hash(password, 10);
  return db.user.create({
    data: {
      username, passwordHash
    }
  })
}

export const login = async ({ username, password }: LoginForm) => {
  const user = await db.user.findUnique({
    where: { username }
  });
  if (user == null) {
    return null;
  }

  const isCorrectPassword = await bcrypt.compare(
    password,
    user.passwordHash
  );
  if (!isCorrectPassword) {
    return null;
  }

  return user;
}

export const logout = async (request: Request) => {
  const session = await storage.getSession(request.headers.get("Cookie"));
  return redirect("/login", {
    headers: {
      "Set-Cookie": await storage.destroySession(session),
    }
  });
}

const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  throw new Error("SESSION_SECRET must be set");
}

const storage = createCookieSessionStorage({
  cookie: {
    name: "RJ_session",
    secure: true,
    secrets: [sessionSecret],
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    httpOnly: true
  },
});

export const getUserSession = (request: Request) => {
  return storage.getSession(request.headers.get("Cookie"));
}

export const getUserId = async (request: Request) => {
  const session = await getUserSession(request);
  const userId = session.get("userId");
  if (userId == null || typeof userId !== "string") {
    return null;
  }
  return userId;
}

export const getUser = async (request: Request) => {
  const userId = await getUserId(request);
  if (typeof userId !== "string") {
    return null;
  }

  try {
    const user = await db.user.findUnique({ where: { id: userId } });
    return user;
  } catch {
    throw logout(request);
  }
}

export const requiredUserId = async (request: Request, redirectTo: string = new URL(request.url).pathname) => {
  const session = await getUserSession(request);
  const userId = session.get("userId");
  if (userId == null || typeof userId !== "string") {
    const searchParams = new URLSearchParams([["redirectTo", redirectTo]]);
    throw redirect(`/login?${searchParams}`)
  }
  return userId;
}

export const createUserSession = async (userId: string, redirectTo: string) => {
  const session = await storage.getSession();
  session.set("userId", userId);
  return redirect(redirectTo, {
    headers: {
      "Set-Cookie": await storage.commitSession(session),
    }
  });
}
