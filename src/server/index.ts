import { ApolloServer, gql } from "apollo-server";
import { AWSS3Uploader } from "../lib/uploaders/s3";
import { CloudinaryUploader } from "../lib/uploaders/cloudinary";

require("dotenv").config();

/**
 * Right now, I'm using the Cloudinary Uploader, but you can go
 * ahead and swap this one out for the S3 one below, or write your own.
 */

const cloudinaryUploader = new CloudinaryUploader({
  cloudname: process.env.CLOUDINARY_CLOUD_NAME,
  apiKey: process.env.CLOUDINARY_API_KEY,
  apiSecret: process.env.CLOUDINARY_API_SECRET,
});

const s3Uploader = new AWSS3Uploader({
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_S3_REGION,
  destinationBucketName: process.env.AWS_S3_BUCKET,
});

const server = new ApolloServer({
  typeDefs: gql`
    type UploadedFileResponse {
      filename: String!
      mimetype: String!
      encoding: String!
      url: String!
    }

    type Query {
      hello: String!
    }

    type Mutation {
      singleUpload(file: Upload!): UploadedFileResponse!
      multipleUpload(files: [Upload!]!): UploadedFileResponse!
    }
  `,
  resolvers: {
    Query: {
      hello: () => "Hey!",
    },
    Mutation: {
      /**
       * This is where we hook up the file uploader that does all of the
       * work of uploading the files. With Cloudinary and S3, it will:
       *
       * 1. Upload the file
       * 2. Return an UploadedFileResponse with the url it was uploaded to.
       *
       * Feel free to pick through the code an IUploader in order to
       */
      singleUpload: s3Uploader.singleFileUploadResolver.bind(s3Uploader),
      // multipleUpload: s3Uploader.multipleUploadsResolver.bind(s3Uploader),

      // singleUpload:
      //   cloudinaryUploader.singleFileUploadResolver.bind(cloudinaryUploader),
      // multipleUpload:
      //   cloudinaryUploader.multipleUploadsResolver.bind(cloudinaryUploader),
    },
  },
});

server.listen().then(({ url }) => {
  console.log(`🚀 Server ready at ${url}`);
});
