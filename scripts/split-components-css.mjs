import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const stylesDir = path.join(root, "src", "styles");
const sourcePath = path.join(stylesDir, "components.css");

const componentsDir = path.join(stylesDir, "components");
const pagesDir = path.join(stylesDir, "pages");

const source = fs.readFileSync(sourcePath, "utf8");

const markers = {
  newLead: "/* New lead flow */",
  detail: "/* Detail page refinements */",
  leads: "/* Leads page refinements */",
  today: "/* Today page and report refinements */",
  report: "/* Report */",
  settings: "/* Settings page and final polish */",
  polish: "/* General app polish */",
  feedback: "/* Post-Supabase cleanup */"
};

function findMarker(name) {
  const marker = markers[name];
  const index = source.indexOf(marker);

  if (index === -1) {
    throw new Error(`Marker non trovato: ${marker}`);
  }

  return index;
}

function slice(start, end) {
  return source.slice(start, end).trim() + "\n";
}

function writeFile(relativePath, content) {
  const filePath = path.join(stylesDir, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
  console.log(`Creato: src/styles/${relativePath}`);
}

fs.mkdirSync(componentsDir, { recursive: true });
fs.mkdirSync(pagesDir, { recursive: true });

const iNewLead = findMarker("newLead");
const iDetail = findMarker("detail");
const iLeads = findMarker("leads");
const iToday = findMarker("today");
const iReport = findMarker("report");
const iSettings = findMarker("settings");
const iPolish = findMarker("polish");
const iFeedback = findMarker("feedback");

const baseCss = slice(0, iNewLead);
const newLeadCss = slice(iNewLead, iDetail);
const detailCss = slice(iDetail, iLeads);
const leadsCss = slice(iLeads, iToday);
const todayCss = slice(iToday, iReport);
const reportCss = slice(iReport, iSettings);
const settingsCss = slice(iSettings, iPolish);
const polishCss = slice(iPolish, iFeedback);
const feedbackCss = slice(iFeedback, source.length);

writeFile("components/base.css", baseCss);
writeFile("pages/new-lead.css", newLeadCss);
writeFile("pages/lead-detail.css", detailCss);
writeFile("pages/leads.css", leadsCss);
writeFile("pages/today.css", todayCss);
writeFile("pages/report.css", reportCss);
writeFile("pages/settings.css", settingsCss);
writeFile("components/polish.css", polishCss);
writeFile("components/feedback.css", feedbackCss);

const indexCss = `@import "./components/base.css";
@import "./pages/new-lead.css";
@import "./pages/lead-detail.css";
@import "./pages/leads.css";
@import "./pages/today.css";
@import "./pages/report.css";
@import "./pages/settings.css";
@import "./components/polish.css";
@import "./components/feedback.css";
`;

fs.writeFileSync(sourcePath, indexCss, "utf8");

console.log("");
console.log("Split completato.");
console.log("src/styles/components.css ora è un file indice.");