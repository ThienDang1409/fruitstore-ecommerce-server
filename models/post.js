const mongoose = require('mongoose');

// Post Schema
const postSchema = mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    author: {
      type: String,
      required: true,
    },
    images: [
      {
        type: String,
      }
    ],
    tags: [
      {
        type: String,
      }
    ],
    category: {
      type: String,
      required: true
    },
    catId: {
      type: String,
      default:''
    },
    commentsCount: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: ['draft', 'published'],
      default: 'draft'
    }
  },
  { timestamps: true }
);

postSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

postSchema.set('toJSON', {
  virtuals: true,
});

exports.Post = mongoose.model('Post', postSchema);
exports.postSchema = postSchema;