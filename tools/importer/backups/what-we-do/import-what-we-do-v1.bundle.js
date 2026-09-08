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

  // tools/importer/import-what-we-do-v1.js
  var import_what_we_do_v1_exports = {};
  __export(import_what_we_do_v1_exports, {
    default: () => import_what_we_do_v1_default
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

  // tools/importer/import-what-we-do-v1.js
  var PAGE_TEMPLATE = {
    name: "general",
    description: "USTA Foundation what-we-do page: hero (text-up), two cards-content grids, a yellow band (center-intro + image-left columns), and a wide full-width map image.",
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
  function cardsContentBlock(document, cards) {
    const rows = [["Cards (content)"]];
    cards.forEach((c) => {
      const imgCell = c.img ? [cloneImg(document, c.img)] : [""];
      const body = [];
      const h4 = document.createElement("h4");
      h4.textContent = c.title;
      body.push(h4);
      if (c.desc) {
        const p = document.createElement("p");
        p.textContent = c.desc;
        body.push(p);
      }
      rows.push([imgCell, body]);
    });
    return WebImporter.DOMUtils.createTable(rows, document);
  }
  var import_what_we_do_v1_default = {
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
      const heroCtas = heroContainer ? [...heroContainer.querySelectorAll(".button a[href], a.cmp-button[href]")].map((a) => ({
        href: a.getAttribute("href"),
        text: norm(a.textContent)
      })).filter((c) => c.text) : [];
      const imgFromUrl = (src, alt) => {
        if (!src) return null;
        const img = document.createElement("img");
        img.setAttribute("src", absUrl(src));
        img.setAttribute("alt", alt || "");
        return img;
      };
      const collectCards = (defs) => defs.map((def) => ({
        title: def.title,
        desc: def.desc,
        img: imgFromUrl(def.img, def.alt)
      }));
      const captureCardsIntro = (re, introHeadings = "h2") => {
        const sec = sectionOfHeading(main, re);
        const intro = collectText(document, sec.container, { headings: introHeadings, maxParas: 1 });
        return { sec, intro };
      };
      const priorities = captureCardsIntro(/^Our Strategic Priorities/);
      const PRIORITY_CARDS = [
        { title: "Local Program Support", desc: "We support community organizations through strategic guidance, grants, and professional development opportunities.", img: "/content/dam/usta-foundation/what-we-do/capacity-building.jpg", alt: "Two NJTL leaders talking" },
        { title: "Court Refurbishments", desc: "We grow access to tennis by refurbishing courts in under-resourced communities so that young people and their families have places to play.", img: "/content/dam/usta-foundation/what-we-do/court-refurb.jpg", alt: "New refurbished tennis court" },
        { title: "College & Career Pathways", desc: "We offer scholarships to young people who dream of attending college or post-secondary education, and we offer career pathway programs.", img: "/content/dam/usta-foundation/what-we-do/college-scholarships.jpg", alt: "Student writing in a notebook" },
        { title: "High-Performance Pathways", desc: "We offer no- or low-cost high-performance training opportunities for youth who have potential to play collegiate or professional tennis.", img: "/content/dam/usta-foundation/what-we-do/high-performance.jpg", alt: "Teenage tennis player hitting backhand" }
      ];
      const transformSec = sectionOfHeading(main, /^Transforming lives since 1969/);
      const transformAll = collectText(document, transformSec.container);
      const transformImg = transformSec.container ? transformSec.container.querySelector("img") : transformSec.heading ? nearbyImage(transformSec.heading) : null;
      const transformCta = ctaOf(transformSec.container) || { href: "/en/home/our-impact.html", text: "LEARN MORE" };
      const njtlSec = sectionOfHeading(main, /^The NJTL network serves/);
      const njtlHeading = njtlSec.heading ? collectText(document, njtlSec.container, { headings: "h2", maxParas: 0 }).filter((n) => /NJTL network serves/i.test(n.textContent))[0] : null;
      const mapImg = [...main.querySelectorAll("img")].find((im) => /NJTL Chapter Map/i.test(im.getAttribute("alt") || "")) || (njtlSec.container ? njtlSec.container.querySelector("img") : null);
      const sustained = captureCardsIntro(/^Sustained support/);
      const SUSTAINED_CARDS = [
        { title: "Accreditation", desc: "We accredit organizations to become NJTLs. We provide NJTLs unique resources for high-quality education and tennis programming.", img: "/content/dam/usta-foundation/who-we-are/affiliation-thumbnail.jpg", alt: "Coach on the court with students" },
        { title: "Financial Support", desc: "We provide program grants to support NJTLs' direct programming efforts to help these organizations grow and make an impact.", img: "/content/dam/usta-foundation/who-we-are/capacity-building.jpg", alt: "NJTL leadership at the Campus" },
        { title: "Leadership & Vision", desc: "We advise NJTLs on effective organizational development by offering support, training, and best practices for leaders and coaches.", img: "/content/dam/usta-foundation/who-we-are/leadership-vision.jpg", alt: "NJTL leader smiling" },
        { title: "Extended Resources", desc: "We host a number of national resources and data tools available to all NJTLs to strengthen their organizational capacity.", img: "/content/dam/usta-foundation/who-we-are/court-refurb.jpg", alt: "Refurbished tennis courts" }
      ];
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
      priorities.intro.forEach((n) => main.append(n));
      main.append(WebImporter.Blocks.createBlock(document, {
        name: "Section Metadata",
        cells: { style: "center, medium" }
      }));
      emittedBlocks.push("default-content(priorities-intro)");
      main.append(document.createElement("hr"));
      main.append(cardsContentBlock(document, collectCards(PRIORITY_CARDS)));
      emittedBlocks.push("cards-content(priorities)");
      main.append(document.createElement("hr"));
      main.append(yellowStrip(document));
      emittedBlocks.push("spacer(yellow-strip)");
      main.append(document.createElement("hr"));
      {
        const h2 = transformAll.find((n) => /^H2$/i.test(n.tagName));
        const paras = transformAll.filter((n) => /^P$/i.test(n.tagName));
        const h3 = transformAll.find((n) => /^H3$/i.test(n.tagName));
        const introPara = paras[0];
        const bodyParas = paras.slice(1);
        if (h2) main.append(h2);
        if (introPara) main.append(introPara);
        const colText = [];
        if (h3) colText.push(h3);
        bodyParas.forEach((p) => colText.push(p));
        if (transformCta) colText.push(ctaParagraph(document, transformCta.href, transformCta.text));
        main.append(columnsBlock(document, { textNodes: colText.length ? colText : [""], img: transformImg, imageSide: "left" }));
        main.append(WebImporter.Blocks.createBlock(document, {
          name: "Section Metadata",
          cells: { style: "section-yellow, yellow-center-intro" }
        }));
        emittedBlocks.push("columns(transform,image-left,yellow,center-intro)");
      }
      main.append(document.createElement("hr"));
      if (njtlHeading) main.append(njtlHeading);
      if (mapImg) main.append(cloneImg(document, mapImg));
      main.append(WebImporter.Blocks.createBlock(document, {
        name: "Section Metadata",
        cells: { style: "center, map-wide" }
      }));
      emittedBlocks.push("default-content(njtl-map)");
      main.append(document.createElement("hr"));
      sustained.intro.forEach((n) => main.append(n));
      main.append(WebImporter.Blocks.createBlock(document, {
        name: "Section Metadata",
        cells: { style: "center, medium" }
      }));
      emittedBlocks.push("default-content(sustained-intro)");
      main.append(document.createElement("hr"));
      main.append(cardsContentBlock(document, collectCards(SUSTAINED_CARDS)));
      emittedBlocks.push("cards-content(sustained)");
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
  return __toCommonJS(import_what_we_do_v1_exports);
})();
