import sharp from 'sharp';
import { uploadFile, generateObjectKey } from './minio.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Sharp.js画像処理設定
 */
const IMAGE_SIZES = {
  original: { width: 2048, height: 2048 },
  desktop: { width: 1024, height: 1024 },
  mobile: { width: 512, height: 512 },
  thumbnail: { width: 150, height: 150 }
};

const IMAGE_FORMATS = {
  avif: { 
    quality: 80,
    effort: 4,
    chromaSubsampling: '4:2:0'
  },
  webp: { 
    quality: 85,
    effort: 4,
    nearLossless: false
  },
  jpeg: { 
    quality: 90,
    progressive: true,
    mozjpeg: true
  }
};

/**
 * 画像メタデータ取得
 */
export async function getImageMetadata(buffer) {
  try {
    const metadata = await sharp(buffer).metadata();
    return {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      size: metadata.size,
      hasAlpha: metadata.hasAlpha,
      density: metadata.density
    };
  } catch (error) {
    throw new Error(`Failed to get image metadata: ${error.message}`);
  }
}

/**
 * 画像を指定サイズとフォーマットに変換
 */
export async function processImage(buffer, sizeType, formatType) {
  try {
    const sizeConfig = IMAGE_SIZES[sizeType];
    const formatConfig = IMAGE_FORMATS[formatType];
    
    if (!sizeConfig || !formatConfig) {
      throw new Error(`Invalid size type: ${sizeType} or format type: ${formatType}`);
    }

    let sharpInstance = sharp(buffer)
      .resize(sizeConfig.width, sizeConfig.height, {
        fit: 'inside',
        withoutEnlargement: true,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      });

    // フォーマット別の設定適用
    switch (formatType) {
      case 'avif':
        sharpInstance = sharpInstance.avif(formatConfig);
        break;
      case 'webp':
        sharpInstance = sharpInstance.webp(formatConfig);
        break;
      case 'jpeg':
        sharpInstance = sharpInstance.jpeg(formatConfig);
        break;
      default:
        throw new Error(`Unsupported format: ${formatType}`);
    }

    const processedBuffer = await sharpInstance.toBuffer();
    const processedMetadata = await sharp(processedBuffer).metadata();

    return {
      buffer: processedBuffer,
      width: processedMetadata.width,
      height: processedMetadata.height,
      size: processedBuffer.length,
      format: formatType
    };
  } catch (error) {
    throw new Error(`Image processing failed: ${error.message}`);
  }
}

/**
 * 画像の全バリアントを生成してMinIOにアップロード
 */
export async function generateImageVariants(buffer, baseObjectKey, originalFilename) {
  const variants = [];
  const errors = [];

  // 全サイズ×全フォーマットの組み合わせを処理
  for (const sizeType of Object.keys(IMAGE_SIZES)) {
    for (const formatType of Object.keys(IMAGE_FORMATS)) {
      try {
        console.log(`Processing ${sizeType} ${formatType} for ${originalFilename}`);
        
        // 画像処理
        const processed = await processImage(buffer, sizeType, formatType);
        
        // オブジェクトキー生成
        const objectKey = `${baseObjectKey}/${sizeType}.${formatType}`;
        
        // MinIOにアップロード
        const uploadResult = await uploadFile(
          objectKey,
          processed.buffer,
          `image/${formatType}`
        );

        // バリアント情報を記録
        variants.push({
          sizeType,
          formatType,
          objectKey,
          imageUrl: uploadResult.url || `/api/images/serve/${objectKey}`,
          fileSize: processed.size,
          width: processed.width,
          height: processed.height,
          quality: IMAGE_FORMATS[formatType].quality
        });

        console.log(`✅ Successfully processed ${sizeType} ${formatType}: ${processed.size} bytes`);
      } catch (error) {
        console.error(`❌ Failed to process ${sizeType} ${formatType}:`, error.message);
        errors.push({
          sizeType,
          formatType,
          error: error.message
        });
      }
    }
  }

  return {
    variants,
    errors,
    totalVariants: variants.length,
    expectedVariants: Object.keys(IMAGE_SIZES).length * Object.keys(IMAGE_FORMATS).length
  };
}

/**
 * ガチャ画像の完全処理
 */
export async function processGachaImage(db, buffer, gachaId, originalFilename, displayOrder = 1, isMain = false) {
  let transaction;
  
  try {
    // トランザクション開始
    transaction = await db.query('BEGIN');
    
    // オリジナル画像のメタデータ取得
    const originalMetadata = await getImageMetadata(buffer);
    
    // ベースオブジェクトキー生成
    const imageId = uuidv4();
    const baseObjectKey = `gacha/${gachaId}/images/${imageId}`;
    
    // オリジナル画像をMinIOに保存
    const originalObjectKey = `${baseObjectKey}/original.${originalMetadata.format}`;
    await uploadFile(originalObjectKey, buffer, `image/${originalMetadata.format}`);
    
    // ガチャ画像メタデータをDBに保存
    const insertImageResult = await db.query(`
      INSERT INTO gacha_images (
        gacha_id, original_filename, base_object_key, 
        original_size, original_mime_type, display_order, 
        is_main, processing_status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'processing', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id
    `, [
      gachaId, originalFilename, baseObjectKey,
      originalMetadata.size, `image/${originalMetadata.format}`,
      displayOrder, isMain
    ]);
    
    const gachaImageId = insertImageResult.rows[0].id;
    
    // 画像バリアント生成
    const variantResult = await generateImageVariants(buffer, baseObjectKey, originalFilename);
    
    // 成功したバリアントをDBに保存
    for (const variant of variantResult.variants) {
      await db.query(`
        INSERT INTO image_variants (
          gacha_image_id, size_type, format_type, object_key,
          image_url, file_size, width, height, quality, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
      `, [
        gachaImageId, variant.sizeType, variant.formatType, variant.objectKey,
        variant.imageUrl, variant.fileSize, variant.width, variant.height, variant.quality
      ]);
    }
    
    // 処理状況を更新
    const finalStatus = variantResult.errors.length === 0 ? 'completed' : 
                       variantResult.variants.length > 0 ? 'completed' : 'failed';
    
    await db.query(`
      UPDATE gacha_images 
      SET processing_status = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $2
    `, [finalStatus, gachaImageId]);
    
    // トランザクションコミット
    await db.query('COMMIT');
    
    console.log(`✅ Gacha image processing completed: ${variantResult.totalVariants}/${variantResult.expectedVariants} variants`);
    
    return {
      success: true,
      gachaImageId,
      variants: variantResult.variants,
      errors: variantResult.errors,
      processingStatus: finalStatus,
      statistics: {
        totalVariants: variantResult.totalVariants,
        expectedVariants: variantResult.expectedVariants,
        successRate: Math.round((variantResult.totalVariants / variantResult.expectedVariants) * 100)
      }
    };
    
  } catch (error) {
    // ロールバック
    if (transaction) {
      await db.query('ROLLBACK');
    }
    
    console.error('❌ Gacha image processing failed:', error);
    
    return {
      success: false,
      error: error.message,
      details: error.stack
    };
  }
}

/**
 * アイテム画像の完全処理
 */
export async function processItemImage(db, buffer, userId, originalFilename, isPublic = true) {
  let transaction;
  
  try {
    // トランザクション開始
    transaction = await db.query('BEGIN');
    
    // オリジナル画像のメタデータ取得
    const originalMetadata = await getImageMetadata(buffer);
    
    // ベースオブジェクトキー生成
    const imageId = uuidv4();
    const baseObjectKey = `items/${userId}/images/${imageId}`;
    
    // オリジナル画像をMinIOに保存
    const originalObjectKey = `${baseObjectKey}/original.${originalMetadata.format}`;
    await uploadFile(originalObjectKey, buffer, `image/${originalMetadata.format}`);
    
    // アイテム画像メタデータをDBに保存
    const insertImageResult = await db.query(`
      INSERT INTO item_images (
        user_id, original_filename, base_object_key, 
        original_size, original_mime_type, is_public,
        processing_status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, 'processing', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id
    `, [
      userId, originalFilename, baseObjectKey,
      originalMetadata.size, `image/${originalMetadata.format}`, isPublic
    ]);
    
    const itemImageId = insertImageResult.rows[0].id;
    
    // 画像バリアント生成
    const variantResult = await generateImageVariants(buffer, baseObjectKey, originalFilename);
    
    // 成功したバリアントをDBに保存
    for (const variant of variantResult.variants) {
      await db.query(`
        INSERT INTO item_image_variants (
          item_image_id, size_type, format_type, object_key,
          image_url, file_size, width, height, quality, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
      `, [
        itemImageId, variant.sizeType, variant.formatType, variant.objectKey,
        variant.imageUrl, variant.fileSize, variant.width, variant.height, variant.quality
      ]);
    }
    
    // 処理状況を更新
    const finalStatus = variantResult.errors.length === 0 ? 'completed' : 
                       variantResult.variants.length > 0 ? 'completed' : 'failed';
    
    await db.query(`
      UPDATE item_images 
      SET processing_status = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $2
    `, [finalStatus, itemImageId]);
    
    // トランザクションコミット
    await db.query('COMMIT');
    
    console.log(`✅ Item image processing completed: ${variantResult.totalVariants}/${variantResult.expectedVariants} variants`);
    
    return {
      success: true,
      itemImageId,
      variants: variantResult.variants,
      errors: variantResult.errors,
      processingStatus: finalStatus,
      statistics: {
        totalVariants: variantResult.totalVariants,
        expectedVariants: variantResult.expectedVariants,
        successRate: Math.round((variantResult.totalVariants / variantResult.expectedVariants) * 100)
      }
    };
    
  } catch (error) {
    // ロールバック
    if (transaction) {
      await db.query('ROLLBACK');
    }
    
    console.error('❌ Item image processing failed:', error);
    
    return {
      success: false,
      error: error.message,
      details: error.stack
    };
  }
}

/**
 * 画像配信用URLの生成
 */
export function generateImageUrl(baseObjectKey, sizeType = 'desktop', formatType = 'webp') {
  // baseObjectKey: "gacha/12/images/185693ac-51a8-4d66-8824-851440997510"
  // から gachaId と imageId を抽出
  const parts = baseObjectKey.split('/');
  if (parts.length >= 4 && parts[0] === 'gacha' && parts[2] === 'images') {
    const gachaId = parts[1];
    const imageId = parts[3];
    return `/api/images/serve/${gachaId}/images/${imageId}/${sizeType}.${formatType}`;
  }
  
  // fallback (旧形式対応)
  return `/api/images/serve/${baseObjectKey}/${sizeType}.${formatType}`;
}

/**
 * レスポンシブ画像セットの生成
 */
export function generateResponsiveImageSet(baseObjectKey) {
  const formats = ['avif', 'webp', 'jpeg'];
  const sizes = ['original', 'desktop', 'mobile', 'thumbnail'];
  
  const imageSet = {
    sources: [],
    fallback: generateImageUrl(baseObjectKey, 'desktop', 'jpeg')
  };
  
  // フォーマット別のソースセット生成
  for (const format of formats) {
    const srcSet = sizes.map(size => 
      `${generateImageUrl(baseObjectKey, size, format)} ${IMAGE_SIZES[size].width}w`
    ).join(', ');
    
    imageSet.sources.push({
      type: `image/${format}`,
      srcSet
    });
  }
  
  return imageSet;
}

/**
 * 画像処理統計情報の取得
 */
export async function getProcessingStatistics(db) {
  try {
    const stats = await db.query('SELECT * FROM get_image_processing_progress()');
    return stats.rows;
  } catch (error) {
    throw new Error(`Failed to get processing statistics: ${error.message}`);
  }
}

/**
 * 失敗した画像処理の再試行
 */
export async function retryFailedProcessing(db) {
  try {
    const result = await db.query('SELECT * FROM retry_failed_image_processing()');
    return result.rows;
  } catch (error) {
    throw new Error(`Failed to retry processing: ${error.message}`);
  }
}
