import AWS from "aws-sdk";
import stream from "stream";
import { ApolloServerFileUploads } from "../index";

type S3UploadConfig = {
  accessKeyId: string;
  secretAccessKey: string;
  region?: string;
  destinationBucketName: string;
};

type S3UploadStream = {
  writeStream: stream.PassThrough;
  promise: Promise<AWS.S3.ManagedUpload.SendData>;
};

export class AWSS3Uploader implements ApolloServerFileUploads.IUploader {
  private s3: AWS.S3;
  public config: S3UploadConfig;

  constructor(config: S3UploadConfig) {
    AWS.config = new AWS.Config();
    AWS.config.update({
      region: config.region || "ca-central-1",
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      // baseKey: "users/avatars",
      //  uploadParams: {
      //   CacheControl: "max-age:31536000",
      //   ContentDisposition: "inline",
      // },
    });

    this.s3 = new AWS.S3();
    this.config = config;
  }

  private createUploadStream(key: string, mimeType: string): S3UploadStream {
    const pass = new stream.PassThrough();

    return {
      writeStream: pass,
      promise: this.s3
        .upload({
          Bucket: this.config.destinationBucketName,
          ACL: "public-read",
          ContentType: mimeType,
          Key: key,
          Body: pass,
          CacheControl: "max-age:31536000",
          ContentDisposition: "inline",
        })
        .promise(),
    };
  }

  private createDestinationFilePath(
    fileName: string,
    mimetype: string,
    encoding: string
  ): string {
    return fileName;
  }

  async singleFileUploadResolver(
    parent: any,
    { file }: { file: ApolloServerFileUploads.File }
  ): Promise<ApolloServerFileUploads.UploadedFileResponse> {
    const { createReadStream, filename, mimetype, encoding } =
      (await file) as any;
    let stream = createReadStream();
    const filePath = this.createDestinationFilePath(
      filename,
      mimetype,
      encoding
    );
    const uploadStream = this.createUploadStream(filePath, mimetype);

    stream.pipe(uploadStream.writeStream);
    const result = await uploadStream.promise;

    return { filename, mimetype, encoding, url: result.Location };
  }

  async multipleUploadsResolver(
    parent,
    { files }: { files: ApolloServerFileUploads.File[] }
  ): Promise<ApolloServerFileUploads.UploadedFileResponse[]> {
    return Promise.all(
      files.map((f) => this.singleFileUploadResolver(null, { file: f }))
    );
  }
}
