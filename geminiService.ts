
import { GoogleGenAI } from "@google/genai";
import { SaleRecord } from "./types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getSalesInsights = async (sales: SaleRecord[]): Promise<string> => {
  if (sales.length === 0) return "Chưa có dữ liệu bán hàng để phân tích.";

  const summary = sales.map(s => ({
    time: s.timestamp,
    total: s.totalAmount,
    items: s.items.map(i => `${i.name} x${i.quantity}`).join(", ")
  }));

  const prompt = `Đây là dữ liệu bán hàng gần đây: ${JSON.stringify(summary)}. 
  Hãy viết một bản tóm tắt ngắn gọn (2-3 câu) về hiệu quả kinh doanh, các mặt hàng bán chạy nhất và một mẹo cụ thể để tăng doanh thu. 
  Phản hồi bằng tiếng Việt, với giọng văn chuyên nghiệp, gần gũi và hữu ích.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "Không thể lấy phân tích vào lúc này.";
  } catch (error) {
    console.error("Gemini Insight Error:", error);
    return "Đã xảy ra lỗi khi kết nối với trí tuệ nhân tạo AI.";
  }
};
