import cloudinary from "../config/cloudinary";

interface IUploadedImage {
  url: string;
  public_id: string;
}

export const cloudinaryUtil = {
  // Upload single image
  async uploadImage(
    fileBuffer: Buffer,
    folder: string
  ): Promise<IUploadedImage> {
    return new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder,
            resource_type: "image",

            transformation: [
              {
                width: 1000,
                height: 1000,
                crop: "limit",
                quality: "auto",
                fetch_format: "auto",
              },
            ],
          },
          (error, result) => {
            if (error) return reject(error);
            if (!result) return reject("Upload failed");

            resolve({
              url: result.secure_url,
              public_id: result.public_id,
            });
          }
        )
        .end(fileBuffer);
    });
  },

  // Upload multiple images
  async uploadMultiple(
    files: Express.Multer.File[],
    folder: string
  ): Promise<IUploadedImage[]> {
    const uploads = files.map((file) =>
      this.uploadImage(file.buffer, folder)
    );

    return Promise.all(uploads);
  },

  // Delete image
  async deleteImage(public_id: string) {
    return cloudinary.uploader.destroy(public_id);
  },
};