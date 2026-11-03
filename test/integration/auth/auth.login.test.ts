import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  setSystemTime,
} from "bun:test";
import { createTestApp } from "../testHelper";
import { signupOneUser } from "./auth.signup.test";
import { StatusCodes } from "http-status-codes";
import type { JwtSchema, LoggingInUser } from "@src/models/user";
import type { ReadonlyDeep } from "type-fest";
import { AUTH_CONFIG } from "@src/config";

const JANE = {
  name: "Jane Doe",
  username: "janedoe",
  password: "123456789",
};
const MARY = {
  name: "Mary Jane",
  username: "maryjane",
  password: "123abcxyz@",
};

const app = await (async () => {
  const app = createTestApp();
  await signupOneUser(JANE, app);
  return app;
})();

const BASE_URL = "/auth/login";
const START_DATE = new Date();
const RESOURCE_URL = "/api/v1/game";
const REFRESH_URL = "auth/refresh";

describe("auth/login", () => {
  it("should log in with correct credentials", async () => {
    await signupOneUser(JANE);

    const response = await loginOneUser({
      username: JANE.username,
      password: JANE.password,
    });

    expect(response.status).toBe(StatusCodes.OK);
    expectAuthCookies(response);
  });

  it("should reject wrong credentials", async () => {
    await signupOneUser(JANE);

    const wrongPassword = await loginOneUser({
      username: JANE.username,
      password: "wrong-password",
    });
    expect(wrongPassword.status).toBe(StatusCodes.UNAUTHORIZED);
    expect(getCookie(wrongPassword, "access_token")).toBeUndefined();
    expect(getCookie(wrongPassword, "refresh_token")).toBeUndefined();

    const unknownUser = await loginOneUser({
      username: "nobody",
      password: JANE.password,
    });
    expect(unknownUser.status).toBe(StatusCodes.UNAUTHORIZED);
    expect(getCookie(unknownUser, "access_token")).toBeUndefined();
    expect(getCookie(unknownUser, "refresh_token")).toBeUndefined();
  });

  it("should log in twice", async () => {
    await signupOneUser(JANE);

    const first = await loginOneUser(JANE);
    expect(first.status).toBe(StatusCodes.OK);
    expectAuthCookies(first);

    const second = await loginOneUser(JANE);
    expect(second.status).toBe(StatusCodes.OK);
    expectAuthCookies(second);
  });

  it("should allow protected resource after logging in", async () => {
    await signupOneUser(JANE);
    const res = await loginOneUser(JANE);
    const { accessToken } = expectAuthCookies(res);

    const resourceRes = await getResource(accessToken);
    expect(resourceRes.status).toBe(StatusCodes.OK);
  });
});

describe("auth/login JWT", () => {
  function verifyJwtTimeToLiveAssumption() {
    const tenMinute = 10 * 60;
    const twoWeeks = 2 * 7 * 24 * 60 * 60;
    const oneMonth = 30 * 24 * 60 * 60;
    expect(AUTH_CONFIG.jwt.accessTtl).toBe(tenMinute);
    expect(AUTH_CONFIG.jwt.refreshTtl.each).toBe(twoWeeks);
    expect(AUTH_CONFIG.jwt.refreshTtl.family).toBe(oneMonth);
  }
  beforeEach(async () => {
    setSystemTime(START_DATE);
    await signupOneUser(JANE);
    await signupOneUser(MARY);
  });
  afterAll(() => setSystemTime());
  beforeAll(verifyJwtTimeToLiveAssumption);

  it("should give 2 uesrs different tokens", async () => {
    const resJane = await loginOneUser(JANE);
    const resMary = await loginOneUser(MARY);

    const janeTokens = expectAuthCookies(resJane);
    const maryTokens = expectAuthCookies(resMary);

    expect(janeTokens.accessToken).not.toEqual(maryTokens.accessToken);
    expect(janeTokens.accessToken).not.toEqual(maryTokens.refreshToken);
    expect(janeTokens.refreshToken).not.toEqual(maryTokens.accessToken);
    expect(janeTokens.accessToken).not.toEqual(maryTokens.refreshToken);
  });

  it("should give 2 logins different tokens", async () => {
    advanceSeconds(0);
    const firstRes = await loginOneUser(JANE);
    advanceSeconds(0);
    const secondRes = await loginOneUser(JANE);

    const firstTokens = expectAuthCookies(firstRes);
    const secondTokens = expectAuthCookies(secondRes);

    expect(firstTokens.accessToken).not.toEqual(secondTokens.accessToken);
    expect(firstTokens.accessToken).not.toEqual(secondTokens.refreshToken);
    expect(firstTokens.refreshToken).not.toEqual(secondTokens.accessToken);
    expect(firstTokens.accessToken).not.toEqual(secondTokens.refreshToken);
  });

  it("should reject unauthenticated access", async () => {
    const tokens = expectAuthCookies(await loginOneUser(JANE));
    function changeToken(inputToken: string) {
      if (inputToken[0] == "a") return inputToken.replace("a", "b");
      return inputToken.replace(inputToken[0]!, "a");
    }
    const resourceRes = await getResource(changeToken(tokens.accessToken));
    expect(resourceRes.status).toBe(StatusCodes.UNAUTHORIZED);
    expect(JSON.stringify(await resourceRes.text())).toContain("Unauthorized");

    const refreshRes = await refreshOneUser(changeToken(tokens.refreshToken));
    expect(refreshRes.status).toBe(StatusCodes.UNAUTHORIZED);
    expect(JSON.stringify(await refreshRes.text())).toContain(
      "Invalid credentials",
    );
  });

  it("should reject expired access token", async () => {
    const { accessToken } = expectAuthCookies(await loginOneUser(JANE));

    advanceSeconds(AUTH_CONFIG.jwt.accessTtl + 1);

    const res = await getResource(accessToken);
    expect(res.status).toBe(StatusCodes.UNAUTHORIZED);
    expect(JSON.stringify(await res.text())).not.toContain("expired");
  });

  it("should allow valid refresh token and returned access token", async () => {
    const first = expectAuthCookies(await loginOneUser(JANE));

    const res = await refreshOneUser(first.refreshToken);
    expect(res.status).toBe(StatusCodes.OK);
    const second = expectAuthCookies(res);

    expect(second.accessToken).not.toEqual(first.accessToken);
    expect(second.refreshToken).not.toEqual(first.refreshToken);

    const resourceRes = await getResource(second.accessToken);
    expect(resourceRes.status).toBe(StatusCodes.OK);
  });

  it("should reject expired refresh token", async () => {
    const { refreshToken } = expectAuthCookies(await loginOneUser(JANE));

    advanceSeconds(AUTH_CONFIG.jwt.refreshTtl.each + 1);

    const res = await refreshOneUser(refreshToken);
    expect(res.status).toBe(StatusCodes.UNAUTHORIZED);
    expect(JSON.stringify(await res.text())).not.toContain("expired");
  });

  it("should reject expired family", async () => {
    let tokens = expectAuthCookies(await loginOneUser(JANE));

    expect(AUTH_CONFIG.jwt.refreshTtl.each).toBeGreaterThan(60);
    const stepInSeconds = AUTH_CONFIG.jwt.refreshTtl.each - 60;
    for (
      let elapsed = stepInSeconds;
      elapsed < AUTH_CONFIG.jwt.refreshTtl.family;
      elapsed += stepInSeconds
    ) {
      advanceSeconds(elapsed);
      const res = await refreshOneUser(tokens.refreshToken);
      expect(res.status).toBe(StatusCodes.OK);
      tokens = expectAuthCookies(res);
    }

    advanceSeconds(AUTH_CONFIG.jwt.refreshTtl.family + 1);
    const res = await refreshOneUser(tokens.refreshToken);
    expect(res.status).toBe(StatusCodes.UNAUTHORIZED);
  });

  it("should reject garbage tokens", async () => {
    for (const garbage of ["garbage", "a.b.c", "....", "x".repeat(2048)]) {
      const resourceRes = await getResource(garbage);
      expect(resourceRes.status).toBe(StatusCodes.UNAUTHORIZED);

      const refreshRes = await refreshOneUser(garbage);
      expect(refreshRes.status).toBe(StatusCodes.UNAUTHORIZED);
    }
  });

  it("should revoke family if reuse is detected", async () => {
    const first = expectAuthCookies(await loginOneUser(JANE));
    const rotated = await refreshOneUser(first.refreshToken);
    expect(rotated.status).toBe(StatusCodes.OK);
    const second = expectAuthCookies(rotated);
    const reuse = await refreshOneUser(first.refreshToken);
    expect(reuse.status).toBe(StatusCodes.UNAUTHORIZED);
    const afterRevoke = await refreshOneUser(second.refreshToken);
    expect(afterRevoke.status).toBe(StatusCodes.UNAUTHORIZED);
  });
});

function getCookie(response: Response, name: string): string | undefined {
  for (const raw of response.headers.getSetCookie()) {
    const [pair] = raw.split(";");
    const eq = pair!.indexOf("=");
    if (pair!.slice(0, eq).trim() === name) {
      return pair!.slice(eq + 1).trim();
    }
  }
  return undefined;
}

function expectAuthCookies(response: Response): JwtSchema {
  const accessToken = getCookie(response, "access_token");
  const refreshToken = getCookie(response, "refresh_token");

  expect(accessToken).toBeString();
  expect(accessToken!.length).toBeGreaterThan(0);
  expect(refreshToken).toBeString();
  expect(refreshToken!.length).toBeGreaterThan(0);

  return { accessToken: accessToken!, refreshToken: refreshToken! };
}

export async function loginOneUser(
  credentials: Partial<ReadonlyDeep<LoggingInUser>>,
  appOverride?: typeof app,
): Promise<Response> {
  return await (appOverride ?? app).request(BASE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(credentials),
  });
}

function advanceSeconds(seconds: number) {
  setSystemTime(new Date(START_DATE.getTime() + seconds * 1000));
}

async function getResource(accessToken: string): Promise<Response> {
  return app.request(RESOURCE_URL, {
    method: "GET",
    headers: { Cookie: `access_token=${accessToken}` },
  });
}

async function refreshOneUser(refreshToken: string): Promise<Response> {
  return await app.request(REFRESH_URL, {
    method: "POST",
    headers: {
      Cookie: `refresh_token=${refreshToken}`,
      Origin: `http://localhost:${process.env.SERVE_PORT}`,
    },
  });
}
