
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateFinancialAnalysis = async (
  sales: number,
  purchases: number,
  expenses: number,
  profit: number
): Promise<string> => {
  const prompt = `
    أنت مستشار مالي خبير. قم بتحليل البيانات المالية التالية لشركة صغيرة وقدم ملخصًا موجزًا (لا يزيد عن 3-4 جمل) عن صحتها المالية.
    
    البيانات:
    - إجمالي المبيعات: ${sales.toLocaleString('en-US')} جنيه مصري
    - إجمالي المشتريات: ${purchases.toLocaleString('en-US')} جنيه مصري
    - إجمالي المصروفات: ${expenses.toLocaleString('en-US')} جنيه مصري
    - صافي الربح: ${profit.toLocaleString('en-US')} جنيه مصري
    
    التحليل يجب أن يكون باللغة العربية، وواضحًا، ومباشرًا.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    // Fix: Awaited generateContent but did not await the text property which is incorrect. Access text directly.
    return response.text;
  } catch (error) {
    console.error("Error generating financial analysis:", error);
    return "عفواً، حدث خطأ أثناء محاولة تحليل البيانات. يرجى المحاولة مرة أخرى.";
  }
};
