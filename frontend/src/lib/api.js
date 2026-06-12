import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api",
  withCredentials: true,
});

export const authAPI = {
  login: async (email, password, userType = 'customer') => {
    const endpoint = userType === 'manager' ? '/auth/managers/login' : '/auth/login';
    const response = await api.post(endpoint, { 
      email, 
      password,
      user_type: userType
    });
    return response.data;
  },

  signup: async (signupData) => {
    const response = await api.post('/auth/register', signupData); 
    return response.data;
  },

  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

export const accountAPI = {
  createAccount: async (accountData) => {
    const response = await api.post('/accounts/', accountData);
    return response.data;
  },

  getAccounts: async () => {
    const response = await api.get('/accounts/');
    return response.data;
  },

  getAccount: async (accountId) => {
    const response = await api.get(`/accounts/${accountId}`);
    return response.data;
  },
};

export const transactionAPI = {
  createTransaction: async (transactionData) => {
    const response = await api.post('/transactions/', transactionData);
    return response.data;
  },

  getTransactions: async (accountId = null) => {
    const url = accountId ? `/transactions/?account_id=${accountId}` : '/transactions/';
    const response = await api.get(url);
    return response.data;
  },

  getTransaction: async (transactionId) => {
    const response = await api.get(`/transactions/${transactionId}`);
    return response.data;
  },
};