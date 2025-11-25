import { GoogleGenAI, Type } from "@google/genai";
import { PotentialError } from '../types';

export async function findErrorsInSrt(srtContent: string, apiKey: string): Promise<PotentialError[]> {
  if (!apiKey || apiKey.trim() === '') {
    throw new Error("API 키가 제공되지 않았습니다.");
  }

  const ai = new GoogleGenAI({ apiKey: apiKey });

  const prompt = `
    다음 SRT 자막 내용을 분석해 주세요. 당신의 임무는 다음과 같은 특정 유형의 오류만 식별하는 것입니다:
    1. 철자 오류 (오타).
    2. 표준 사전에 존재하지 않는 단어.

    중요: 단어 자체의 철자가 정확하다면 문법적 오류나 어색한 문장은 수정하지 마세요. 이 자막은 강사처럼 말하는 사람의 말을 그대로 옮긴 것입니다. 당신의 유일한 임무는 오타와 존재하지 않는 단어를 찾는 것입니다. 예를 들어, 강사가 "이것은 사과 이다"라고 말해야 하는데 "이것은 사과 이다다"라고 말했다면 '이다다'를 '이다'로 수정해야 합니다. 하지만 문맥상 어색하더라도 단어 자체에 오타가 없다면 수정하면 안됩니다.

    발견된 각 오류에 대해 다음 정보를 제공해 주세요: 자막 ID 번호, 원래의 틀린 단어, 전체 문맥, 수정 이유(예: "오타", "사전에 없는 단어"와 같이 한국어로 작성), 그리고 최대 3개의 수정 제안.
    
    SRT 내용:
    ---
    ${srtContent}
    ---
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              subtitleId: {
                type: Type.INTEGER,
                description: 'The numeric ID of the subtitle block where the error is located.',
              },
              originalWord: {
                type: Type.STRING,
                description: 'The specific word or phrase that is incorrect.',
              },
              context: {
                type: Type.STRING,
                description: 'The full line of text containing the error.',
              },
              reason: {
                type: Type.STRING,
                description: '단어가 오류로 간주되는 이유에 대한 간략한 설명입니다. 반드시 "오타" 또는 "사전에 없는 단어"와 같이 한국어로 작성해야 합니다.',
              },
              suggestions: {
                type: Type.ARRAY,
                items: {
                  type: Type.STRING,
                },
                description: 'An array of suggested correction strings.',
              },
            },
            required: ["subtitleId", "originalWord", "context", "reason", "suggestions"],
          },
        },
      },
    });

    const jsonText = response.text;
    const errors = JSON.parse(jsonText) as Omit<PotentialError, 'id'>[];
    
    // Add a unique ID to each error for React keys
    return errors.map((error, index) => ({
      ...error,
      id: `${error.subtitleId}-${index}`,
    }));

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw new Error("Failed to analyze subtitles. Please check the console for details.");
  }
}