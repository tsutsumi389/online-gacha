// API通信用のユーティリティ

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

// 基本的なfetch関数のラッパー
const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Cookieを含める
  };

  const config = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP error! status: ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error('API Request Error:', error);
    throw error;
  }
};

// 認証関連のAPI
export const authAPI = {
  // ログイン
  login: async (email, password) => {
    return apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  // 新規登録
  register: async (username, email, password, role = 'user') => {
    return apiRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password, role }),
    });
  },

  // ログアウト
  logout: async () => {
    return apiRequest('/api/auth/logout', {
      method: 'POST',
    });
  },

  // 現在のユーザー情報取得
  getCurrentUser: async () => {
    return apiRequest('/api/auth/me');
  },

  // トークン検証
  verifyToken: async () => {
    return apiRequest('/api/auth/verify');
  },

  // パスワード変更
  changePassword: async (currentPassword, newPassword) => {
    return apiRequest('/api/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },
};

// ガチャ関連のAPI
export const gachaAPI = {
  // ガチャ一覧取得
  getGachas: async () => {
    return apiRequest('/api/gachas');
  },

  // ガチャ詳細取得
  getGacha: async (id) => {
    return apiRequest(`/api/gachas/${id}`);
  },

  // ガチャ実行
  drawGacha: async (id, count = 1) => {
    return apiRequest(`/api/gachas/${id}/draw`, {
      method: 'POST',
      body: JSON.stringify({ count }),
    });
  },
};

// エラーハンドリング用のユーティリティ
export const handleApiError = (error) => {
  if (error.message.includes('401')) {
    // 認証エラーの場合、ログイン画面にリダイレクト
    window.location.href = '/login';
    return '認証が必要です。ログインしてください。';
  } else if (error.message.includes('403')) {
    return 'アクセス権限がありません。';
  } else if (error.message.includes('404')) {
    return 'リソースが見つかりません。';
  } else if (error.message.includes('500')) {
    return 'サーバーエラーが発生しました。しばらく時間をおいてから再度お試しください。';
  } else {
    return error.message || '予期しないエラーが発生しました。';
  }
};

export default apiRequest;
