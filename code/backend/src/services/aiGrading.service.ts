import axios from 'axios';
import { env } from '../config/env';

export interface AiGradingInput {
  questionPrompt: string;
  studentAnswer: string;
  maxScore: number;
  questionType: 'SHORT' | 'LONG';
  keywords?: string[];
  rubric?: string | null;
}

export interface AiGradingOutput {
  suggestedScore: number;
  confidence: number; // 0.00 to 1.00
  reasoning: string;
  matchedKeywords: string[];
  source: 'AI_SUGGESTION' | 'HEURISTIC_FALLBACK';
}

export class AiGradingService {
  /**
   * Grade a subjective student answer using OpenRouter free tier with multi-level fallbacks.
   */
  static async evaluateSubjectiveAnswer(input: AiGradingInput): Promise<AiGradingOutput> {
    const { questionPrompt, studentAnswer, maxScore, keywords = [], rubric } = input;

    // Fast path: empty or blank student answer gets 0 points
    if (!studentAnswer || studentAnswer.trim().length === 0) {
      return {
        suggestedScore: 0,
        confidence: 1.0,
        reasoning: 'No answer provided by the student.',
        matchedKeywords: [],
        source: 'HEURISTIC_FALLBACK',
      };
    }

    // 1. Try OpenRouter API (Primary Free Route)
    if (env.OPENROUTER_API_KEY) {
      try {
        const result = await this.callOpenRouter(input);
        if (result) return result;
      } catch (err: any) {
        console.warn('[AiGrading] OpenRouter API attempt failed:', err.message || err);
      }
    }

    // 2. Try Google Gemini API Fallback
    if (env.GEMINI_API_KEY) {
      try {
        const result = await this.callGemini(input);
        if (result) return result;
      } catch (err: any) {
        console.warn('[AiGrading] Google Gemini API attempt failed:', err.message || err);
      }
    }

    // 3. Try OpenAI API Fallback
    if (env.OPENAI_API_KEY) {
      try {
        const result = await this.callOpenAI(input);
        if (result) return result;
      } catch (err: any) {
        console.warn('[AiGrading] OpenAI API attempt failed:', err.message || err);
      }
    }

    // 4. Local Heuristic Evaluator (Guaranteed resilience, zero network dependency)
    return this.evaluateLocalHeuristics(input);
  }

  /**
   * Call OpenRouter API with JSON prompt
   */
  private static async callOpenRouter(input: AiGradingInput): Promise<AiGradingOutput | null> {
    const prompt = this.buildGradingPrompt(input);

    const modelsToTry = [
      env.OPENROUTER_MODEL || 'openrouter/free',
      'openrouter/free',
      'openrouter/auto',
      'qwen/qwen3.8-27b:free',
      'liquid/lfm-2.5-2.6b:free',
    ];

    // Deduplicate models
    const uniqueModels = Array.from(new Set(modelsToTry.filter(Boolean)));

    for (const model of uniqueModels) {
      try {
        const response = await axios.post(
          'https://openrouter.ai/api/v1/chat/completions',
          {
            model,
            messages: [
              {
                role: 'system',
                content:
                  'You are an expert, objective academic examiner. Evaluate the student response accurately and return strictly valid JSON matching the requested schema with no surrounding text or markdown formatting.',
              },
              {
                role: 'user',
                content: prompt,
              },
            ],
            temperature: 0.1,
          },
          {
            headers: {
              Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': 'https://onlineexamplatform.internal',
              'X-Title': 'Online Exam Platform Subjective Grader',
            },
            timeout: 15000,
          }
        );

        const content = response.data?.choices?.[0]?.message?.content;
        if (content) {
          const parsed = this.parseAiResponse(content, input.maxScore);
          if (parsed) {
            console.log(`[AiGrading] Evaluated successfully via OpenRouter (${model})`);
            return parsed;
          }
        }
      } catch (err: any) {
        console.warn(`[AiGrading] OpenRouter model ${model} failed:`, err.response?.data?.error?.message || err.message);
      }
    }

    return null;
  }

  /**
   * Call Google Gemini API directly
   */
  private static async callGemini(input: AiGradingInput): Promise<AiGradingOutput | null> {
    const prompt = this.buildGradingPrompt(input);

    const modelsToTry = [
      'gemini-flash-lite-latest',
      'gemini-flash-latest',
      'gemini-2.5-flash-lite',
      'gemini-2.5-flash',
      'gemini-2.5-pro',
    ];

    for (const model of modelsToTry) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`;
        const response = await axios.post(
          url,
          {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.1,
            },
          },
          { timeout: 15000 }
        );

        const content = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (content) {
          const parsed = this.parseAiResponse(content, input.maxScore);
          if (parsed) {
            console.log(`[AiGrading] Evaluated successfully via Google Gemini (${model})`);
            return parsed;
          }
        }
      } catch (err: any) {
        console.warn(`[AiGrading] Google Gemini model ${model} failed:`, err.response?.data?.error?.message || err.message);
      }
    }

    return null;
  }

  /**
   * Call OpenAI API directly
   */
  private static async callOpenAI(input: AiGradingInput): Promise<AiGradingOutput | null> {
    const prompt = this.buildGradingPrompt(input);
    const modelsToTry = ['gpt-4o-mini', 'gpt-3.5-turbo'];

    for (const model of modelsToTry) {
      try {
        const response = await axios.post(
          'https://api.openai.com/v1/chat/completions',
          {
            model,
            messages: [
              {
                role: 'system',
                content: 'You are an expert academic evaluator. Return strictly valid JSON with no markdown tags.',
              },
              { role: 'user', content: prompt },
            ],
            temperature: 0.1,
            response_format: { type: 'json_object' },
          },
          {
            headers: {
              Authorization: `Bearer ${env.OPENAI_API_KEY}`,
              'Content-Type': 'application/json',
            },
            timeout: 15000,
          }
        );

        const content = response.data?.choices?.[0]?.message?.content;
        if (content) {
          const parsed = this.parseAiResponse(content, input.maxScore);
          if (parsed) {
            console.log(`[AiGrading] Evaluated successfully via OpenAI (${model})`);
            return parsed;
          }
        }
      } catch (err: any) {
        console.warn(`[AiGrading] OpenAI model ${model} failed:`, err.response?.data?.error?.message || err.message);
      }
    }

    return null;
  }

  /**
   * Construct evaluation prompt tailored to whether the teacher provided keywords/rubric
   */
  private static buildGradingPrompt(input: AiGradingInput): string {
    const hasRubric = input.rubric && input.rubric.trim().length > 0;
    const hasKeywords = input.keywords && input.keywords.length > 0;

    let rubricInstructions = '';
    if (hasKeywords || hasRubric) {
      rubricInstructions = `
Teacher Rubric & Expected Concepts:
${hasRubric ? `- Rubric Criteria: ${input.rubric}` : ''}
${hasKeywords ? `- Expected Key Concepts/Keywords: ${input.keywords!.join(', ')}` : ''}

Evaluate the student's answer against the teacher-provided criteria and keywords. Identify which keywords/concepts were appropriately addressed.
`;
    } else {
      rubricInstructions = `
No teacher keywords or explicit rubric were provided.
Evaluate the student's answer based on:
1. Factual accuracy and conceptual correctness in relation to the question prompt.
2. Depth of explanation, clarity, and logical coherence.
3. Relevance and completeness relative to a maximum possible score of ${input.maxScore} marks.
Extract key concepts the student accurately mentioned in the "matchedKeywords" list.
`;
    }

    return `
You are grading a ${input.questionType === 'SHORT' ? 'short answer' : 'long essay/comprehensive'} question.

[Question Prompt]:
${input.questionPrompt}

[Maximum Marks]: ${input.maxScore}

[Student's Submitted Answer]:
"""
${input.studentAnswer}
"""

${rubricInstructions}

You must return a valid JSON object with the following schema:
{
  "suggestedScore": <number between 0 and ${input.maxScore}, can have 1 decimal place>,
  "confidence": <number between 0.00 and 1.00 indicating certainty>,
  "reasoning": "<concise 2-4 sentence explanation of the score, strengths, and missing elements>",
  "matchedKeywords": ["<key concepts/terms identified in the student's answer>"]
}
`;
  }

  /**
   * Safe parser for LLM JSON output
   */
  private static parseAiResponse(raw: string, maxScore: number): AiGradingOutput | null {
    try {
      let cleaned = raw.trim();

      // Extract JSON substring between the first '{' and the last '}'
      const firstBrace = cleaned.indexOf('{');
      const lastBrace = cleaned.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        cleaned = cleaned.substring(firstBrace, lastBrace + 1);
      } else if (cleaned.startsWith('```json')) {
        cleaned = cleaned.replace(/^```json\s*/, '').replace(/```$/, '').trim();
      } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```\s*/, '').replace(/```$/, '').trim();
      }

      const parsed = JSON.parse(cleaned);
      const rawScore = Number(parsed.suggestedScore);
      const boundedScore = Math.max(0, Math.min(maxScore, isNaN(rawScore) ? 0 : rawScore));
      const rawConf = Number(parsed.confidence);
      const boundedConf = Math.max(0, Math.min(1.0, isNaN(rawConf) ? 0.85 : rawConf));

      return {
        suggestedScore: Number(boundedScore.toFixed(2)),
        confidence: Number(boundedConf.toFixed(4)),
        reasoning: String(parsed.reasoning || 'Evaluated based on conceptual relevance and completeness.'),
        matchedKeywords: Array.isArray(parsed.matchedKeywords) ? parsed.matchedKeywords.map(String) : [],
        source: 'AI_SUGGESTION',
      };
    } catch (err) {
      console.warn('[AiGrading] Failed to parse AI JSON response:', err);
      return null;
    }
  }

  /**
   * Local deterministic semantic heuristic evaluator as a safe fallback
   */
  private static evaluateLocalHeuristics(input: AiGradingInput): AiGradingOutput {
    const { questionPrompt, studentAnswer, maxScore, questionType, keywords = [] } = input;

    const lowerAnswer = studentAnswer.toLowerCase();
    const words = lowerAnswer.split(/\s+/).filter(Boolean);

    // 1. Keyword matching
    const matchedKeywords: string[] = [];
    if (keywords.length > 0) {
      for (const kw of keywords) {
        if (lowerAnswer.includes(kw.toLowerCase().trim())) {
          matchedKeywords.push(kw);
        }
      }
    } else {
      // Extract salient words from question prompt as proxy keywords
      const promptWords = questionPrompt
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter(
          (w) =>
            w.length > 4 &&
            ![
              'explain',
              'describe',
              'discuss',
              'what',
              'which',
              'where',
              'when',
              'should',
              'would',
              'could',
              'between',
            ].includes(w)
        );

      const uniquePromptWords = Array.from(new Set(promptWords));
      for (const pw of uniquePromptWords) {
        if (lowerAnswer.includes(pw)) {
          matchedKeywords.push(pw);
        }
      }
    }

    // 2. Length & Substance Heuristic
    const targetWordCount = questionType === 'SHORT' ? 30 : 90;
    const lengthRatio = Math.min(1.0, words.length / targetWordCount);

    // 3. Keyword Coverage Ratio
    const keywordRatio =
      keywords.length > 0
        ? matchedKeywords.length / keywords.length
        : Math.min(1.0, matchedKeywords.length / 3);

    // Weighted composite score
    const compositeRatio =
      keywords.length > 0
        ? keywordRatio * 0.7 + lengthRatio * 0.3
        : lengthRatio * 0.5 + keywordRatio * 0.5;

    const rawScore = compositeRatio * maxScore;
    const roundedScore = Math.max(0, Math.min(maxScore, Math.round(rawScore * 2) / 2)); // round to nearest 0.5

    const reasoning =
      keywords.length > 0
        ? `Heuristic evaluation: matched ${matchedKeywords.length} of ${keywords.length} expected keywords (${matchedKeywords.join(', ') || 'none'}). Word count: ${words.length}.`
        : `Heuristic evaluation based on conceptual density and response length (${words.length} words).`;

    return {
      suggestedScore: roundedScore,
      confidence: 0.75,
      reasoning,
      matchedKeywords,
      source: 'HEURISTIC_FALLBACK',
    };
  }
}
