// Primary Imports
import { json } from "@remix-run/node";
import type { ActionFunction, LinksFunction } from "@remix-run/node";
import { Form, useActionData, useTransition } from "@remix-run/react";
import { useState, useEffect, useRef, useReducer } from "react";
import useFormLocalStorage from "~/hooks/useFormLocalStorage";

// Styles
import styles from "~/styles/form-test.css";

/* -------------------- Browser -------------------- */
type FormField = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

/* ---------- Reducer Setup ---------- */
interface TestData {
  "input-1": string;
  "select-1": string;
  "multiselect-1": string[];
  "textarea-1": string;
  "checkbox-1": boolean;
  status: "success" | "random" | "failure";
}

/** Default data in the `form` if there's nothing to read from `localStorage` */
const defaultData: TestData = {
  "input-1": "",
  "select-1": "",
  "multiselect-1": ["2", "3"],
  "textarea-1": "",
  "checkbox-1": false,
  status: "random",
};

function formDataReducer(
  state: Partial<TestData>,
  action: typeof state | { type: "reset"; payload: typeof state }
): typeof state {
  if ("type" in action && action.type === "reset") return initReducer(action.payload);
  return { ...state, ...action };
}

function initReducer(initialState: Partial<TestData>): typeof initialState {
  if (typeof window === "undefined") return initialState;

  const fields = Array.from(document.querySelectorAll<FormField>("input, textarea, select"));
  return fields.reduce((data, { name }) => {
    const storedValue = getStorageItemFromName(name);
    return storedValue != null ? { ...data, [name]: storedValue } : data;
  }, initialState);
}

/* ---------- Browser Helper Functions ---------- */
function getStorageItemFromName(name?: string): TestData[keyof TestData] | null {
  // Check for name
  if (!name) return null;

  // Check for stored value
  const storedValueString = localStorage.getItem(name);
  if (!storedValueString) return null;

  return JSON.parse(storedValueString);
}

/* ---------- Page Component ---------- */
export default function FormTest() {
  const actionData = useActionData<ActionData>();
  const transition = useTransition();
  const { formRef, clearStorage } = useFormLocalStorage();

  const [currentData, setCurrentData] = useReducer(formDataReducer, defaultData, initReducer);
  const [readData, setReadData] = useReducer(formDataReducer, {}, initReducer);

  // Needed because `initReducer` returns different values during Server Rendering and Client-Side Rendering
  const [inBrowser, setInBrowser] = useState(false);
  useEffect(() => setInBrowser(true), []);

  /* -------------------- Handle Form Resets (after submissions) -------------------- */
  const resetButton = useRef({} as HTMLButtonElement & { type: "reset" });

  useEffect(() => {
    if (transition.state !== "idle" || !actionData?.success) return;

    clearStorage();
    setReadData({ type: "reset", payload: initReducer({}) });

    resetButton.current.click();
    setCurrentData({ type: "reset", payload: initReducer(defaultData) });
  }, [transition.state, actionData?.success, clearStorage]);

  /* -------------------- Watch Field Values -------------------- */
  function handleInput(event: InputEvent & { target: Exclude<FormField, HTMLSelectElement> }) {
    const field = event.target;

    // Checkboxes
    if (field instanceof HTMLInputElement && field.type === "checkbox") {
      setCurrentData({ [field.name]: field.checked });
    }
    // Other Simple Inputs
    else setCurrentData({ [field.name]: field.value });
  }

  function handleChange(event: Event & { target: Extract<FormField, HTMLSelectElement> }) {
    const select = event.target;
    if (!select.multiple) setCurrentData({ [select.name]: select.value });
    else setCurrentData({ [select.name]: [...select.selectedOptions].map((o) => o.value) });
  }

  /*
   * NOTE: React DOES NOT support _true_ `change` events. So `addEventListener` is necessary.
   * See: https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/change_event
   */
  useEffect(function setupListeners() {
    const selectFields = document.querySelectorAll("select");
    const simpleFields = document.querySelectorAll<HTMLElement>("input, textarea");

    selectFields.forEach((f) => f.addEventListener("change", handleChange as EventListener));
    simpleFields.forEach((f) => f.addEventListener("input", handleInput as EventListener));

    return function cleanupListeners() {
      selectFields.forEach((f) => f.removeEventListener("change", handleChange as EventListener));
      simpleFields.forEach((f) => f.removeEventListener("input", handleInput as EventListener));
    };
  }, []);

  /* -------------------- Watch `localStorage` Values -------------------- */
  function readFromLocalStorage(event: Event & { target: FormField }) {
    const { name } = event.target;
    const storedValue = getStorageItemFromName(name);
    if (storedValue != null) setReadData({ [name]: storedValue });
  }

  useEffect(function setupStorageWatchers() {
    const fields = document.querySelectorAll<HTMLElement>("input, textarea, select");
    fields.forEach((f) => f.addEventListener("change", readFromLocalStorage as EventListener));

    return function cleanupStorageWatchers() {
      fields.forEach((f) => f.removeEventListener("change", readFromLocalStorage as EventListener));
    };
  }, []);

  return (
    <div className="form-test">
      <h1 aria-live="polite">
        Form Response Status: {!actionData ? "None" : actionData.success ? "Success" : "Failure"}
      </h1>
      {!actionData && <p>(try submitting something)</p>}

      <Form method="post" ref={formRef} aria-label="Test Data">
        <label htmlFor="input-1">Input 1</label>
        <input id="input-1" name="input-1" type="text" defaultValue={defaultData["input-1"]} />

        {/*
         ** Note: Usually the `selected` attribute on `option` elements would be used for default
         ** `select` values. However, React does not support this. It instead requires `defaultValue`,
         ** as it does with other field types. This is odd and unorthodox, but there's no avoiding it.
         **/}
        <label htmlFor="select-1">Select 1</label>
        <select id="select-1" name="select-1" defaultValue={defaultData["select-1"]}>
          <option value="" disabled>
            Choose One
          </option>
          <option value="1">First</option>
          <option value="2">Second</option>
          <option value="3">Third</option>
        </select>

        <label htmlFor="multiselect-1">MultiSelect 1</label>
        <select
          id="multiselect-1"
          name="multiselect-1"
          multiple
          defaultValue={defaultData["multiselect-1"]}
        >
          <option value="1">First</option>
          <option value="2">Second</option>
          <option value="3">Third</option>
        </select>

        <label htmlFor="textarea-1">Textarea 1</label>
        <textarea id="textarea-1" name="textarea-1" defaultValue={defaultData["textarea-1"]} />

        <input
          id="checkbox-1"
          name="checkbox-1"
          type="checkbox"
          defaultChecked={defaultData["checkbox-1"]}
        />
        <label htmlFor="checkbox-1">Checkbox 1</label>

        <fieldset>
          <legend>Force Response Status</legend>

          <input id="success" name="status" value="success" type="radio" />
          <label htmlFor="success">Success</label>

          <input id="failure" name="status" value="failure" type="radio" />
          <label htmlFor="failure">Failure</label>

          <input id="random" name="status" value="random" type="radio" defaultChecked />
          <label htmlFor="random">Random</label>
        </fieldset>

        <button type="submit" disabled={transition.state !== "idle"}>
          {transition.state === "idle" ? "Submit" : "Submitting..."}
        </button>
        <button ref={resetButton} type="reset" />
      </Form>

      <div className="form-data-display">
        <div>
          <h2>Current Form Data:</h2>
          <pre>{inBrowser && JSON.stringify(currentData, null, 2)}</pre>
        </div>

        <div>
          <h2>Data in Local Storage:</h2>
          <pre>{inBrowser && JSON.stringify(readData, null, 2)}</pre>
        </div>
      </div>
    </div>
  );
}

export const links: LinksFunction = () => [{ rel: "stylesheet", href: styles }];

/* -------------------- Server -------------------- */
type ActionData = { success: boolean };

export const action: ActionFunction = async ({ request }) => {
  const { status } = (await request.formData().then(Object.fromEntries)) as TestData;
  if (status === "success") return json<ActionData>({ success: true });
  if (status === "failure") return json<ActionData>({ success: false });
  return json<ActionData>({ success: Math.random() < 0.5 });
};
