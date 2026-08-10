const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const buildDir = process.env.LINDIO_TEST_BUILD_DIR;
const { createSupabaseAuthRepository } = require(path.join(buildDir, "repositories", "supabaseAuthRepository.js"));

test("signup invia il nome come metadata non autorizzativa", async () => {
  let captured;
  const client = {
    auth: {
      signUp: async (input) => {
        captured = input;
        return {
          data: { session: { access_token: "test" }, user: { email: input.email } },
          error: null
        };
      },
      resetPasswordForEmail: async () => ({ error: null })
    }
  };

  const repository = createSupabaseAuthRepository(client);
  const result = await repository.signUp({
    fullName: "Francesco Cella",
    email: "francesco@example.com",
    password: "password-sicura"
  });

  assert.equal(captured.options.data.full_name, "Francesco Cella");
  assert.equal(result.hasSession, true);
});

test("recupero password inoltra il redirect esplicito", async () => {
  let captured;
  const client = {
    auth: {
      signUp: async () => ({ data: {}, error: null }),
      resetPasswordForEmail: async (email, options) => {
        captured = { email, options };
        return { error: null };
      }
    }
  };

  const repository = createSupabaseAuthRepository(client);
  await repository.requestPasswordReset({
    email: "utente@example.com",
    redirectTo: "http://localhost:5173/reset-password"
  });

  assert.equal(captured.email, "utente@example.com");
  assert.equal(captured.options.redirectTo, "http://localhost:5173/reset-password");
});
