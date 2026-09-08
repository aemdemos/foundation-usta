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

  // tools/importer/import-general-v1.js
  var import_general_v1_exports = {};
  __export(import_general_v1_exports, {
    default: () => import_general_v1_default
  });

  // tools/importer/transformers/ustafoundation-cleanup.js
  var TransformHook = { beforeTransform: "beforeTransform", afterTransform: "afterTransform" };
  function transform(hookName, element, payload) {
    if (hookName === TransformHook.afterTransform) {
      element.querySelectorAll(".cmp-experiencefragment--header, .cmp-experiencefragment--footer").forEach((cmp) => {
        const wrapper = cmp.closest(".experiencefragment");
        (wrapper || cmp).remove();
      });
      WebImporter.DOMUtils.remove(element, [
        ".header",
        ".top-navigation",
        "nav.navigation-menu",
        ".breadcrumb",
        "#searchAndLocationPanelSwitch"
      ]);
      WebImporter.DOMUtils.remove(element, [
        "#destination_publishing_iframe_usta_0",
        "#XVRCGAHD"
      ]);
      WebImporter.DOMUtils.remove(element, [
        "noscript",
        "link",
        "meta",
        "style"
      ]);
      element.querySelectorAll("a").forEach((a) => {
        const href = (a.getAttribute("href") || "").trim();
        const text = (a.textContent || "").trim();
        if (href === "about:blank" || href.startsWith("about:") || href === "" || href === "#" || text === "_hjSafeContext") {
          const wrapper = a.closest("p");
          if (wrapper && (wrapper.textContent || "").trim() === text) {
            wrapper.remove();
          } else {
            a.remove();
          }
        }
      });
    }
  }

  // tools/importer/import-general-v1.js
  var PAGE_TEMPLATE = {
    name: "general",
    description: "USTA Foundation general interior page: hero banner, centered intro, image+text columns, a full-bleed yellow band (intro + image+text columns), and a 4-up cards-tiles grid.",
    blocks: [],
    sections: []
  };
  var ORIGIN = "https://www.ustafoundation.com";
  function executeCleanup(hookName, element, payload) {
    try {
      transform.call(null, hookName, element, { ...payload, template: PAGE_TEMPLATE });
    } catch (e) {
      console.error(`Cleanup transformer failed at ${hookName}:`, e);
    }
  }
  var norm = (s) => (s || "").replace(/ /g, " ").replace(/\s+/g, " ").trim();
  function absUrl(u) {
    if (!u) return u;
    try {
      return new URL(u, ORIGIN).href;
    } catch {
      return u;
    }
  }
  function ctaParagraph(document, href, text) {
    const p = document.createElement("p");
    const strong = document.createElement("strong");
    const a = document.createElement("a");
    a.href = href;
    a.textContent = text;
    strong.append(a);
    p.append(strong);
    return p;
  }
  function cloneImg(document, srcImg) {
    if (!srcImg) return null;
    const img = document.createElement("img");
    img.setAttribute("src", absUrl(srcImg.getAttribute("src")));
    img.setAttribute("alt", srcImg.getAttribute("alt") || "");
    return img;
  }
  function collectText(document, container, { headings = "h1,h2,h3,h4,h5,h6", maxParas = Infinity } = {}) {
    if (!container) return [];
    const out = [];
    const seen = /* @__PURE__ */ new Set();
    const src = container.querySelector(".cmp-text") || container;
    let paraCount = 0;
    src.querySelectorAll(`${headings},p`).forEach((el) => {
      const text = norm(el.textContent);
      if (!text) return;
      const key = `${el.tagName}:${text}`;
      if (seen.has(key)) return;
      seen.add(key);
      if (/^P$/i.test(el.tagName)) {
        if (paraCount >= maxParas) return;
        paraCount += 1;
      }
      const clone = document.createElement(el.tagName.toLowerCase());
      clone.innerHTML = el.innerHTML;
      out.push(clone);
    });
    return out;
  }
  function sectionOfHeading(main, re, tag = "h1,h2") {
    const h = [...main.querySelectorAll(tag)].find((x) => re.test(norm(x.textContent)));
    if (!h) return { heading: null, container: null };
    let c = h;
    for (let i = 0; i < 6 && c.parentElement; i += 1) {
      c = c.parentElement;
      if (c.matches && c.matches(".container.responsivegrid")) break;
    }
    return { heading: h, container: c };
  }
  function nearbyImage(refNode, limit = 7) {
    let n = refNode;
    for (let i = 0; i < limit && n && n.parentElement; i += 1) {
      n = n.parentElement;
      const img = n.querySelector && n.querySelector("img");
      if (img) return img;
    }
    return null;
  }
  var import_general_v1_default = {
    transform: (payload) => {
      const { document, url, params } = payload;
      const main = document.querySelector("#mainContent") || document.querySelector("main") || document.body;
      const emittedBlocks = [];
      executeCleanup("beforeTransform", main, { url, params });
      executeCleanup("afterTransform", main, { url, params });
      const title = document.title;
      const h1 = main.querySelector("h1");
      const heroH1Text = h1 ? norm(h1.textContent) : "About the USTA Foundation";
      let heroBgEl = h1;
      let heroBgUrl = null;
      while (heroBgEl && heroBgEl !== main) {
        const style = heroBgEl.getAttribute && heroBgEl.getAttribute("style");
        if (style && /background-image\s*:\s*url/i.test(style)) {
          const m = style.match(/background-image\s*:\s*url\((['"]?)([^'")]+)\1\)/i);
          if (m) {
            heroBgUrl = m[2];
            break;
          }
        }
        heroBgEl = heroBgEl.parentElement;
      }
      const heroContainer = h1 && h1.closest(".container.responsivegrid") || null;
      const heroSubhead = heroContainer ? norm(heroContainer.querySelector(".cmp-text p")?.textContent || "") : "";
      const heroCtas = heroContainer ? [...heroContainer.querySelectorAll(".button a[href], a.cmp-button[href]")].map((a) => ({
        href: a.getAttribute("href"),
        text: norm(a.textContent)
      })).filter((c) => c.text) : [];
      const transformSec = sectionOfHeading(main, /^We transform lives/);
      const transformNodes = collectText(document, transformSec.container);
      const historySec = sectionOfHeading(main, /^Our History/);
      const historyText = collectText(document, historySec.container);
      const historyImg = historySec.container && historySec.container.querySelector("img") || (historySec.heading ? nearbyImage(historySec.heading) : null);
      const leadSec = sectionOfHeading(main, /^Our Leadership and Staff/);
      const leadText = collectText(document, leadSec.container, { maxParas: 1 });
      const leadCta = leadSec.container ? [...leadSec.container.querySelectorAll(".button a[href], a.cmp-button[href]")].map((a) => ({
        href: a.getAttribute("href"),
        text: norm(a.textContent)
      })).filter((c) => c.text)[0] : null;
      const evertAttr = [...main.querySelectorAll('h6, [class*="title"]')].find((x) => /Chris Evert/i.test(norm(x.textContent)));
      let evertWrap = evertAttr;
      for (let i = 0; i < 5 && evertWrap && evertWrap.parentElement; i += 1) {
        evertWrap = evertWrap.parentElement;
        if (evertWrap.querySelector && evertWrap.querySelector("img")) break;
      }
      const evertImg = evertWrap && evertWrap.querySelector("img") || (evertAttr ? nearbyImage(evertAttr) : null);
      const evertParas = [];
      const evertSeen = /* @__PURE__ */ new Set();
      if (evertWrap) {
        evertWrap.querySelectorAll("p").forEach((p) => {
          const t = norm(p.textContent);
          if (t.length < 4 || evertSeen.has(t)) return;
          evertSeen.add(t);
          const clone = document.createElement("p");
          clone.innerHTML = p.innerHTML;
          evertParas.push(clone);
        });
      }
      const evertAttrText = evertAttr ? norm(evertAttr.textContent) : "";
      const supSec = sectionOfHeading(main, /^Our Supporters/);
      const supText = collectText(document, supSec.container);
      const supCta = supSec.container ? [...supSec.container.querySelectorAll(".button a[href], a.cmp-button[href]")].map((a) => ({
        href: a.getAttribute("href"),
        text: norm(a.textContent)
      })).filter((c) => c.text)[0] : null;
      const tileHeads = [...main.querySelectorAll("h4")].filter((h) => /INDIVIDUAL DONORS|SIGNATURE EVENTS|CORPORATE|PLANNED GIVING/i.test(norm(h.textContent)));
      const tiles = tileHeads.map((h) => {
        let w = h;
        for (let i = 0; i < 4 && w.parentElement; i += 1) {
          w = w.parentElement;
          if (w.querySelector && w.querySelector("img")) break;
        }
        return { label: norm(h.textContent), img: w ? w.querySelector("img") : null };
      });
      main.textContent = "";
      const heroCells = [];
      if (heroBgUrl) {
        const bg = document.createElement("img");
        bg.setAttribute("src", absUrl(heroBgUrl));
        bg.setAttribute("alt", "");
        heroCells.push([bg]);
      }
      const heroContentCell = [];
      const heroHeading = document.createElement("h1");
      heroHeading.textContent = heroH1Text;
      heroContentCell.push(heroHeading);
      if (heroSubhead) {
        const p = document.createElement("p");
        p.textContent = heroSubhead;
        heroContentCell.push(p);
      }
      heroCtas.forEach((c) => heroContentCell.push(ctaParagraph(document, c.href, c.text)));
      heroCells.push([heroContentCell]);
      main.append(WebImporter.Blocks.createBlock(document, { name: "Hero (text-up)", cells: heroCells }));
      emittedBlocks.push("hero-text-up");
      main.append(document.createElement("hr"));
      transformNodes.forEach((n) => main.append(n));
      main.append(WebImporter.Blocks.createBlock(document, {
        name: "Section Metadata",
        cells: { style: "center, medium" }
      }));
      emittedBlocks.push("default-content(intro)");
      main.append(document.createElement("hr"));
      {
        const textCell = historyText.length ? historyText : [""];
        const imgCell = historyImg ? [cloneImg(document, historyImg)] : [""];
        main.append(WebImporter.DOMUtils.createTable([
          ["Columns"],
          [textCell, imgCell]
        ], document));
        emittedBlocks.push("columns(history,image-right)");
      }
      main.append(document.createElement("hr"));
      leadText.forEach((n) => main.append(n));
      if (leadCta) main.append(ctaParagraph(document, leadCta.href, leadCta.text));
      {
        const evertTextCell = [...evertParas];
        if (evertAttrText) {
          const attr = document.createElement("p");
          const strong = document.createElement("strong");
          const em = document.createElement("em");
          em.textContent = evertAttrText;
          strong.append(em);
          attr.append(strong);
          evertTextCell.push(attr);
        }
        const evertImgCell = evertImg ? [cloneImg(document, evertImg)] : [""];
        main.append(WebImporter.DOMUtils.createTable([
          ["Columns"],
          [evertImgCell, evertTextCell.length ? evertTextCell : [""]]
        ], document));
        emittedBlocks.push("columns(evert,image-left)");
      }
      main.append(WebImporter.Blocks.createBlock(document, {
        name: "Section Metadata",
        cells: { style: "section-yellow, yellow-center-intro" }
      }));
      emittedBlocks.push("section-metadata(yellow-band)");
      main.append(document.createElement("hr"));
      supText.forEach((n) => main.append(n));
      if (supCta) main.append(ctaParagraph(document, supCta.href, supCta.text));
      main.append(WebImporter.Blocks.createBlock(document, {
        name: "Section Metadata",
        cells: { style: "center, wide" }
      }));
      emittedBlocks.push("default-content(supporters)");
      main.append(document.createElement("hr"));
      {
        const rows = [["Cards (tiles)"]];
        tiles.forEach((t) => {
          const imgCell = t.img ? [cloneImg(document, t.img)] : [""];
          const h4 = document.createElement("h4");
          h4.textContent = t.label;
          rows.push([imgCell, [h4]]);
        });
        main.append(WebImporter.DOMUtils.createTable(rows, document));
        emittedBlocks.push("cards-tiles");
      }
      main.append(document.createElement("hr"));
      main.append(WebImporter.Blocks.createBlock(document, {
        name: "Spacer",
        cells: { color: "stats-band-bg", desktop: "17px" }
      }));
      emittedBlocks.push("spacer(trailing-black-band)");
      main.appendChild(document.createElement("hr"));
      WebImporter.rules.createMetadata(main, document);
      const metaTable = [...main.querySelectorAll("table")].find((t) => {
        const first = t.querySelector("th, td");
        return first && /^\s*metadata\s*$/i.test(first.textContent || "");
      });
      const hasRow = (key) => !!metaTable && [...metaTable.querySelectorAll("tr")].some((tr) => (tr.firstElementChild?.textContent || "").trim().toLowerCase() === key.toLowerCase());
      const addMetaRow = (key, value) => {
        if (!metaTable || !value || hasRow(key)) return;
        const tr = document.createElement("tr");
        const k = document.createElement("td");
        k.textContent = key;
        const v = document.createElement("td");
        v.textContent = value;
        tr.append(k, v);
        metaTable.querySelector("tbody")?.append(tr) || metaTable.append(tr);
      };
      addMetaRow("Theme", "general");
      WebImporter.rules.transformBackgroundImages(main, document);
      WebImporter.rules.adjustImageUrls(main, url, params.originalURL);
      const rawPath = new URL(params.originalURL).pathname.replace(/\/$/, "").replace(/\.html?$/, "");
      const path = WebImporter.FileUtils.sanitizePath(rawPath === "" ? "/index" : rawPath);
      return [{
        element: main,
        path,
        report: { title, template: PAGE_TEMPLATE.name, blocks: emittedBlocks }
      }];
    }
  };
  return __toCommonJS(import_general_v1_exports);
})();
