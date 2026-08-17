import { expect, test } from "@playwright/test";

const CUSTOMER_MESSAGE = [
  "Ciao, mi chiamo Giulia Bianchi.",
  "Ho bisogno di una pulizia post ristrutturazione per un appartamento vuoto di 80 mq a Roma domani.",
  "È al secondo piano con ascensore e posso inviare foto.",
  "Vorrei un preventivo. Il mio numero è 333 123 4567."
].join(" ");

const NOTE_TEXT = "Cliente richiamato: attende la proposta entro domani.";

async function enterDemo(page) {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Entra in Lindio" })).toBeVisible();

  await page.getByRole("button", { name: "Esplora la demo" }).click();

  await expect(page).toHaveURL(/\/today$/);
  await expect(page.getByText("Demo locale", { exact: true })).toBeVisible();
}

test.describe("critical demo journey", () => {
  test("analyzes, creates and persists an operational request", async ({ page }) => {
    await enterDemo(page);

    await test.step("analyze the customer message through the real UI", async () => {
      await page.goto("/leads/new");
      await expect(page.getByRole("heading", { name: "Registra una richiesta cliente" })).toBeVisible();

      await page.getByLabel("Messaggio / nota").fill(CUSTOMER_MESSAGE);
      await page.getByRole("button", { name: "Analizza messaggio" }).click();

      const analysisDialog = page.getByRole("dialog");
      await expect(analysisDialog.getByRole("heading", { name: "Analisi della richiesta" })).toBeVisible();
      await expect(analysisDialog.getByText("Analisi deterministica locale", { exact: true })).toBeVisible();
      await expect(analysisDialog.getByText("Pulizia post-ristrutturazione", { exact: true })).toBeVisible();
      await expect(analysisDialog.getByText("Roma", { exact: true })).toBeVisible();
      await expect(
        analysisDialog.getByText("La qualità è una valutazione euristica a fasce, non una probabilità statistica.")
      ).toBeVisible();

      await analysisDialog.getByRole("button", { name: "Usa dati nella richiesta" }).click();
    });

    await test.step("review analyzer suggestions before saving", async () => {
      await expect(page.getByLabel("Nome cliente")).toHaveValue("Giulia Bianchi");
      await expect(page.getByRole("textbox", { name: "Telefono", exact: true })).toHaveValue("333 123 4567");
      await expect(page.getByLabel("Servizio richiesto")).toHaveValue("Pulizia post-ristrutturazione");
      await expect(page.getByLabel("Zona / città")).toHaveValue("Roma");
      await expect(page.getByLabel("Urgenza")).toHaveValue("Alta");
      await expect(page.getByLabel("Stato della richiesta")).toHaveValue("Preventivo da preparare");
      await expect(page.getByLabel("Prossima azione")).toHaveValue("Preparare preventivo");
    });

    await test.step("create the request and prove demo persistence after reload", async () => {
      await page.getByRole("button", { name: "Salva richiesta" }).click();

      await expect(page).toHaveURL(/\/leads\/[^/]+$/);
      await expect(page.getByRole("heading", { name: "Giulia Bianchi" })).toBeVisible();
      const leadUrl = page.url();

      await page.reload();

      await expect(page).toHaveURL(leadUrl);
      await expect(page.getByRole("heading", { name: "Giulia Bianchi" })).toBeVisible();
      await expect(page.getByText(CUSTOMER_MESSAGE, { exact: true })).toBeVisible();
    });

    await test.step("persist an operational workflow mutation", async () => {
      const nextAction = page.getByLabel("Prossima azione");
      await nextAction.selectOption("Fare follow-up");
      await expect(nextAction).toBeEnabled();
      await expect(nextAction).toHaveValue("Fare follow-up");
    });

    await test.step("persist a note and verify both changes after reload", async () => {
      await page.getByLabel("Nuova nota").fill(NOTE_TEXT);
      await page.getByRole("button", { name: "Aggiungi nota" }).click();

      await expect(page.getByLabel("Nuova nota")).toHaveValue("");
      await expect(page.getByRole("button", { name: "Aggiungi nota" })).toBeDisabled();
      await expect(page.getByText(NOTE_TEXT, { exact: true })).toBeVisible();

      await page.reload();

      await expect(page.getByLabel("Prossima azione")).toHaveValue("Fare follow-up");
      await expect(page.getByText(NOTE_TEXT, { exact: true })).toBeVisible();
    });
  });

  test("logout closes the demo session and protects private routes", async ({ page }) => {
    await enterDemo(page);

    await page.getByRole("button", { name: "Esci dalla demo" }).click();

    const logoutDialog = page.getByRole("dialog");
    await expect(logoutDialog.getByRole("heading", { name: "Vuoi uscire da Lindio?" })).toBeVisible();
    await logoutDialog.getByRole("button", { name: "Esci", exact: true }).click();

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: "Entra in Lindio" })).toBeVisible();

    await page.goto("/leads");

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: "Entra in Lindio" })).toBeVisible();
  });
});
