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

  // tools/importer/import-sample-section-split-5-6.js
  var import_sample_section_split_5_6_exports = {};
  __export(import_sample_section_split_5_6_exports, {
    default: () => import_sample_section_split_5_6_default
  });
  var ORIGIN = "https://www.ustafoundation.com";
  var SOURCE_URL = `${ORIGIN}/en/home/get-involved/special-funds/chris-evert-50th-anniversary.html`;
  var SAMPLE_PATH = "/drafts/sections-samples/section-split-5-6";
  var TITLE = "Section \u2014 split-5-6 (sample)";
  var clean = (text) => (text || "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
  function spacer(document, desktop, mobile) {
    return WebImporter.Blocks.createBlock(document, {
      name: "Spacer",
      cells: { desktop, mobile }
    });
  }
  function campaignText(main) {
    const text = [...main.querySelectorAll(".cmp-text")].find((t) => !t.querySelector("blockquote") && [...t.querySelectorAll("p")].filter((p) => clean(p.textContent)).length > 1);
    if (!text) return { text: null, paras: [] };
    const seen = /* @__PURE__ */ new Set();
    const paras = [...text.querySelectorAll("p")].map((p) => clean(p.textContent)).filter((t) => t && !seen.has(t) && seen.add(t));
    return { text, paras };
  }
  function nearbyImage(ref) {
    let n = ref;
    for (let i = 0; i < 6 && n && n.parentElement; i += 1) {
      n = n.parentElement;
      const img = n.querySelector("img");
      if (img) return img;
    }
    return null;
  }
  var import_sample_section_split_5_6_default = {
    transform: ({ document, url, params }) => {
      const main = document.querySelector("#mainContent") || document.querySelector("main") || document.body;
      const heading = [...main.querySelectorAll("h3")].find((h) => clean(h.textContent));
      const { text, paras } = campaignText(main);
      const srcImg = text ? nearbyImage(text) : null;
      if (!heading || !paras.length || !srcImg) {
        throw new Error("section-split-5-6 sample: heading, campaign copy or photo not found");
      }
      const headingText = clean(heading.textContent);
      const imgSrc = new URL(srcImg.getAttribute("src") || srcImg.getAttribute("data-src"), ORIGIN).href;
      const imgAlt = clean(srcImg.getAttribute("alt"));
      main.textContent = "";
      main.append(spacer(document, "120px", "80px"));
      main.append(document.createElement("hr"));
      const h1 = document.createElement("h1");
      h1.textContent = "Section \u2014 split-5-6 (text 5 + image 6 on the 12-column grid)";
      const notes = document.createElement("p");
      notes.textContent = "A section WIDTH style for an uneven text + image Columns row, matching the source's 12-column grid. The section is 328px wide on mobile and 708px on tablet; from 992 it uses the normal page column, the heading spans it, the text cell takes 5 columns and the image cell 6, and the 12th column stays empty. Combine it with center-intro to centre the lead-in heading. On mobile and tablet the text and image stack in authored order.";
      const source = document.createElement("p");
      const em = document.createElement("em");
      const a = document.createElement("a");
      a.href = SOURCE_URL;
      a.textContent = SOURCE_URL;
      em.append("Source: ", a);
      source.append(em);
      main.append(h1, notes, source);
      main.append(document.createElement("hr"));
      main.append(spacer(document, "40px", "24px"));
      main.append(document.createElement("hr"));
      const h3 = document.createElement("h3");
      h3.textContent = headingText;
      const textCell = paras.map((t) => {
        const p = document.createElement("p");
        p.textContent = t;
        return p;
      });
      const img = document.createElement("img");
      img.setAttribute("src", imgSrc);
      img.setAttribute("alt", imgAlt || "Chris Evert");
      main.append(h3, WebImporter.DOMUtils.createTable([["Columns"], [textCell, [img]]], document));
      main.append(WebImporter.Blocks.createBlock(document, {
        name: "Section Metadata",
        cells: { style: "center-intro, split-5-6" }
      }));
      main.append(document.createElement("hr"));
      main.append(spacer(document, "80px", "60px"));
      main.append(document.createElement("hr"));
      main.append(WebImporter.Blocks.createBlock(document, {
        name: "Metadata",
        cells: { Title: TITLE, Robots: "noindex, nofollow" }
      }));
      WebImporter.rules.adjustImageUrls(main, url, params.originalURL);
      return [{
        element: main,
        path: SAMPLE_PATH,
        report: { title: TITLE, blocks: ["spacer", "columns", "section-metadata", "metadata"] }
      }];
    }
  };
  return __toCommonJS(import_sample_section_split_5_6_exports);
})();
