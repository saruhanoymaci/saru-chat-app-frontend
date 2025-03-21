import api from './api';

export const chatService = {
  getChats: async () => {
    const response = await api.get('/api/chat/chats');
    return response.data;
  },

  searchUsers: async (query) => {
    const response = await api.get(`/api/chat/search?query=${query}`);
    return response.data;
  },

  createOrGetChat: async (userId) => {
    const response = await api.post('/api/chat/create', { userId });
    return response.data;
  },

  getChatById: async (chatId) => {
    const response = await api.get(`/api/chat/${chatId}`);
    return response.data;
  },

  markMessageAsRead: async (chatId, messageId) => {
    const response = await api.post('/api/chat/message/read', {
      chatId,
      messageId,
    });
    return response.data;
  },
}; 