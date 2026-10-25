import { describe, it, expect } from "bun:test";
import { createApp } from "../../src/app";
import { InsertedUser, ResponsedUser, userTable } from "../../src/models/user";
import { database } from "../../src/db";
import { StatusCodes } from "http-status-codes";
import type { UsernameExistsError } from "../../src/error";

const app = createApp({
  isProd: false,
  host: process.env.SERVE_HOST!,
  port: Number(process.env.SERVE_PORT),
});

const BASE_URL = "/auth";

describe("auth/signup", () => {
  it("should add new user", async () => {
    const response = await signupOneUser({
      name: "Jane Doe",
      username: "janedoe",
      password: "123456789",
    });

    expect(response.status).toBe(StatusCodes.CREATED);

    const body = ResponsedUser.parse(await response.json());
    expect(body.id).toBeFinite();
    expect(body.name).toBe("Jane Doe");
    expect(body.username).toBe("janedoe");

    const dbRows = await database.select().from(userTable);
    expect(dbRows.length).toBe(1);
    expect(dbRows[0]!.username).toBe("janedoe");
  });

  it("should reject wrong format", async () => {
    const response = await signupOneUser({ name: "missing fields" });

    expect(response.status).toBe(StatusCodes.BAD_REQUEST);
  });

  it("should reject existing username", async () => {
    const response = await signupOneUser({
      name: "Jane Doe",
      username: "janedoe",
      password: "123456789",
    });
    expect(response.status).toBe(StatusCodes.CREATED);
    const duplicatedReqRespose = await signupOneUser({
      name: "Mary Jane",
      username: "janedoe",
      password: "123456789ABC",
    });
    expect(duplicatedReqRespose.status).toBe(StatusCodes.BAD_REQUEST);
    const body = (await duplicatedReqRespose.json()) as UsernameExistsError;
    expect(body.reason).toInclude("exists");
  });
});

async function signupOneUser(
  user: Partial<Readonly<InsertedUser>>,
): Promise<Response> {
  return await app.request(`${BASE_URL}/signup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(user),
  });
}
