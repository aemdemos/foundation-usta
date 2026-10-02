/* eslint-disable */
var CustomImportScript = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // tools/importer/import-sample-cards-profile-bio.js
  var import_sample_cards_profile_bio_exports = {};
  __export(import_sample_cards_profile_bio_exports, {
    default: () => import_sample_cards_profile_bio_default
  });
  var ORIGIN = "https://www.ustafoundation.com";
  var SOURCE_URL = `${ORIGIN}/en/home/who-we-are/leadership-and-staff.html`;
  var SAMPLE_PATH = "/drafts/block-samples/cards-profile-bio";
  var clean = (text) => (text || "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
  function findPanel(root, title) {
    return [...root.querySelectorAll('[role="tabpanel"]')].find((p) => clean(p.getAttribute("data-title")).toLowerCase() === title.toLowerCase()) || null;
  }
  function spacer(document, desktop, mobile) {
    return WebImporter.Blocks.createBlock(document, {
      name: "Spacer",
      cells: { desktop, mobile }
    });
  }
  function buildBioCards(document, panel) {
    const rows = [["Cards (profile, bio)"]];
    [...panel.querySelectorAll("h4")].forEach((h4) => {
      const col = h4.closest(".full-width");
      const photo = col && col.querySelector("[data-desktop-background-image]");
      if (!photo) return;
      const name = clean(h4.textContent);
      const imageCell = document.createElement("div");
      const img = document.createElement("img");
      img.setAttribute("src", new URL(photo.getAttribute("data-desktop-background-image"), ORIGIN).href);
      img.setAttribute("alt", name);
      imageCell.append(img);
      const bodyCell = document.createElement("div");
      const nameEl = document.createElement("h4");
      nameEl.textContent = name;
      bodyCell.append(nameEl);
      [...h4.parentElement.querySelectorAll(":scope > p")].forEach((p) => {
        const text = clean(p.textContent);
        if (!text) return;
        const out = document.createElement("p");
        if (p.querySelector("b, strong") && clean(p.querySelector("b, strong").textContent) === text) {
          const strong = document.createElement("strong");
          strong.textContent = text;
          out.append(strong);
        } else {
          out.textContent = text;
        }
        bodyCell.append(out);
      });
      rows.push([imageCell, bodyCell]);
    });
    return rows.length > 1 ? WebImporter.DOMUtils.createTable(rows, document) : null;
  }
  var import_sample_cards_profile_bio_default = {
    transform: ({ document, url, params }) => {
      var _a;
      const main = document.querySelector("#mainContent") || document.querySelector("main") || document.body;
      const panel = findPanel(main, "Board of Directors");
      const cards = panel ? buildBioCards(document, panel) : null;
      if (!cards) throw new Error("cards-profile-bio sample: no Board of Directors leader cards found");
      main.textContent = "";
      main.append(spacer(document, "160px", "120px"));
      main.append(document.createElement("hr"));
      const h1 = document.createElement("h1");
      h1.textContent = "Cards (profile, bio)";
      const notes = document.createElement("p");
      notes.textContent = "Leader bio cards: a rounded photo panel above a separate rounded grey text panel with the name, a bold role and a bio paragraph. One card per row on mobile, two from 768. The heading directly above the block renders as the light-blue label bar.";
      const source = document.createElement("p");
      const em = document.createElement("em");
      const a = document.createElement("a");
      a.href = `${SOURCE_URL}#tab=boardofdirectors`;
      a.textContent = a.href;
      em.append("Source: ", a);
      source.append(em);
      main.append(h1, notes, source);
      main.append(document.createElement("hr"));
      main.append(spacer(document, "40px", "24px"));
      main.append(document.createElement("hr"));
      const label = document.createElement("h3");
      label.textContent = clean((_a = panel.querySelector(".cmp-text p")) == null ? void 0 : _a.textContent) || "Board of Directors";
      main.append(label, cards);
      main.append(document.createElement("hr"));
      main.append(spacer(document, "80px", "60px"));
      main.append(document.createElement("hr"));
      main.append(WebImporter.Blocks.createBlock(document, {
        name: "Metadata",
        cells: { Title: "Cards Profile Bio \u2014 Block Sample", Robots: "noindex, nofollow" }
      }));
      WebImporter.rules.adjustImageUrls(main, url, params.originalURL);
      return [{
        element: main,
        path: SAMPLE_PATH,
        report: { title: "Cards Profile Bio \u2014 Block Sample", blocks: ["spacer", "cards-profile-bio", "metadata"] }
      }];
    }
  };
  return __toCommonJS(import_sample_cards_profile_bio_exports);
})();
