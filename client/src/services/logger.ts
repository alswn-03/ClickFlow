import axios from "axios";

const API_URL = "http://localhost:4000/api";

// 사용자 행동 이벤트를 서버의 /api/log 엔드포인트로 전송하는 클라이언트 측 로깅 함수
export const trackEvent = async (
  eventType: string,
  itemId?: string,
  transactionId?: string,
) => {
  const userId = localStorage.getItem("user_id") || "anonymous";

  try {
    await axios.post(`${API_URL}/log`, {
      event_type: eventType,
      user_id: userId,
      item_id: itemId,
      transaction_id: transactionId,
    });
  } catch (error) {
    console.error("Failed to track event:", error);
  }
};
