// API通信用のユーティリティ

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

// 基本的なfetch関数のラッパー
const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultOptions = {
    headers: {},
    credentials: 'include', // Cookieを含める
  };

  // FormDataの場合はContent-Typeを自動設定させる
  if (!(options.body instanceof FormData)) {
    defaultOptions.headers['Content-Type'] = 'application/json';
  }

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
      // エラーレスポンスの詳細を含むエラーを投げる
      const errorMessage = data.details || data.error || `HTTP error! status: ${response.status}`;
      const error = new Error(errorMessage);
      error.status = response.status;
      error.data = data;
      throw error;
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
  register: async (name, email, password) => {
    return apiRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
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

  // プロフィール統合更新
  updateProfile: async (profileData) => {
    return apiRequest('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  },
};

// ガチャ関連のAPI
export const gachaAPI = {
  // ガチャ一覧取得（検索・フィルタリング・ソート・ページネーション対応）
  getGachas: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.search) queryParams.append('search', params.search);
    if (params.category) queryParams.append('category', params.category);
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);
    
    const queryString = queryParams.toString();
    const endpoint = `/api/gachas${queryString ? `?${queryString}` : ''}`;
    
    return apiRequest(endpoint);
  },

  // ガチャ詳細取得
  getGacha: async (id) => {
    return apiRequest(`/api/gachas/${id}`);
  },

  // カテゴリ一覧取得
  getCategories: async () => {
    return apiRequest('/api/gachas/categories');
  },

  // 人気ガチャランキング取得
  getPopularGachas: async (limit = 5) => {
    return apiRequest(`/api/gachas/popular?limit=${limit}`);
  },

  // ガチャ統計情報取得
  getStats: async () => {
    return apiRequest('/api/gachas/stats');
  },

  // ガチャ実行
  drawGacha: async (id, count = 1) => {
    return apiRequest(`/api/gachas/${id}/draw`, {
      method: 'POST',
      body: JSON.stringify({ count }),
    });
  },
};

// ユーザーガチャ管理用API
export const myGachaAPI = {
  // 自分のガチャ一覧取得
  getGachas: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.search) queryParams.append('search', params.search);
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);
    
    const queryString = queryParams.toString();
    const endpoint = `/api/my/gachas${queryString ? `?${queryString}` : ''}`;
    
    return apiRequest(endpoint);
  },

  // 自分のガチャ詳細取得（アイテム付き）
  getGacha: async (id) => {
    return apiRequest(`/api/my/gachas/${id}`);
  },

  // 自分のガチャ作成
  createGacha: async (gachaData) => {
    return apiRequest('/api/my/gachas', {
      method: 'POST',
      body: JSON.stringify(gachaData),
    });
  },

  // 自分のガチャ更新
  updateGacha: async (id, gachaData) => {
    return apiRequest(`/api/my/gachas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(gachaData),
    });
  },

  // 自分のガチャ削除
  deleteGacha: async (id) => {
    return apiRequest(`/api/my/gachas/${id}`, {
      method: 'DELETE',
    });
  },

  // 自分のガチャ公開状態切り替え
  toggleGachaPublic: async (id) => {
    return apiRequest(`/api/my/gachas/${id}/toggle-public`, {
      method: 'PUT',
    });
  },

  // ガチャアイテム一覧取得
  getGachaItems: async (gachaId) => {
    return apiRequest(`/api/my/gachas/${gachaId}/items`);
  },

  // ガチャアイテム作成
  createGachaItem: async (gachaId, itemData) => {
    return apiRequest(`/api/my/gachas/${gachaId}/items`, {
      method: 'POST',
      body: JSON.stringify(itemData),
    });
  },

  // ガチャアイテム更新
  updateGachaItem: async (gachaId, itemId, itemData) => {
    return apiRequest(`/api/my/gachas/${gachaId}/items/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify(itemData),
    });
  },

  // ガチャアイテム削除
  deleteGachaItem: async (gachaId, itemId) => {
    return apiRequest(`/api/my/gachas/${gachaId}/items/${itemId}`, {
      method: 'DELETE',
    });
  },

  // ガチャ画像管理API
  // ガチャ画像一覧取得
  getGachaImages: async (gachaId) => {
    return apiRequest(`/api/my/gachas/${gachaId}/images`);
  },

  // ガチャ画像アップロード
  uploadGachaImage: async (gachaId, formData) => {
    return apiRequest(`/api/my/gachas/${gachaId}/images/upload`, {
      method: 'POST',
      body: formData,
    });
  },

  // ガチャ画像削除
  deleteGachaImage: async (gachaId, imageId) => {
    return apiRequest(`/api/my/gachas/${gachaId}/images/${imageId}`, {
      method: 'DELETE',
    });
  },

  // ガチャ画像の並び順変更
  updateGachaImageOrder: async (gachaId, imageOrders) => {
    return apiRequest(`/api/my/gachas/${gachaId}/images/order`, {
      method: 'PUT',
      body: JSON.stringify({ imageOrders }),
    });
  },

  // メイン画像設定
  setMainGachaImage: async (gachaId, imageId) => {
    return apiRequest(`/api/my/gachas/${gachaId}/images/${imageId}/main`, {
      method: 'PATCH',
    });
  },
};

// 画像アップロード関連のAPI
export const imageAPI = {
  // 画像アップロード
  uploadImage: async (imageFile) => {
    const formData = new FormData();
    formData.append('image', imageFile);
    
    return apiRequest('/api/admin/images/upload', {
      method: 'POST',
      body: formData,
    });
  },

  // 画像一覧取得
  getImages: async () => {
    return apiRequest('/api/admin/images');
  },

  // 画像削除
  deleteImage: async (objectKey) => {
    return apiRequest(`/api/admin/images/${encodeURIComponent(objectKey)}`, {
      method: 'DELETE',
    });
  },

  // 画像使用状況確認
  getImageUsage: async (objectKey) => {
    return apiRequest(`/api/admin/images/usage/${encodeURIComponent(objectKey)}`);
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
