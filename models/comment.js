const mongoose = require('mongoose');

const commentSchema = mongoose.Schema({
    postId: {
        type: String,
        ref: 'Blog',
        required: true
    },
    author: {
        name: {
            type: String,
            required: true
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        }
    },
    content: {
        type: String,
        required: true
    }
}, { timestamps: true });

commentSchema.virtual('id').get(function () {
    return this._id.toHexString();
  });
  
  commentSchema.set('toJSON', {
    virtuals: true,
  });

// const Comment = mongoose.model('Comment', commentSchema);

// module.exports = Comment;
exports.Comment = mongoose.model('Comment', commentSchema);
exports.commentSchema = commentSchema;