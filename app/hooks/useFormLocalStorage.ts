import { useCallback, useMemo } from "react";

type FormField = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

interface UseFormLocalStorageReturn {
  /** A `ref` passed to a `form` element to ensure that its data is kept up-to-date in `localStorage` */
  formRef: ReturnType<typeof actWithLocalStorage>;

  /** Clears all data (that is related to the target `form`) from `localStorage` */
  clearStorage(): void;
}

function useFormLocalStorage(): UseFormLocalStorageReturn {
  const fieldNames = useMemo(() => new Set<string>(), []);

  const clearStorage = useCallback((): void => {
    fieldNames.forEach((name) => localStorage.removeItem(name));
  }, [fieldNames]);

  const formRef = useMemo(() => actWithLocalStorage(fieldNames), [fieldNames]);

  return { formRef, clearStorage };
}

/**
 * A `React Action` that automatically stores a `form`'s data in `localStorage` as its fields `change`.
 * Also retrieves any relevant form data from `localStorage` on page reload/navigation.
 * @param fieldNames An array for holding all of the target `form`'s field `name`s. `actWithLocalStorage`
 *                   modifies this array `onmount` for use within the `useFormLocalStorage` hook.
 */
function actWithLocalStorage(fieldNames: Set<string>) {
  let form: HTMLFormElement | null;

  return function (reactRef: typeof form): void {
    // Element is being mounted
    if (reactRef !== null) {
      form = reactRef;

      iterateFormFields(form.elements, (field) => {
        // Only store fields that have a valid `name`
        if (!field.name) return;

        // Update `fieldNames` for the `useFormLocalStorage` hook.
        fieldNames.add(field.name);

        /* ---------- Reload form data from `localStorage` ---------- */
        const storedValueString = localStorage.getItem(field.name);

        if (storedValueString) {
          const storedValue = JSON.parse(storedValueString);

          // Checkboxes
          if (field instanceof HTMLInputElement && field.type === "checkbox") {
            field.checked = storedValue as boolean;
          }
          // Radio Buttons
          if (field instanceof HTMLInputElement && field.type === "radio") {
            field.checked = field.value === (storedValue as string);
          }
          // Multi-Selects
          else if (field instanceof HTMLSelectElement && field.multiple) {
            if (!Array.isArray(storedValue)) return; // Only used for type casting

            for (const option of field.options) {
              if (!storedValue.length) break;
              const index = storedValue.findIndex((value: string) => value === option.value);

              if (index < 0) option.selected = false;
              else {
                option.selected = true;
                storedValue.splice(index, 1);
              }
            }
          }
          // Other Form Fields
          else field.value = storedValue as string;
        }

        /* ---------- Attach Event Handlers ---------- */
        field.addEventListener("change", handleChange as EventListener);
      });
    }
    // Element is being unmounted
    else {
      if (form) {
        iterateFormFields(form.elements, (field) => {
          field.removeEventListener("change", handleChange as EventListener);
        });
      }

      form = null;
    }
  };
}

/** Stores the value of a form field in `localStorage` when it changes, using the field's `name` as a key */
function handleChange(event: Event & { target: FormField }): void {
  const field = event.target;

  // Checkboxes
  if (field instanceof HTMLInputElement && field.type === "checkbox") {
    localStorage.setItem(field.name, JSON.stringify(field.checked));
    return;
  }

  // Multi-Selects
  if (field instanceof HTMLSelectElement && field.multiple) {
    const values = Array.from(field.selectedOptions).map((option) => option.value);
    localStorage.setItem(field.name, JSON.stringify(values));
    return;
  }

  // Other Form Fields
  localStorage.setItem(field.name, JSON.stringify(field.value));
}

const formFieldTags = ["INPUT", "TEXTAREA", "SELECT"];
const restrictedInputs = ["file", "password", "hidden"];

function iterateFormFields(elements: HTMLFormControlsCollection, handler: (e: FormField) => void) {
  for (const element of elements) {
    if (!formFieldTags.includes(element.tagName)) continue;
    if (restrictedInputs.includes((element as HTMLInputElement).type)) continue;
    handler(element as FormField);
  }
}

export default useFormLocalStorage;
