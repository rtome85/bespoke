import { describe, expect, it } from "vitest"

import { parsePrep, prepIsEmpty } from "./messages/generateRoundPrep"

describe("interview prep parsing", () => {
  it("extracts JSON from prose and keeps only complete, bounded prep items", () => {
    const parsed = parsePrep(`Model preamble
{
  "logistics": "  Video call  ",
  "likelyTopics": [" TypeScript ", {}, "", "React"],
  "talkingPoints": ["One", "Two"],
  "questionsToAsk": ["Question one?"],
  "gapDefenses": [
    {"gap":"Kubernetes","response":"Used adjacent tooling"},
    {"gap":"Missing answer","response":""}
  ],
  "starStories": [
    {"title":"Migration","situation":"Legacy app","task":"Modernize","action":"Led rewrite","result":"Faster releases","covers":["delivery", 12]},
    {"title":"Label only"}
  ],
  "techQuestions": [
    {"question":"What is a closure?","answer":"A function retaining lexical scope","topic":"JavaScript"},
    {"question":"No answer"}
  ],
  "techExercises": [
    {"title":"Queue","prompt":"Implement a queue","approach":"Use two stacks","topic":"Algorithms"},
    {"title":"No prompt"}
  ]
}
Trailing prose`)

    expect(parsed).toEqual({
      logistics: "Video call",
      likelyTopics: ["TypeScript", "React"],
      talkingPoints: ["One", "Two"],
      questionsToAsk: ["Question one?"],
      gapDefenses: [{ gap: "Kubernetes", response: "Used adjacent tooling" }],
      starStories: [
        {
          title: "Migration",
          situation: "Legacy app",
          task: "Modernize",
          action: "Led rewrite",
          result: "Faster releases",
          covers: ["delivery"]
        }
      ],
      techQuestions: [
        {
          question: "What is a closure?",
          answer: "A function retaining lexical scope",
          topic: "JavaScript"
        }
      ],
      techExercises: [
        {
          title: "Queue",
          prompt: "Implement a queue",
          approach: "Use two stacks",
          topic: "Algorithms"
        }
      ]
    })
  })

  it("returns an empty prep result for missing or malformed JSON", () => {
    expect(parsePrep("plain prose")).toEqual(parsePrep("{bad json}"))
    expect(prepIsEmpty(parsePrep("plain prose"))).toBe(true)
  })

  it("judges emptiness against the requested round type", () => {
    const behavioralOnly = parsePrep(
      JSON.stringify({ talkingPoints: ["Tell a STAR story"] })
    )
    const technicalOnly = parsePrep(
      JSON.stringify({
        techQuestions: [{ question: "Why?", answer: "Because" }]
      })
    )

    expect(prepIsEmpty(behavioralOnly, false)).toBe(false)
    expect(prepIsEmpty(behavioralOnly, true)).toBe(true)
    expect(prepIsEmpty(technicalOnly, true)).toBe(false)
    expect(prepIsEmpty(technicalOnly, false)).toBe(true)
  })
})
