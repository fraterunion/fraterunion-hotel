import {
  Injectable,
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class UploadService {
  private readonly configured: boolean;

  constructor(private readonly config: ConfigService) {
    const cloudName = config.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = config.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = config.get<string>('CLOUDINARY_API_SECRET');

    this.configured = Boolean(cloudName && apiKey && apiSecret);

    if (this.configured) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
      });
    }
  }

  uploadImage(buffer: Buffer, folder: string): Promise<string> {
    if (!this.configured) {
      throw new ServiceUnavailableException(
        'Image uploads are not configured yet.',
      );
    }

    return new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream({ folder, resource_type: 'image' }, (err, result) => {
          if (err || !result) {
            reject(
              new InternalServerErrorException(
                err?.message ?? 'Cloudinary upload failed',
              ),
            );
          } else {
            resolve(result.secure_url);
          }
        })
        .end(buffer);
    });
  }
}
