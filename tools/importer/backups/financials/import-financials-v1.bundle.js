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

  // tools/importer/import-financials-v1.js
  var import_financials_v1_exports = {};
  __export(import_financials_v1_exports, {
    default: () => import_financials_v1_default
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

  // tools/importer/import-financials-v1.js
  var PAGE_TEMPLATE = {
    name: "general",
    description: "USTA Foundation financials page: all default content \u2014 H1 + three H2 sections of bulleted PDF download links.",
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
  function absUrl(u) {
    if (!u) return u;
    try {
      return new URL(u, ORIGIN).href;
    } catch {
      return u;
    }
  }
  var H1_TEXT = "Annual Reports and Financial Information";
  var GROUPS = [
    {
      heading: "Annual Reports",
      links: [
        ["2024 Annual Report", "/content/dam/usta-foundation/pdfs/2024-ustaf-annual-report.pdf"],
        ["2023 Annual Report", "/content/dam/usta-foundation/who-we-are/financials/annual-reports/2023.pdf"],
        ["2022 Annual Report", "/content/dam/usta-foundation/who-we-are/financials/annual-reports/2022.pdf"],
        ["2021 Annual Report", "/content/dam/usta-foundation/who-we-are/financials/annual-reports/2021.pdf"],
        ["2020 Annual Report", "/content/dam/usta-foundation/who-we-are/financials/annual-reports/2020.pdf"],
        ["2019 Annual Report", "/content/dam/usta-foundation/who-we-are/financials/annual-reports/2019.pdf"],
        ["2017-2018 Annual Report", "/content/dam/usta-foundation/who-we-are/financials/annual-reports/2017-2018.pdf"],
        ["2016 Annual Report", "/content/dam/usta-foundation/who-we-are/financials/annual-reports/2016.pdf"],
        ["2015 Annual Report", "/content/dam/usta-foundation/who-we-are/financials/annual-reports/2015.pdf"],
        ["2014 Annual Report", "/content/dam/usta-foundation/who-we-are/financials/annual-reports/2014.pdf"],
        ["2013 Annual Report", "/content/dam/usta-foundation/who-we-are/financials/annual-reports/2013.pdf"],
        ["2011 - 2012 Annual Report", "/content/dam/usta-foundation/who-we-are/financials/annual-reports/2011-2012.pdf"],
        ["2010 Annual Report", "/content/dam/usta-foundation/who-we-are/financials/annual-reports/2010.pdf"]
      ]
    },
    {
      heading: "Audited Financial Statements",
      intro: "Click below to view or download financial statements of USTA Foundation Incorporated.",
      links: [
        ["2025 Audited Financials", "/content/dam/usta-foundation/who-we-are/financials/audited-financial-statements/2025.pdf"],
        ["2024 Audited Financials", "/content/dam/usta-foundation/who-we-are/financials/audited-financial-statements/2024.pdf"],
        ["2023 Audited Financials", "/content/dam/usta-foundation/who-we-are/financials/audited-financial-statements/2023.pdf"],
        ["2022 Audited Financials", "/content/dam/usta-foundation/who-we-are/financials/audited-financial-statements/2022.pdf"]
      ]
    },
    {
      heading: "IRS Form 990",
      intro: "Click below to view or download USTA Foundation Incorporated's 990 forms.",
      links: [
        ["2024 - 990", "/content/dam/usta-foundation/who-we-are/financials/irs-990/2024.pdf"],
        ["2023 - 990", "/content/dam/usta-foundation/who-we-are/financials/irs-990/2023.pdf"],
        ["2022 - 990", "/content/dam/usta-foundation/who-we-are/financials/irs-990/2022.pdf"]
      ]
    }
  ];
  var import_financials_v1_default = {
    transform: (payload) => {
      const { document, url, params } = payload;
      const main = document.querySelector("#mainContent") || document.querySelector("main") || document.body;
      const emittedBlocks = [];
      executeCleanup("beforeTransform", main, { url, params });
      executeCleanup("afterTransform", main, { url, params });
      const title = document.title;
      main.textContent = "";
      const h1 = document.createElement("h1");
      h1.textContent = H1_TEXT;
      main.append(h1);
      GROUPS.forEach((g) => {
        const h2 = document.createElement("h2");
        h2.textContent = g.heading;
        main.append(h2);
        if (g.intro) {
          const p = document.createElement("p");
          p.textContent = g.intro;
          main.append(p);
        }
        const ul = document.createElement("ul");
        g.links.forEach(([text, href]) => {
          const li = document.createElement("li");
          const a = document.createElement("a");
          a.href = absUrl(href);
          a.textContent = text;
          li.append(a);
          ul.append(li);
        });
        main.append(ul);
      });
      emittedBlocks.push("default-content(financials)");
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
      const rawPath = new URL(params.originalURL).pathname.replace(/\/$/, "").replace(/\.html?$/, "");
      const path = WebImporter.FileUtils.sanitizePath(rawPath === "" ? "/index" : rawPath);
      return [{
        element: main,
        path,
        report: { title, template: PAGE_TEMPLATE.name, blocks: emittedBlocks }
      }];
    }
  };
  return __toCommonJS(import_financials_v1_exports);
})();
