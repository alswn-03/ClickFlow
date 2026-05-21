import axios from 'axios';

const API_URL = 'http://localhost:4000/api';

export const trackEvent = async (eventType: string, itemId?: string) => {
    const userId = localStorage.getItem('user_id') || 'anonymous';
    
    try {
        await axios.post(`${API_URL}/log`, {
            event_type: eventType,
            user_id: userId,
            item_id: itemId,
        });
    } catch (error) {
        console.error('Failed to track event:', error);
    }
};
