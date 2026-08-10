import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const stylesDir = path.join(root, "src", "styles");
const sourcePath = path.join(stylesDir, "components", "base.css");
const componentsIndexPath = path.join(stylesDir, "components.css");

const source = fs.readFileSync(sourcePath, "utf8");

const anchors = {
  forms: ".field",
  buttons: ".button {",
  cards: ".card,\n.analysis-card",
  labels: ".section-label",
  lists: ".activity-list",
  badges: ".badge-line",
  contentBlocks: ".message-box,\n.ai-box",
  infoNotes: ".info-row",
  legacyWidgets: ".report-grid",
  emptyState: ".empty-state",
  utilities: ".form-intake-card"
};

function indexOfAnchor(key) {
  const anchor = anchors[key];
  const index = source.indexOf(anchor);

  if (index === -1) {
    throw new Error(`Anchor non trovato: ${anchor}`);
  }

  return index;
}

function slice(start, end) {
  return source.slice(start, end).trim() + "\n";
}

function writeComponentFile(filename, content) {
  const filePath = path.join(stylesDir, "components", filename);
  fs.writeFileSync(filePath, content, "utf8");
  console.log(`Creato: src/styles/components/${filename}`);
}

const iForms = indexOfAnchor("forms");
const iButtons = indexOfAnchor("buttons");
const iCards = indexOfAnchor("cards");
const iLabels = indexOfAnchor("labels");
const iLists = indexOfAnchor("lists");
const iBadges = indexOfAnchor("badges");
const iContentBlocks = indexOfAnchor("contentBlocks");
const iInfoNotes = indexOfAnchor("infoNotes");
const iLegacyWidgets = indexOfAnchor("legacyWidgets");
const iEmptyState = indexOfAnchor("emptyState");
const iUtilities = indexOfAnchor("utilities");

writeComponentFile(
  "brand.css",
  `/* Brand marks */

${slice(0, iForms)}`
);

writeComponentFile(
  "forms.css",
  `/* Forms */

${slice(iForms, iButtons)}`
);

writeComponentFile(
  "buttons.css",
  `/* Buttons */

${slice(iButtons, iCards)}`
);

writeComponentFile(
  "cards.css",
  `/* Cards and generic statistic cards */

${slice(iCards, iLabels)}`
);

writeComponentFile(
  "labels.css",
  `/* Generic labels */

${slice(iLabels, iLists)}`
);

writeComponentFile(
  "lists.css",
  `/* Generic activity lists and legacy lead rows */

${slice(iLists, iBadges)}`
);

writeComponentFile(
  "badges.css",
  `/* Generic badges */

${slice(iBadges, iContentBlocks)}`
);

writeComponentFile(
  "content-blocks.css",
  `/* Message, AI and analysis blocks */

${slice(iContentBlocks, iInfoNotes)}`
);

writeComponentFile(
  "info-notes.css",
  `/* Info rows and compact notes */

${slice(iInfoNotes, iLegacyWidgets)}`
);

writeComponentFile(
  "legacy-widgets.css",
  `/* Legacy report widgets still used by older components */

${slice(iLegacyWidgets, iEmptyState)}`
);

writeComponentFile(
  "empty-state.css",
  `/* Empty states */

${slice(iEmptyState, iUtilities)}`
);

writeComponentFile(
  "utilities.css",
  `/* Small reusable utilities */

${slice(iUtilities, source.length)}`
);

fs.writeFileSync(
  sourcePath,
  `/*
  Questo file è stato diviso nel Blocco 12C.

  I CSS base ora sono nei file:
  - brand.css
  - forms.css
  - buttons.css
  - cards.css
  - labels.css
  - lists.css
  - badges.css
  - content-blocks.css
  - info-notes.css
  - legacy-widgets.css
  - empty-state.css
  - utilities.css

  Questo file resta vuoto per evitare confusione con vecchi import.
*/
`,
  "utf8"
);

fs.writeFileSync(
  componentsIndexPath,
  `@import "./components/brand.css";
@import "./components/forms.css";
@import "./components/buttons.css";
@import "./components/cards.css";
@import "./components/labels.css";
@import "./components/lists.css";
@import "./components/badges.css";
@import "./components/content-blocks.css";
@import "./components/info-notes.css";
@import "./components/legacy-widgets.css";
@import "./components/empty-state.css";
@import "./components/utilities.css";

@import "./pages/new-lead.css";
@import "./pages/lead-detail.css";
@import "./pages/leads.css";
@import "./pages/today.css";
@import "./pages/report.css";
@import "./pages/settings.css";
@import "./components/polish.css";
@import "./components/feedback.css";
`,
  "utf8"
);

console.log("");
console.log("Split base.css completato.");
console.log("components.css aggiornato con i nuovi import.");