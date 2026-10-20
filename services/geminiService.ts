import { GoogleGenAI } from "@google/genai";

export const generateFinancialAnalysis = async (
  sales: number,
  purchases: number,
  expenses: number,
  profit: number
): Promise<string> => {
  // Safely check for API Key without crashing module evaluation in browser
  const apiKey =
    (typeof process !== 'undefined' && process.env?.API_KEY) ||
    (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) ||
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GEMINI_API_KEY) ||
    '';

  if (!apiKey) {
    return "💡 لتفعيل ميزة التحليل المالي بالذكاء الاصطناعي، يرجى إضافة مفتاح API_KEY في متغيرات البيئة (Environment Variables) في استضافة Vercel.";
  }

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
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "تم التحليل بنجاح.";
  } catch (error) {
    console.error("Error generating financial analysis:", error);
    return "عفواً، حدث خطأ أثناء محاولة تحليل البيانات. يرجى التحقق من صلاحية مفتاح API.";
  }
};
