import { describe, expect, it } from "vitest"

import { normalizeRoute } from "./router"

describe("normalizeRoute", () => {
  it("normalizes the default route to the applications list", () => {
    expect(normalizeRoute("")).toEqual({
      area: "applications",
      view: "all",
      hash: "#/applications/all"
    })
  })

  it("preserves an allowed application list filter", () => {
    expect(normalizeRoute("#/applications/all/Interviewing")).toEqual({
      area: "applications",
      view: "all",
      param: "Interviewing",
      hash: "#/applications/all/Interviewing"
    })
  })

  it("drops an unknown application list filter", () => {
    expect(normalizeRoute("#/applications/all/unknown")).toEqual({
      area: "applications",
      view: "all",
      param: undefined,
      hash: "#/applications/all"
    })
  })

  it("keeps a prep workspace round identifier in its canonical hash", () => {
    expect(normalizeRoute("#/interviews/prep/rnd%20one")).toEqual({
      area: "interviews",
      view: "prep",
      param: "rnd one",
      hash: "#/interviews/prep/rnd%20one"
    })
  })

  it("falls back to the interview schedule for an unknown interview view", () => {
    expect(normalizeRoute("#/interviews/unknown")).toEqual({
      area: "interviews",
      view: "schedule",
      param: undefined,
      hash: "#/interviews/schedule"
    })
  })
})
