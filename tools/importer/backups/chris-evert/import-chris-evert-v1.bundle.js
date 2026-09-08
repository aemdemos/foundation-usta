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

  // tools/importer/import-chris-evert-v1.js
  var import_chris_evert_v1_exports = {};
  __export(import_chris_evert_v1_exports, {
    default: () => import_chris_evert_v1_default
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

  // tools/importer/import-chris-evert-v1.js
  var PAGE_TEMPLATE = {
    name: "general",
    description: "USTA Foundation Chris Evert 50th anniversary campaign: centered heading, image+text columns, and a split-even quote + donation form.",
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
  var norm = (s) => (s || "").replace(/ /g, " ").replace(/\s+/g, " ").trim();
  function absUrl(u) {
    if (!u) return u;
    try {
      return new URL(u, ORIGIN).href;
    } catch {
      return u;
    }
  }
  function cloneImg(document, srcImg) {
    if (!srcImg) return null;
    const img = document.createElement("img");
    img.setAttribute("src", absUrl(srcImg.getAttribute("src")));
    img.setAttribute("alt", srcImg.getAttribute("alt") || "");
    return img;
  }
  function columnsBlock(document, { textNodes, img, imageSide }) {
    const textCell = textNodes.length ? textNodes : [""];
    const imgCell = img ? [cloneImg(document, img)] : [""];
    const rows = imageSide === "left" ? [["Columns"], [imgCell, textCell]] : [["Columns"], [textCell, imgCell]];
    return WebImporter.DOMUtils.createTable(rows, document);
  }
  var import_chris_evert_v1_default = {
    transform: (payload) => {
      const { document, url, params } = payload;
      const main = document.querySelector("#mainContent") || document.querySelector("main") || document.body;
      const emittedBlocks = [];
      executeCleanup("beforeTransform", main, { url, params });
      executeCleanup("afterTransform", main, { url, params });
      const title = document.title;
      const h1 = main.querySelector("h1");
      const heroH1Text = h1 ? norm(h1.textContent) : "Help us get young people ready for life.";
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
      const HEADING = "Celebrating a champion, on and off the court.";
      const COLUMNS_PARAS = [
        "Join in celebrating the 50th anniversary of Chris Evert\u2019s first US Open title by championing the next generation!",
        "Make a $50 gift to support our Jimmy Evert Merit Scholarship Fund to help young people from under-resourced communities receive the training and academic support they need to prepare for life on and off the court.",
        "The Jimmy Evert Merit Scholarship Fund, named after Chris' father, supports academic and college readiness programs, and advanced tennis training through clinics, private lessons and camps for young people from our chapters, primarily high-performance Excellence Program participants, who have the potential to play collegiate tennis, across the country. This training prepares young people to be champions in all aspects of their lives."
      ];
      const COLUMN_IMG = "/content/dam/usta-foundation/get-involved/20250820-chrissie50.jpg";
      const COLUMN_IMG_ALT = "Chris Evert";
      const QUOTE_PARAS = [
        "\u201CThe coaches and players at the Evert Academy pushed me to become the best tennis player and person I could be.",
        '"The Jimmy Evert Scholarship really helped make it possible for me to excel in my first year competing in college.\u201D'
      ];
      const QUOTE_ATTR = "- Selah Stibbins, Howard University '26";
      const DONATE_FORM = {
        title: "Celebrating a Champion!",
        amounts: "50 | 50 | 50 | 50 | 50 | 50",
        designate: "Designate to the Jimmy Evert Merit Scholarship Fund",
        cta: "Donate and Support",
        href: "https://ustaf.donorsupport.co/page/CHRIS50?elementTitle=Donation%20Form&elementName=Chris%2050%20Donation%20Embed"
      };
      const p = (text) => {
        const el = document.createElement("p");
        el.textContent = text;
        return el;
      };
      const cell = (text) => {
        const d = document.createElement("div");
        d.textContent = text;
        return d;
      };
      main.textContent = "";
      const h = document.createElement("h1");
      h.textContent = HEADING;
      main.append(h);
      main.append(WebImporter.Blocks.createBlock(document, {
        name: "Section Metadata",
        cells: { style: "center" }
      }));
      emittedBlocks.push("default-content(heading,center)");
      main.append(document.createElement("hr"));
      {
        const img = document.createElement("img");
        img.setAttribute("src", absUrl(COLUMN_IMG));
        img.setAttribute("alt", COLUMN_IMG_ALT);
        main.append(columnsBlock(document, { textNodes: COLUMNS_PARAS.map(p), img, imageSide: "right" }));
        emittedBlocks.push("columns(campaign,image-right)");
      }
      main.append(document.createElement("hr"));
      {
        const quoteBody = QUOTE_PARAS.map(p);
        const quoteAttr = [p(QUOTE_ATTR)];
        main.append(WebImporter.DOMUtils.createTable([
          ["Quote"],
          [quoteBody],
          [quoteAttr]
        ], document));
        const a = document.createElement("a");
        a.href = DONATE_FORM.href;
        a.textContent = DONATE_FORM.href;
        const linkCell = document.createElement("div");
        linkCell.append(a);
        main.append(WebImporter.DOMUtils.createTable([
          ["Custom Form Donate"],
          [cell(DONATE_FORM.title)],
          [cell(DONATE_FORM.amounts)],
          [cell(DONATE_FORM.designate)],
          [cell(DONATE_FORM.cta)],
          [linkCell]
        ], document));
        main.append(WebImporter.Blocks.createBlock(document, {
          name: "Section Metadata",
          cells: { style: "split-even" }
        }));
        emittedBlocks.push("split-even(quote+donate)");
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
      main.querySelectorAll('img[src*="/media-da/"]').forEach((img) => {
        const src = img.getAttribute("src") || "";
        const idx = src.indexOf("/media-da/");
        if (idx > 0) img.setAttribute("src", src.slice(idx));
      });
      const rawPath = new URL(params.originalURL).pathname.replace(/\/$/, "").replace(/\.html?$/, "");
      const path = WebImporter.FileUtils.sanitizePath(rawPath === "" ? "/index" : rawPath);
      return [{
        element: main,
        path,
        report: { title, template: PAGE_TEMPLATE.name, blocks: emittedBlocks }
      }];
    }
  };
  return __toCommonJS(import_chris_evert_v1_exports);
})();
