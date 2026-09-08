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

  // tools/importer/import-our-impact-v1.js
  var import_our_impact_v1_exports = {};
  __export(import_our_impact_v1_exports, {
    default: () => import_our_impact_v1_default
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

  // tools/importer/import-our-impact-v1.js
  var PAGE_TEMPLATE = {
    name: "general",
    description: "USTA Foundation our-impact page: hero (banner), stat-list columns, a banner-stats-grid, and a cards-stats grid, with two full-bleed yellow bands.",
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
  var import_our_impact_v1_default = {
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
      const heroCta = ctaOf(heroContainer);
      const imgFromUrl = (src, alt) => {
        if (!src) return null;
        const img = document.createElement("img");
        img.setAttribute("src", absUrl(src));
        img.setAttribute("alt", alt || "");
        return img;
      };
      const statList = (items) => {
        const out = [];
        items.forEach((it) => {
          const h3 = document.createElement("h3");
          h3.textContent = it.stat;
          out.push(h3);
          const p = document.createElement("p");
          p.textContent = it.caption;
          out.push(p);
        });
        return out;
      };
      const labelList = (items) => {
        const out = [];
        items.forEach((it) => {
          const lp = document.createElement("p");
          const strong = document.createElement("strong");
          strong.textContent = it.stat;
          lp.append(strong);
          out.push(lp);
          const p = document.createElement("p");
          p.textContent = it.caption;
          out.push(p);
        });
        return out;
      };
      const notReadySec = sectionOfHeading(main, /^Young people aren/);
      const notReadyIntro = collectText(document, notReadySec.container, { headings: "h2", maxParas: 1 }).filter((n) => /Young people aren|Young people—particularly/i.test(n.textContent));
      const NOT_READY_STATS = [
        { stat: "Less than 3 years", caption: "How long the average U.S. child plays a sport" },
        { stat: "Only 15% of 12-17 year olds", caption: "Meet the physical activity recommendation of 60 minutes daily" },
        { stat: "Two-thirds of students nationally", caption: "Demonstrate a deficiency in math and reading" },
        { stat: "Nearly 20% of children", caption: "in the U.S. are overweight or obese" }
      ];
      const notReadyImg = imgFromUrl("/content/dam/usta-foundation/our-impact/our-impact-insert.png", "USTAF students in the classroom");
      const reachSec = sectionOfHeading(main, /^We reach communities/);
      const reachIntro = collectText(document, reachSec.container, { headings: "h2", maxParas: 2 }).filter((n) => /We reach communities|The USTA Foundation invests|While each local organization is unique, they share the same goals/i.test(n.textContent));
      const REACH_ITEMS = [
        { stat: "Nationwide", caption: "270+ community-based organizations in under-resourced communities across the U.S." },
        { stat: "Community-led", caption: "Every organization is a grassroots entity empowered to cater to the diverse needs of their community." },
        { stat: "Trusted access", caption: "Well-known organizations that are immersed in their communities enable us to provide support where it is most needed." }
      ];
      const reachImg = imgFromUrl("/content/dam/usta-foundation/our-impact/norwalk-njtl.jpg", "Coach teaching at the Norwalk chapter.");
      const diffSec = sectionOfHeading(main, /^We make a difference/);
      const diffIntro = collectText(document, diffSec.container, { headings: "h2", maxParas: 2 }).filter((n) => /We make a difference|The USTA Foundation keeps score|Our organizations don|The numbers speak to it/i.test(n.textContent));
      const STAT_CARDS = [
        { stat: "97%", caption: "advance on-time for their grade level (K-12)", img: "/content/dam/usta-foundation/our-impact/our-impact-1.png", alt: "Students sitting and laughing" },
        { stat: "98%", caption: "graduate from high school on time", img: "/content/dam/usta-foundation/our-impact/graduation.png", alt: "USTAF students talking" },
        { stat: "85%", caption: "of high-school seniors enter post-secondary education", img: "/content/dam/usta-foundation/our-impact/high-school.png", alt: "USTAF students sitting in a classroom" },
        { stat: "95%", caption: "report strengthened social-emotional learning skills", img: "/content/dam/usta-foundation/our-impact/sel-skills.png", alt: "USTAF tennis players high-fiving" }
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
      if (heroCta) heroContentCell.push(ctaParagraph(document, heroCta.href, heroCta.text));
      heroCells.push([heroContentCell]);
      main.append(WebImporter.Blocks.createBlock(document, { name: "Hero (banner)", cells: heroCells }));
      emittedBlocks.push("hero-banner");
      main.append(document.createElement("hr"));
      notReadyIntro.forEach((n) => main.append(n));
      main.append(WebImporter.Blocks.createBlock(document, {
        name: "Section Metadata",
        cells: { style: "center, wide" }
      }));
      emittedBlocks.push("default-content(not-ready-intro)");
      main.append(document.createElement("hr"));
      main.append(columnsBlock(document, { textNodes: statList(NOT_READY_STATS), img: notReadyImg, imageSide: "right" }));
      emittedBlocks.push("columns(not-ready-stats,image-right)");
      main.append(document.createElement("hr"));
      main.append(yellowStrip(document));
      emittedBlocks.push("spacer(yellow-strip)");
      main.append(document.createElement("hr"));
      {
        const heading = reachIntro.find((n) => /^H2$/i.test(n.tagName));
        const paras = reachIntro.filter((n) => /^P$/i.test(n.tagName));
        if (heading) main.append(heading);
        paras.forEach((p) => main.append(p));
        main.append(columnsBlock(document, { textNodes: labelList(REACH_ITEMS), img: reachImg, imageSide: "left" }));
        main.append(WebImporter.Blocks.createBlock(document, {
          name: "Section Metadata",
          cells: { style: "section-yellow, yellow-center-intro" }
        }));
        emittedBlocks.push("columns(reach,image-left,yellow,center-intro)");
      }
      main.append(document.createElement("hr"));
      {
        const rows = [["Banner Stats Grid"]];
        const h2 = document.createElement("h2");
        h2.textContent = "Our impact is felt by those who need it the most.";
        rows.push([[h2]]);
        const featured = document.createElement("h1");
        featured.textContent = "233,000+ young people served";
        rows.push([[featured]]);
        [
          ["74%", "come from families of need"],
          ["79%", "identify as young people of color"],
          ["270+", "organizations nationwide"],
          ["67,000+", "coaches, mentors & volunteers"]
        ].forEach(([stat, label]) => rows.push([stat, label]));
        main.append(WebImporter.DOMUtils.createTable(rows, document));
        emittedBlocks.push("banner-stats-grid");
      }
      main.append(document.createElement("hr"));
      main.append(yellowStrip(document));
      emittedBlocks.push("spacer(yellow-strip)");
      main.append(document.createElement("hr"));
      diffIntro.forEach((n) => main.append(n));
      {
        const rows = [["Cards (stats)"]];
        STAT_CARDS.forEach((c) => {
          const imgCell = [imgFromUrl(c.img, c.alt)];
          const h3 = document.createElement("h3");
          h3.textContent = c.stat;
          const h4 = document.createElement("h4");
          h4.textContent = c.caption;
          rows.push([imgCell, [h3], [h4]]);
        });
        main.append(WebImporter.DOMUtils.createTable(rows, document));
        main.append(WebImporter.Blocks.createBlock(document, {
          // `center` centers the leading default content (the "We make a difference"
          // intro + "The numbers speak to it." heading), matching the source; the
          // cards-stats block carries its own centered grid so it's unaffected.
          name: "Section Metadata",
          cells: { style: "section-yellow, center" }
        }));
        emittedBlocks.push("cards-stats(yellow,center)");
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
  return __toCommonJS(import_our_impact_v1_exports);
})();
