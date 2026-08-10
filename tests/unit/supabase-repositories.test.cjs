const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const buildDir = process.env.LINDIO_TEST_BUILD_DIR;
const { createSupabaseLeadRepository } = require(path.join(buildDir, "repositories", "supabaseLeadRepository.js"));
const { createSupabaseAccountRepository } = require(path.join(buildDir, "repositories", "supabaseAccountRepository.js"));

function leadDraft(overrides = {}) {
  return {
    customerName: "  Cliente RPC  ",
    phone: "",
    email: "",
    source: "WhatsApp",
    serviceType: "  Pulizia appartamento ",
    city: " Potenza ",
    address: "",
    urgency: "Media",
    status: "Nuova",
    nextAction: "Rispondere al cliente",
    followUpAt: "2026-08-11T10:00",
    estimatedValue: 120,
    rawMessage: "Richiesta",
    aiSummary: "",
    aiSuggestedReply: "",
    ...overrides
  };
}

function leadRow() {
  return {
    id: "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa",
    customer_name: "Cliente RPC",
    customer_phone: "",
    customer_email: "",
    source: "WhatsApp",
    service_type: "Pulizia appartamento",
    city: "Potenza",
    address: "",
    urgency: "Media",
    status: "Nuova",
    next_action: "Rispondere al cliente",
    follow_up_at: "2026-08-11T08:00:00.000Z",
    estimated_value: "120",
    raw_message: "Richiesta",
    ai_summary: "",
    ai_suggested_reply: "",
    created_at: "2026-08-10T08:00:00.000Z",
    updated_at: "2026-08-10T08:00:00.000Z"
  };
}

test("repository Supabase normalizza il payload prima della RPC di creazione", async () => {
  let captured;
  const client = {
    rpc: async (name, args) => {
      captured = { name, args };
      return {
        data: {
          lead: leadRow(),
          notes: [{ id: "n1", created_at: "2026-08-10T08:00:00.000Z", note: "Richiesta creata" }]
        },
        error: null
      };
    }
  };

  const repository = createSupabaseLeadRepository(client);
  const lead = await repository.create(leadDraft(), "org-1");

  assert.equal(captured.name, "create_lead_with_initial_note");
  assert.equal(captured.args.p_lead.customer_name, "Cliente RPC");
  assert.equal(captured.args.p_lead.city, "Potenza");
  assert.equal(lead.notes[0].text, "Richiesta creata");
});

test("repository Supabase rifiuta input invalido prima di inviare una RPC", async () => {
  let called = false;
  const client = {
    rpc: async () => {
      called = true;
      return { data: null, error: null };
    }
  };

  const repository = createSupabaseLeadRepository(client);

  await assert.rejects(
    () => repository.create(leadDraft({ source: "TikTok" }), "org-1"),
    /canale/i
  );
  assert.equal(called, false);
});

test("repository account allinea la validazione al vincolo notification minutes", async () => {
  let called = false;
  const client = {
    rpc: async () => {
      called = true;
      return { data: null, error: null };
    }
  };

  const repository = createSupabaseAccountRepository(client);

  await assert.rejects(
    () => repository.updateAccount({
      organizationId: "org-1",
      profile: {
        fullName: "Utente",
        notificationEnabled: true,
        notificationMinutesBefore: -1
      },
      organization: {
        name: "Impresa",
        sector: "Pulizie",
        city: "Potenza",
        phone: "",
        email: "",
        address: ""
      }
    }),
    /0 e 1440/i
  );

  assert.equal(called, false);
});


test("repository account esegue il bootstrap del primo workspace", async () => {
  let captured;
  const client = {
    rpc: async (name, args) => {
      captured = { name, args };
      return {
        data: {
          profile: {
            id: "user-1",
            organization_id: "org-1",
            full_name: "Francesco",
            role: "owner",
            notification_enabled: false,
            notification_minutes_before: 30
          },
          organization: {
            id: "org-1",
            name: "Impresa Cella",
            sector: "Pulizie",
            city: "Potenza",
            phone: "",
            email: "",
            address: ""
          }
        },
        error: null
      };
    }
  };

  const repository = createSupabaseAccountRepository(client);
  const account = await repository.bootstrapAccount({
    fullName: " Francesco ",
    organizationName: " Impresa Cella ",
    sector: " Pulizie ",
    city: " Potenza "
  });

  assert.equal(captured.name, "bootstrap_my_organization");
  assert.equal(captured.args.p_organization_name, "Impresa Cella");
  assert.equal(account.profile.role, "owner");
  assert.equal(account.organization.name, "Impresa Cella");
});

test("repository account distingue onboarding mancante da errore generico", async () => {
  const client = {
    rpc: async () => ({
      data: null,
      error: { code: "P0002", message: "Organization membership not found" }
    })
  };

  const repository = createSupabaseAccountRepository(client);

  await assert.rejects(
    () => repository.getAccount(),
    (error) => error?.code === "ACCOUNT_SETUP_REQUIRED"
  );
});
