const express = require('express');
const router = express.Router();
const {
  getNewPositions,
  getNewPosition,
  createNewPosition,
  updateNewPosition,
  deleteNewPosition,
  promoteToPosition,
} = require('../controllers/newPositionController');

router
  .route('/')
  .get(getNewPositions)
  .post(createNewPosition);

router
  .route('/:id')
  .get(getNewPosition)
  .put(updateNewPosition)
  .delete(deleteNewPosition);

router.post('/:id/promote', promoteToPosition);

module.exports = router;


