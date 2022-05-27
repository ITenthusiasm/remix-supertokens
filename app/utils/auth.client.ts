type SuperTokensResponse<T = {}> = { status: "OK" } & T;

export async function logout(): Promise<SuperTokensResponse> {
  const response = await fetch(`/auth/signout`, { method: "POST" });

  try {
    const body = response.json();
    console.log("Response Body: ", body);
    // window.location.assign("/login");
    return body;
  } catch (err) {
    return response.text();
  }
}
