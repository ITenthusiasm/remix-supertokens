import { useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";

/**
 * Enhanced wrapper around `react-hook-form`'s `useForm` hook, geared specifically towards handling
 * form field errors in Remix.
 * @param serverErrors Any errors returned from a Remix `action` (as an object).
 */
function useFormErrors<ServerActionData>(serverErrors: ServerActionData) {
  type FormFields = Omit<NonNullable<ServerActionData>, "banner">;
  const { register, setError, clearErrors, trigger, formState } = useForm<FormFields>({
    mode: "onBlur",
  });
  const { errors } = formState;

  // Include errors from the server
  useEffect(() => {
    if (!serverErrors) return;

    Object.entries(serverErrors).forEach(([field, message]) => {
      if (field === "banner" || !message) return;
      setError(field as Parameters<typeof setError>[0], { message });
    });
  }, [serverErrors, setError]);

  /** Blocks submission if any field errors _currently_ exist */
  const handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      if (Object.keys(errors).length) event.preventDefault();
    },
    [errors]
  );

  return { register, handleSubmit, clearErrors, trigger, errors };
}

export default useFormErrors;
