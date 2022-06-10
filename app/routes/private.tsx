import { json } from "@remix-run/node";
import type { LoaderFunction } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";

export default function Private() {
  const { user } = useLoaderData<LoaderData>();

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", lineHeight: "1.4" }}>
      <h1 style={{ textAlign: "center" }}>Hello! This page private! 🤫 Your user id: {user.id}</h1>
    </div>
  );
}

interface LoaderData {
  user: Required<{ id?: string }>;
}

export const loader: LoaderFunction = ({ context }) => {
  return json<LoaderData>({ user: { id: context.user.id as string } });
};
