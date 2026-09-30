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

  // tools/importer/import-calendar-v1.js
  var import_calendar_v1_exports = {};
  __export(import_calendar_v1_exports, {
    default: () => import_calendar_v1_default
  });
  var PAGE_TEMPLATE = {
    name: "calendar",
    description: "USTA National Campus events calendar: one calendar block (filters, month grid, day panel, search results).",
    blocks: [{ name: "calendar", instances: [".v-calendar"] }],
    sections: []
  };
  var EVENTS_SOURCE = "/drafts/meet/calendar-events.json";
  var TARGET_PATH = "/drafts/meet/calendar";
  var norm = (s) => (s || "").replace(/ /g, " ").replace(/\s+/g, " ").trim();
  var import_calendar_v1_default = {
    transform: (payload) => {
      const { document } = payload;
      const cal = document.querySelector(".v-calendar");
      const read = (sel, fallback) => {
        var _a;
        return norm((_a = cal == null ? void 0 : cal.querySelector(sel)) == null ? void 0 : _a.textContent) || fallback;
      };
      const alt = (sel, fallback) => {
        var _a;
        return norm((_a = cal == null ? void 0 : cal.querySelector(sel)) == null ? void 0 : _a.getAttribute("alt")) || fallback;
      };
      const rows = [
        ["source", EVENTS_SOURCE],
        ["title", read(".v-calendar__search-title", "Search Events")],
        ["type label", read('label[for="eventType"]', "Select type of event")],
        ["all label", read('#eventType option[value=""]', "All")],
        ["month label", read('label[for="eventMonth"]', "Select month")],
        ["year label", read('label[for="eventYear"]', "Select year")],
        ["search label", read(".v-calendar__button", "Search")],
        ["no events", read(".v-calendar__no-events-message", "There are no events scheduled on this day.")],
        ["legend", read(".v-calendar__tooltip", "USTA National Campus Calendar")],
        ["results title", "Results for '{type} in {month} {year}'"],
        ["register label", "Register"],
        ["event link label", "Register for event"],
        ["calendar view label", alt(".v-calendar__calendar-view-btn", "Calendar view")],
        ["sort label", alt(".v-calendar__sort-events-btn", "Sort events")],
        ["sort date label", read('[data-analytics="calendar-sort-by-date"] + span', "Date")],
        ["sort name label", read('[data-analytics="calendar-sort-by-name"] + span', "Name")],
        ["years", `${(cal == null ? void 0 : cal.querySelectorAll("#eventYear option").length) || 3}`]
      ];
      const main = document.createElement("div");
      main.append(WebImporter.DOMUtils.createTable([["Calendar"], ...rows], document));
      const meta = WebImporter.DOMUtils.createTable([
        ["Metadata"],
        ["Title", norm(document.title) || "Calendar"]
      ], document);
      main.append(meta);
      return [{
        element: main,
        path: TARGET_PATH,
        report: { title: document.title, template: PAGE_TEMPLATE.name, blocks: ["calendar"] }
      }];
    }
  };
  return __toCommonJS(import_calendar_v1_exports);
})();
