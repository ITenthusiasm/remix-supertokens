// Primary Imports
import { json } from "@remix-run/node";
import type { LoaderFunction, ActionFunction, LinksFunction, AppLoadContext } from "@remix-run/node";
import { Form, useLoaderData, useActionData } from "@remix-run/react";

// Styles
import styles from "~/styles/routes/private.css?url";

/* -------------------- Browser -------------------- */
export default function Private() {
  const { user } = useLoaderData<LoaderData>();
  const submissionResponse = useActionData<ActionData>();

  return (
    <div id="private-page">
      <h1>Hello! This page is private! 🤫 Your user id: {user.id}</h1>
      <h2>Try submitting some data!</h2>

      <div className="form-submission-example">
        <Form method="post">
          <h3>Form</h3>

          <label htmlFor="text">Text Input</label>
          <input id="text" name="text" type="text" />
          <button type="submit">Submit</button>
        </Form>

        <hr />

        <div>
          <h3>Response</h3>
          {submissionResponse?.success && <pre>{JSON.stringify(submissionResponse.data, null, 2)}</pre>}
        </div>
      </div>
    </div>
  );
}

export const links: LinksFunction = () => [{ rel: "stylesheet", href: styles }];

/* -------------------- Server -------------------- */
interface LoaderData {
  user: NonNullable<AppLoadContext["user"]>;
}

export const loader: LoaderFunction = ({ context }) => {
  return json<LoaderData>({ user: context.user as LoaderData["user"] });
};

type ActionData = undefined | { success: boolean; data: { text: string } };

export const action: ActionFunction = async ({ request }) => {
  const data = await request.formData().then(Object.fromEntries);
  return json<ActionData>({ success: true, data });
};
