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

  // tools/importer/import-college-scholarships-v1.js
  var import_college_scholarships_v1_exports = {};
  __export(import_college_scholarships_v1_exports, {
    default: () => import_college_scholarships_v1_default
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

  // tools/importer/import-college-scholarships-v1.js
  var PAGE_TEMPLATE = {
    name: "general",
    description: "USTA Foundation college-scholarships page: hero (text-up), a 3-up cards-content grid, and three scholarship detail sections (center-intro + 4-up Q&A cards-content), two on yellow bands.",
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
  function yellowStrip(document) {
    return WebImporter.Blocks.createBlock(document, {
      name: "Spacer",
      cells: { color: "section-yellow-bg", desktop: "30px" }
    });
  }
  function imgFromUrl(document, src, alt) {
    if (!src) return null;
    const img = document.createElement("img");
    img.setAttribute("src", absUrl(src));
    img.setAttribute("alt", alt || "");
    return img;
  }
  function cardsContentBlock(document, cards) {
    const rows = [["Cards (content)"]];
    cards.forEach((c) => {
      const body = [];
      const h4 = document.createElement("h4");
      h4.textContent = c.title;
      body.push(h4);
      if (c.desc) {
        const p = document.createElement("p");
        p.textContent = c.desc;
        body.push(p);
      }
      if (c.img) rows.push([[imgFromUrl(document, c.img, c.alt)], body]);
      else rows.push([body]);
    });
    return WebImporter.DOMUtils.createTable(rows, document);
  }
  var import_college_scholarships_v1_default = {
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
      const captureIntro = (re, maxParas = 1) => {
        const sec = sectionOfHeading(main, re);
        return collectText(document, sec.container, { headings: "h2", maxParas });
      };
      const openingIntro = captureIntro(/^Opening doors of opportunity/, 2);
      const SCHOLARSHIP_CARDS = [
        { title: "College Launch Scholarship", desc: "This scholarship is for high school seniors preparing to enroll in college for the first time.", img: "/content/dam/usta-foundation/what-we-do/scholarship-thumbnail-3.jpg", alt: "College Bootcamp students" },
        { title: "College Success Scholarship", desc: "This scholarship is for students already enrolled in college, took a gap year, or are returning to school after time away.", img: "/content/dam/usta-foundation/what-we-do/scholarship-thumbnail-2.jpg", alt: "Scholarship Bootcamp students" },
        { title: "Novo Nordisk Donnelly Scholarship", desc: "This scholarship is for student-athletes who play tennis and are impacted by diabetes.", img: "/content/dam/usta-foundation/what-we-do/donnelly-scholarship-thumb.jpg", alt: "Donnelly scholarship recipient" }
      ];
      const DETAILS = [
        {
          heading: "College Launch Scholarship",
          lead: "This scholarship is for high school seniors preparing to enroll in college for the first time.",
          yellow: true,
          qa: [
            { title: "What is it?", desc: "This award is for high-school seniors preparing to enter college or university for the first time, and who participated in one of our chapters.", img: "/content/dam/usta-foundation/what-we-do/scholarship-thumbnail-7.jpg", alt: "Scholarship Bootcamp Students" },
            { title: "What is awarded?", desc: "Generous donors make this program possible through various named awards that are given based off a student's financial need and merit.", img: "/content/dam/usta-foundation/what-we-do/scholarship-thumbnail-5.jpg", alt: "Scholarship Bootcamp Students" },
            { title: "How many are available?", desc: "While students apply through a single process, the selection committee will determine the best fit for each recipient from these named scholarships.", img: "/content/dam/usta-foundation/what-we-do/scholarship-thumbnail-6.jpg", alt: "Scholarship Bootcamp Students" },
            { title: "For how long is it paid?", desc: "All awards are multi-year scholarships, will be distributed evenly over four years, and will be paid directly to the student\u2019s college or university of choice.", img: "/content/dam/usta-foundation/what-we-do/scholarship-thumbnail-8.jpg", alt: "Scholarship Bootcamp Students" }
          ]
        },
        {
          heading: "College Success Scholarship",
          lead: "This scholarship is for students already enrolled in college, those who took a gap year, or those returning to school after time away.",
          yellow: false,
          qa: [
            { title: "What is it?", desc: "This award supports those not previously part of our scholarship program who are committed to finishing degrees.", img: "/content/dam/usta-foundation/what-we-do/scholarship-thumnbnail-1.jpg", alt: "Scholarship Bootcamp Students" },
            { title: "What is awarded?", desc: "Awards are multi-year, with the number of years determined by the number of years a student has remaining until graduation.", img: "/content/dam/usta-foundation/what-we-do/scholarship-thumnbnail-2.jpg", alt: "Scholarship Bootcamp Students" },
            { title: "Who is eligible?", desc: "Alumni of our chapters or other tennis programs, or those with a connection to a chapter from volunteering or employment.", img: "/content/dam/usta-foundation/what-we-do/scholarship-thumnbnail-3.jpg", alt: "Scholarship Bootcamp Students" },
            { title: "What else to know?", desc: "Priority in applications is given to NJTL alumni first, but all eligible young people may apply for this award.", img: "/content/dam/usta-foundation/what-we-do/scholarship-thumnbnail-4.jpg", alt: "NJTL scholarship winner playing tennis" }
          ]
        },
        {
          heading: "Novo Nordisk Donnelly Scholarship",
          lead: "This award is generously supported by the Donnelly family, Novo Nordisk, Dexcom, Cecilia Health and Tandem Diabetes Care, Inc.",
          yellow: true,
          qa: [
            { title: "What is it?", desc: "This scholarship is for student-athletes who play tennis and are impacted by diabetes.", img: "/content/dam/usta-foundation/what-we-do/donnelly-scholarship-2.jpg", alt: "Donnelly scholarship winners" },
            { title: "What is awarded?", desc: "Two national awards of $15,000 each and 10 regional awards of $7,000 each.", img: "/content/dam/usta-foundation/what-we-do/donnelly-scholarship-1.jpg", alt: "Donnelly scholarship winners" },
            { title: "How do I apply?", desc: "Students complete a separate application to detail their tennis journey with diabetes.", img: "/content/dam/usta-foundation/what-we-do/donnelly-scholarship-3.jpg", alt: "Billie Jean King and Donnelly scholarship winner" },
            { title: "For how long is it paid?", desc: "All awards are one-year only and paid directly to a student's college or university.", img: "/content/dam/usta-foundation/what-we-do/donnelly-scholarship-4.jpg", alt: "Donnelly scholarship winners" }
          ]
        }
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
      main.append(WebImporter.Blocks.createBlock(document, { name: "Hero (text-up)", cells: heroCells }));
      emittedBlocks.push("hero-text-up");
      main.append(document.createElement("hr"));
      openingIntro.forEach((n) => main.append(n));
      main.append(WebImporter.Blocks.createBlock(document, {
        name: "Section Metadata",
        cells: { style: "center, medium" }
      }));
      emittedBlocks.push("default-content(opening-intro)");
      main.append(document.createElement("hr"));
      main.append(cardsContentBlock(document, SCHOLARSHIP_CARDS));
      emittedBlocks.push("cards-content(scholarships)");
      DETAILS.forEach((det) => {
        main.append(document.createElement("hr"));
        if (det.yellow) {
          main.append(yellowStrip(document));
          emittedBlocks.push("spacer(yellow-strip)");
          main.append(document.createElement("hr"));
        }
        const h2 = document.createElement("h2");
        h2.textContent = det.heading;
        main.append(h2);
        const lead = document.createElement("p");
        lead.textContent = det.lead;
        main.append(lead);
        main.append(cardsContentBlock(document, det.qa));
        main.append(WebImporter.Blocks.createBlock(document, {
          name: "Section Metadata",
          cells: { style: det.yellow ? "section-yellow, center-intro" : "center-intro" }
        }));
        emittedBlocks.push(`detail(${det.heading.slice(0, 12)},${det.yellow ? "yellow" : "white"})`);
      });
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
  return __toCommonJS(import_college_scholarships_v1_exports);
})();
