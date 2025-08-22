import { Client } from 'minio';

// MinIOクライアントの設定
const minioClient = new Client({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT) || 9000,
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'minio_user',
  secretKey: process.env.MINIO_SECRET_KEY || 'minio_password'
});

const BUCKET_NAME = process.env.MINIO_BUCKET_NAME || 'gacha-images';

// バケットの存在確認と作成
async function ensureBucketExists() {
  try {
    const exists = await minioClient.bucketExists(BUCKET_NAME);
    if (!exists) {
      await minioClient.makeBucket(BUCKET_NAME);
      console.log(`Bucket '${BUCKET_NAME}' created successfully`);
      
      // パブリック読み取りポリシーを設定
      const policy = {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${BUCKET_NAME}/*`]
          }
        ]
      };
      await minioClient.setBucketPolicy(BUCKET_NAME, JSON.stringify(policy));
      console.log(`Public read policy set for bucket '${BUCKET_NAME}'`);
    }
  } catch (error) {
    console.error('Error ensuring bucket exists:', error);
    throw error;
  }
}

// ファイルアップロード
async function uploadFile(objectKey, buffer, contentType, metadata = {}) {
  try {
    await ensureBucketExists();
    
    const uploadMetadata = {
      'Content-Type': contentType,
      ...metadata
    };
    
    const result = await minioClient.putObject(
      BUCKET_NAME, 
      objectKey, 
      buffer, 
      buffer.length, 
      uploadMetadata
    );
    
    return {
      success: true,
      objectKey,
      etag: result.etag,
      url: `http://${process.env.MINIO_PUBLIC_ENDPOINT || 'localhost'}:${process.env.MINIO_PORT || 9000}/${BUCKET_NAME}/${objectKey}`
    };
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
}

// ファイル削除
async function deleteFile(objectKey) {
  try {
    await minioClient.removeObject(BUCKET_NAME, objectKey);
    return { success: true };
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
}

// ファイル一覧取得
async function listFiles(prefix = '') {
  try {
    // ユーザーIDが単独で渡された場合は適切なプレフィックス形式に変換
    let searchPrefix = prefix;
    
    // prefixを文字列に変換して型安全にする
    const prefixStr = String(prefix);
    
    if (prefixStr && !prefixStr.includes('/')) {
      // ユーザーIDのみの場合はusers/{userId}/items/形式に変換
      searchPrefix = `users/${prefixStr}/items/`;
    }
    
    const objectsList = [];
    const stream = minioClient.listObjects(BUCKET_NAME, searchPrefix, true);
    
    // まずオブジェクト一覧を取得
    const objects = await new Promise((resolve, reject) => {
      stream.on('data', (obj) => {
        objectsList.push(obj);
      });
      
      stream.on('end', () => {
        resolve(objectsList);
      });
      
      stream.on('error', (err) => {
        reject(err);
      });
    });

    // 各オブジェクトのメタデータを並列取得
    const objectsWithMetadata = await Promise.all(
      objects.map(async (obj) => {
        let originalName = obj.name.split('/').pop(); // デフォルトはオブジェクトキーのファイル名部分
        
        try {
          const stat = await minioClient.statObject(BUCKET_NAME, obj.name);
          if (stat.metaData && stat.metaData['x-amz-meta-original-name']) {
            // Base64デコードしてオリジナルファイル名を復元
            originalName = Buffer.from(stat.metaData['x-amz-meta-original-name'], 'base64').toString('utf8');
          }
        } catch (metaError) {
          // メタデータ取得失敗時はファイル名から推測
          console.warn('Failed to get metadata for', obj.name);
        }
        
        return {
          key: obj.name,
          objectKey: obj.name,
          url: `http://${process.env.MINIO_PUBLIC_ENDPOINT || 'localhost'}:${process.env.MINIO_PORT || 9000}/${BUCKET_NAME}/${obj.name}`,
          originalName: originalName,
          size: obj.size,
          lastModified: obj.lastModified,
          etag: obj.etag
        };
      })
    );

    return objectsWithMetadata;
  } catch (error) {
    console.error('Error listing files:', error);
    throw error;
  }
}

// オブジェクトキー生成（アイテム用）
function generateObjectKey(userId, filename) {
  const timestamp = Date.now();
  const cleanFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `users/${userId}/items/${timestamp}_${cleanFilename}`;
}

// オブジェクトキー生成（ガチャ画像用）
function generateGachaImageObjectKey(userId, gachaId, filename) {
  const timestamp = Date.now();
  const cleanFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `users/${userId}/gachas/${gachaId}/${timestamp}_${cleanFilename}`;
}

// ファイル検証
function validateFile(file) {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
  const maxSize = 5 * 1024 * 1024; // 5MB
  
  if (!allowedMimeTypes.includes(file.mimetype)) {
    throw new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.');
  }
  
  if (file.file.truncated || (file._buf && file._buf.length > maxSize)) {
    throw new Error('File size exceeds 5MB limit.');
  }
  
  return true;
}

export {
  minioClient,
  BUCKET_NAME,
  uploadFile,
  deleteFile,
  listFiles,
  generateObjectKey,
  generateGachaImageObjectKey,
  validateFile,
  ensureBucketExists
};
