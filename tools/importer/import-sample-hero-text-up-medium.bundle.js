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

  // tools/importer/import-sample-hero-text-up-medium.js
  var import_sample_hero_text_up_medium_exports = {};
  __export(import_sample_hero_text_up_medium_exports, {
    default: () => import_sample_hero_text_up_medium_default
  });
  var ORIGIN = "https://www.ustafoundation.com";
  var SOURCE_URL = `${ORIGIN}/en/home/get-involved/young-professional-initiative.html`;
  var SAMPLE_PATH = "/drafts/block-samples/hero-text-up-medium";
  var TITLE = "Hero (text-up, medium) \u2014 Block Sample";
  var BG_ALT = "Two USTA Foundation Young Professional Initiative supporters together at an event";
  var clean = (text) => (text || "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
  function backgroundUrl(el, stop) {
    for (let n = el; n && n !== stop; n = n.parentElement) {
      const m = (n.getAttribute("style") || "").match(/background-image\s*:\s*url\((['"]?)([^'")]+)\1\)/i);
      if (m) return m[2];
    }
    return null;
  }
  var import_sample_hero_text_up_medium_default = {
    transform: ({ document, url, params }) => {
      var _a;
      const main = document.querySelector("#mainContent") || document.querySelector("main") || document.body;
      const h1 = main.querySelector("h1");
      const container = h1 && h1.closest(".container.responsivegrid");
      const bg = h1 && backgroundUrl(h1, main);
      const subhead = container && clean((_a = container.querySelector(".cmp-text p")) == null ? void 0 : _a.textContent);
      const cta = container && [...container.querySelectorAll(".button a[href], a.cmp-button[href]")].find((a2) => clean(a2.textContent));
      if (!h1 || !bg || !cta) throw new Error("hero-text-up-medium sample: hero h1, photo or CTA not found");
      main.textContent = "";
      const title = document.createElement("h1");
      title.textContent = "Hero (text-up, medium)";
      const notes = document.createElement("p");
      notes.textContent = "Interior-page hero with a full-bleed background photo and a top-left text panel (white heading, subhead and one blue CTA). Unlike the default text-up hero, the height follows the content plus a fixed band below the button (258px on mobile, 386px from 768), the panel sits on the 12-column grid (1/12 offset, 6/12 wide) and the button is a grid column of that panel (4/6 on mobile, 3/6 on the right half on tablet, 2/6 on desktop). The heading keeps its last two words together, so it stays on 2 lines.";
      const source = document.createElement("p");
      const em = document.createElement("em");
      const a = document.createElement("a");
      a.href = SOURCE_URL;
      a.textContent = SOURCE_URL;
      em.append("Source: ", a);
      source.append(em);
      main.append(title, notes, source);
      main.append(document.createElement("hr"));
      const img = document.createElement("img");
      img.setAttribute("src", new URL(bg, ORIGIN).href);
      img.setAttribute("alt", BG_ALT);
      const heading = document.createElement("h1");
      heading.textContent = clean(h1.textContent);
      const content = [heading];
      if (subhead) {
        const p = document.createElement("p");
        p.textContent = subhead;
        content.push(p);
      }
      const ctaP = document.createElement("p");
      const ctaA = document.createElement("a");
      ctaA.href = cta.getAttribute("href");
      ctaA.textContent = clean(cta.textContent);
      ctaP.append(ctaA);
      content.push(ctaP);
      main.append(WebImporter.DOMUtils.createTable([
        ["Hero (text-up, medium)"],
        [[img]],
        [content]
      ], document));
      main.append(document.createElement("hr"));
      main.append(WebImporter.Blocks.createBlock(document, {
        name: "Metadata",
        cells: { Title: TITLE, Robots: "noindex, nofollow" }
      }));
      WebImporter.rules.adjustImageUrls(main, url, params.originalURL);
      return [{
        element: main,
        path: SAMPLE_PATH,
        report: { title: TITLE, blocks: ["hero-text-up-medium", "metadata"] }
      }];
    }
  };
  return __toCommonJS(import_sample_hero_text_up_medium_exports);
})();
