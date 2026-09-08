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

  // tools/importer/import-special-funds-v1.js
  var import_special_funds_v1_exports = {};
  __export(import_special_funds_v1_exports, {
    default: () => import_special_funds_v1_default
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

  // tools/importer/import-special-funds-v1.js
  var PAGE_TEMPLATE = {
    name: "general",
    description: "USTA Foundation special-funds page: hero (text-up), three fund columns (alternating image side, one yellow band), and a cards-expand grid.",
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
  function collectText(document, container, {
    headings = "h1,h2,h3,h4,h5,h6",
    maxParas = Infinity,
    skip = []
  } = {}) {
    if (!container) return [];
    const out = [];
    const seen = /* @__PURE__ */ new Set();
    let paraCount = 0;
    const sources = container.querySelectorAll(".cmp-text");
    const roots = sources.length ? [...sources] : [container];
    roots.forEach((src) => {
      src.querySelectorAll(`${headings},p`).forEach((el) => {
        const text = norm(el.textContent);
        if (!text) return;
        if (skip.some((re) => re.test(text))) return;
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
    });
    return out;
  }
  function sectionOfHeading(main, re, tag = "h1,h2,h3,h4") {
    const h = [...main.querySelectorAll(tag)].find((x) => re.test(norm(x.textContent)));
    if (!h) return { heading: null, container: null };
    let c = h;
    for (let i = 0; i < 8 && c.parentElement; i += 1) {
      c = c.parentElement;
      if (c.matches && c.matches(".container.responsivegrid")) break;
    }
    return { heading: h, container: c };
  }
  function nearbyImage(refNode, limit = 8) {
    let n = refNode;
    for (let i = 0; i < limit && n && n.parentElement; i += 1) {
      n = n.parentElement;
      const img = n.querySelector && n.querySelector('img.cmp-image__image, img[src*=".coreimg"], img');
      if (img) return img;
    }
    return null;
  }
  function ctaOf(container) {
    if (!container) return null;
    return [...container.querySelectorAll(".button a[href], a.cmp-button[href], a.button[href]")].map((a) => ({ href: a.getAttribute("href"), text: norm(a.textContent) })).filter((c) => c.text)[0] || null;
  }
  function columnsBlock(document, { textNodes, img, imageSide }) {
    const textCell = textNodes.length ? textNodes : [""];
    const imgCell = img ? [cloneImg(document, img)] : [""];
    const rows = imageSide === "left" ? [["Columns"], [imgCell, textCell]] : [["Columns"], [textCell, imgCell]];
    return WebImporter.DOMUtils.createTable(rows, document);
  }
  function yellowStrip(document) {
    return WebImporter.Blocks.createBlock(document, {
      name: "Spacer",
      cells: { color: "section-yellow-bg", desktop: "30px" }
    });
  }
  var import_special_funds_v1_default = {
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
      const heroContainer = h1 && h1.closest(".container.responsivegrid") || null;
      const heroSubhead = heroContainer ? norm(heroContainer.querySelector(".cmp-text p")?.textContent || "") : "";
      const imgFromUrl = (src, alt) => {
        if (!src) return null;
        const img = document.createElement("img");
        img.setAttribute("src", absUrl(src));
        img.setAttribute("alt", alt || "");
        return img;
      };
      const captureColumns = (re) => {
        const sec = sectionOfHeading(main, re);
        const text = collectText(document, sec.container);
        const img = sec.container && sec.container.querySelector("img") || (sec.heading ? nearbyImage(sec.heading) : null);
        const cta = ctaOf(sec.container);
        return { text, img, cta, sec };
      };
      const tiafoe = captureColumns(/^Frances Tiafoe Fund/);
      const mackie = captureColumns(/^Mackie McDonald College Fund/);
      const evert = captureColumns(/^Jimmy Evert Merit Scholarship Fund/);
      const EX = "/media-da/drafts/block-samples/cards-expand";
      const EXPAND_CARDS = [
        { title: "Judy Levering Leadership Initiative", desc: "The Judy Levering Leadership Initiative (JLLI) funds the local grassroots leadership needed to help developing chapters become established youth development institutions in their community.", form: "JLLI", img: `${EX}/media-9a03a0ad89fd58bd72bfeaf13d53fad596068a5b-9a03a0ad.jpeg`, alt: "Speaker at a podium in front of a Serving Up Dreams backdrop" },
        { title: "Mayor David N. Dinkins Fund", desc: "The David N. Dinkins Fund proudly carries forward his vision, fostering readiness on and off the court through tennis, education, life skills and mentoring. Mayor Dinkins believed in the power of opportunity for all, and this Fund embodies that.", form: "DINKINS", img: `${EX}/media-be96fde0bb8dd0a81987a7ac1152cdff370cc84d-be96fde0.jpeg`, alt: "Group of young people at a USTA program" },
        { title: "Donald Lawson Tisdel Scholarship Fund", desc: "The USTA Foundation named its largest college scholarship fund the Donald Lawson Tisdel College Scholarship Fund. These scholarships will be awarded annually to 20-25 high school seniors.", form: "TISDEL", img: `${EX}/media-a9480b8a3fdd39fe26b4d5bdbc833e7ebf0cb1f7-a9480b8a.jpeg`, alt: "College students in USTA Foundation shirts" },
        { title: "Racquet Sports Professionals Fund", desc: "The RSPA has selected the USTA Foundation as its charity of choice and is teaming up to raise money for grassroots tennis and education programs benefiting under-resourced young people.", form: "RSPA", img: `${EX}/media-d31d1fbb7e09da665d8aec5fe20acca1d456c7f7-d31d1fbb.jpeg`, alt: "Coach with young tennis players on a court" },
        { title: "USTA Middle States Fund", desc: "The USTA Middle States fund benefits tennis and education programs for under-resourced young people throughout the USTA Middle States Section.", form: "MIDDLESTATES", img: `${EX}/media-779d66f2b7e4fbc2590c8f87a77215fbebe7f0f3-779d66f2.jpeg`, alt: "USTA Middle States volunteer with children" }
      ];
      const SF_FORM_BASE = "https://www.ustafoundation.com/en/home/get-involved/special-funds.html";
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
      heroCells.push([heroContentCell]);
      main.append(WebImporter.Blocks.createBlock(document, { name: "Hero (text-up)", cells: heroCells }));
      emittedBlocks.push("hero-text-up");
      const fundSection = (fund, imageSide, { yellow = false } = {}) => {
        const heading = fund.text.find((n) => /^H2$/i.test(n.tagName));
        const bodyParas = fund.text.filter((n) => /^P$/i.test(n.tagName));
        if (heading) main.append(heading);
        const colText = [...bodyParas];
        if (fund.cta) colText.push(ctaParagraph(document, fund.cta.href, fund.cta.text));
        main.append(columnsBlock(document, { textNodes: colText.length ? colText : [""], img: fund.img, imageSide }));
        main.append(WebImporter.Blocks.createBlock(document, {
          name: "Section Metadata",
          cells: { style: yellow ? "section-yellow, center-intro" : "center-intro" }
        }));
      };
      main.append(document.createElement("hr"));
      fundSection(tiafoe, "right");
      emittedBlocks.push("fund(tiafoe,image-right,center-intro)");
      main.append(document.createElement("hr"));
      main.append(yellowStrip(document));
      emittedBlocks.push("spacer(yellow-strip)");
      main.append(document.createElement("hr"));
      fundSection(mackie, "left", { yellow: true });
      emittedBlocks.push("fund(mackie,image-left,yellow)");
      main.append(document.createElement("hr"));
      fundSection(evert, "right");
      emittedBlocks.push("fund(evert,image-right,center-intro)");
      main.append(document.createElement("hr"));
      main.append(WebImporter.Blocks.createBlock(document, {
        name: "Spacer",
        cells: { desktop: "80px", mobile: "48px" }
      }));
      emittedBlocks.push("spacer(above-cards-expand)");
      main.append(document.createElement("hr"));
      {
        const intro = document.createElement("p");
        intro.textContent = "Explore more of the USTA Foundation's special philanthropic funds:";
        main.append(intro);
        const rows = [["Cards (expand)"]];
        EXPAND_CARDS.forEach((c) => {
          const img = imgFromUrl(c.img, c.alt);
          if (c.img.startsWith("/media-da/")) img.setAttribute("src", c.img);
          const title2 = document.createElement("div");
          title2.textContent = c.title;
          const desc = document.createElement("div");
          desc.textContent = c.desc;
          const donate = document.createElement("div");
          const a = document.createElement("a");
          a.href = `${SF_FORM_BASE}?form=${c.form}`;
          a.textContent = "Donate";
          donate.append(a);
          rows.push([[img], [title2], [desc], [donate]]);
        });
        main.append(WebImporter.DOMUtils.createTable(rows, document));
        main.append(WebImporter.Blocks.createBlock(document, {
          name: "Section Metadata",
          cells: { style: "center" }
        }));
        emittedBlocks.push("cards-expand");
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
  return __toCommonJS(import_special_funds_v1_exports);
})();
