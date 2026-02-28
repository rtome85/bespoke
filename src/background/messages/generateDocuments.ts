import type { PlasmoMessaging } from "@plasmohq/messaging"

import { OllamaClient } from "~api/ollamaClient"
import { STORAGE_KEYS } from "~storage/keys"
import { DEFAULT_PROMPTS } from "~types/config"
import { type UserProfile } from "~types/userProfile"
import {
  formatMarkdownContent,
  generateFilename
} from "~utils/documentFormatter"

const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  const { companyName, jobTitle, model, userProfile } = req.body

  try {
    const storage = await new Promise<any>((resolve) => {
      chrome.storage.local.get(
        [
          STORAGE_KEYS.OLLAMA_CONFIG,
          STORAGE_KEYS.CUSTOM_PROMPTS,
          STORAGE_KEYS.LAST_SELECTED_MODEL,
          STORAGE_KEYS.PENDING_JOB_DATA
        ],
        resolve
      )
    })

    const ollamaConfig = storage[STORAGE_KEYS.OLLAMA_CONFIG]
    const customPrompts =
      storage[STORAGE_KEYS.CUSTOM_PROMPTS] || DEFAULT_PROMPTS
    const jobData = storage[STORAGE_KEYS.PENDING_JOB_DATA]
    const selectedModel =
      model || storage[STORAGE_KEYS.LAST_SELECTED_MODEL] || "gpt-oss:20b-cloud"

    if (!ollamaConfig?.apiKey) {
      res.send({
        success: false,
        message: "Ollama API key not configured. Please set it in Settings."
      })
      return
    }

    if (!jobData?.selectedText) {
      res.send({
        success: false,
        message:
          "No job description found. Right-click on a job posting and select 'Generate CV for this job'."
      })
      return
    }

    const client = new OllamaClient(ollamaConfig)
    const generatedAt = new Date()

    const generateRequest = {
      jobDescription: jobData.selectedText,
      companyName,
      jobTitle,
      model: selectedModel,
      prompts: customPrompts,
      userProfile: userProfile as UserProfile
    }

    const analyzeMatchInline = async () => {
      const fallback = {
        percentage: 0,
        summary: "Match analysis unavailable.",
        strengths: [] as string[],
        weaknesses: [] as string[],
        improvements: [] as string[]
      }
      try {
        const profileLines: string[] = []
        if (userProfile?.skills?.length)
          profileLines.push(
            "Skills: " + userProfile.skills.map((s: any) => s.name).join(", ")
          )
        if (userProfile?.workExperience?.length)
          profileLines.push(
            "Experience: " +
              userProfile.workExperience
                .map((e: any) => `${e.jobTitle} at ${e.company}`)
                .join("; ")
          )
        if (userProfile?.education?.length)
          profileLines.push(
            "Education: " +
              userProfile.education
                .map((e: any) => `${e.degree} at ${e.institution}`)
                .join("; ")
          )

        const prompt = `Analyze how well this candidate fits the job posting. Return ONLY valid JSON with exactly these keys: percentage (integer 0-100), summary (string, 2 sentences), strengths (array of 3-5 strings), weaknesses (array of 3-5 strings), improvements (array of 3-5 strings).

Job: ${jobTitle} at ${companyName}
Description: ${jobData.selectedText.substring(0, 2000)}
Candidate: ${profileLines.join("\n")}`

        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 30_000)
        let resp: Response
        try {
          resp = await fetch(`${ollamaConfig.baseUrl}/chat`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${ollamaConfig.apiKey}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              model: selectedModel,
              messages: [
                {
                  role: "system",
                  content:
                    "You are a career advisor. Return only valid JSON, no markdown, no explanation."
                },
                { role: "user", content: prompt }
              ],
              stream: false
            }),
            signal: controller.signal
          })
        } catch (e: any) {
          if (e?.name === "AbortError")
            console.warn("[analyzeMatch] request timed out")
          return fallback
        } finally {
          clearTimeout(timeoutId)
        }
        if (!resp.ok) return fallback
        const data = await resp.json()
        const raw = data.message?.content || ""

        const jsonBlock = raw.match(/\{[\s\S]*\}/)
        if (!jsonBlock) return fallback

        // Attempt 1: standard parse with trailing-comma fix
        let parsed: any = null
        try {
          const cleaned = jsonBlock[0].replace(/,(\s*[}\]])/g, "$1")
          parsed = JSON.parse(cleaned)
        } catch {
          // Attempt 2: sanitise literal newlines / tabs / smart-quotes inside strings, then re-parse
          try {
            const sanitised = jsonBlock[0]
              .replace(/[\u2018\u2019]/g, "'")
              .replace(/[\u201C\u201D]/g, '"')
              .replace(/,(\s*[}\]])/g, "$1")
              // replace literal newlines/tabs that sit inside JSON string values
              .replace(
                /"((?:[^"\\]|\\.)*)"/g,
                (_m, inner: string) =>
                  `"${inner.replace(/\r?\n/g, " ").replace(/\t/g, " ")}"`
              )
            parsed = JSON.parse(sanitised)
          } catch {
            parsed = null
          }
        }

        // Attempt 3: field-by-field regex extraction when both JSON.parse attempts fail
        const extractArray = (text: string, key: string): string[] => {
          const block = text.match(
            new RegExp(`"${key}"\\s*:\\s*\\[([\\s\\S]*?)\\]`)
          )
          if (!block) return []
          const items: string[] = []
          const re = /"((?:[^"\\]|\\.)*)"/g
          let m: RegExpExecArray | null
          while ((m = re.exec(block[1])) !== null) items.push(m[1])
          return items
        }

        if (!parsed) {
          console.warn(
            "[analyzeMatch] JSON.parse failed twice, falling back to regex extraction"
          )
          parsed = {
            percentage: Number(raw.match(/"percentage"\s*:\s*(\d+)/)?.[1] ?? 0),
            summary:
              raw.match(/"summary"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/)?.[1] ??
              "",
            strengths: extractArray(raw, "strengths"),
            weaknesses: extractArray(raw, "weaknesses"),
            improvements: extractArray(raw, "improvements")
          }
        }

        return {
          percentage: Math.min(
            100,
            Math.max(0, Number(parsed.percentage) || 0)
          ),
          summary: String(parsed.summary || ""),
          strengths: Array.isArray(parsed.strengths)
            ? parsed.strengths.map(String)
            : [],
          weaknesses: Array.isArray(parsed.weaknesses)
            ? parsed.weaknesses.map(String)
            : [],
          improvements: Array.isArray(parsed.improvements)
            ? parsed.improvements.map(String)
            : []
        }
      } catch (e) {
        console.error("[analyzeMatch] error:", e)
        return fallback
      }
    }

    const [{ resume, coverLetter }, match] = await Promise.all([
      client.generateResumeAndCoverLetter(generateRequest),
      analyzeMatchInline()
    ])

    const resumeFilename = generateFilename(
      "resume",
      companyName,
      jobTitle,
      generatedAt
    )
    const coverLetterFilename = generateFilename(
      "cover-letter",
      companyName,
      jobTitle,
      generatedAt
    )

    const resumeContent = formatMarkdownContent(
      resume,
      "resume",
      companyName,
      jobTitle,
      selectedModel,
      generatedAt
    )
    const coverLetterContent = formatMarkdownContent(
      coverLetter,
      "cover-letter",
      companyName,
      jobTitle,
      selectedModel,
      generatedAt
    )

    chrome.storage.local.remove([STORAGE_KEYS.PENDING_JOB_DATA])

    res.send({
      success: true,
      message: "Documents generated!",
      data: {
        resumeContent,
        resumeFilename,
        coverLetterContent,
        coverLetterFilename,
        match
      }
    })
  } catch (error) {
    res.send({
      success: false,
      message: error instanceof Error ? error.message : "Unknown error occurred"
    })
  }
}

export default handler
