const { Comment } = require('../models/comment');
const express = require('express');
const router = express.Router();

// Get all comments for a specific post
router.get('/post/', async (req, res) => {
    try {
        const comments = await Comment.find({postId:req.query.postId});
        if (!comments) {
            return res.status(404).json({ success: false, message: 'No comments found for this post' });
        }
        return res.status(200).json({
            success: true,
            data: comments,
        });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

// Add a new comment
router.post('/add', async (req, res) => {
    const { content, author, postId } = req.body;
  
    // Input validation (optional but highly recommended)
    if (!content || !author || !postId) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }
  
    try {
      // Validate author object structure (if applicable)
      if (typeof author !== 'object' || !author.name || !author.userId) {
        return res.status(400).json({ success: false, error: 'Invalid author object format' });
      }
  
      // Create a new comment instance
      const comment = new Comment({
        content,
        author: {
          name: author.name,
          userId: author.userId // Assuming userId is an ObjectID
        },
        postId
      });
  
      // Save the comment to the database
      const savedComment = await comment.save();
  
      // Return the saved comment with a success response
      return res.status(201).json(savedComment);
    } catch (error) {
      // Handle errors gracefully
      console.error(error.message); // Log the error for debugging
      return res.status(500).json({ success: false, error: 'Internal server error' }); // Generic error message for the user
    }
  });

// Delete a comment by ID
router.delete('/:id', async (req, res) => {
    try {
        const deletedComment = await Comment.findByIdAndDelete(req.params.id);
        if (!deletedComment) {
            return res.status(404).json({ message: 'Comment not found!' });
        }
        return res.status(200).json({ success: true, message: 'Comment Deleted!' });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

// Get a comment by ID
router.get('/:id', async (req, res) => {
    try {
        const comment = await Comment.findById(req.params.id);
        if (!comment) {
            return res.status(404).json({ message: 'The comment with the given ID was not found.' });
        }
        return res.status(200).json(comment);
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
